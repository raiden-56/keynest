import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useToast } from '../components/common/ToastProvider'
import { verifyMasterPassword } from '../services/authService'
import { decryptString, encryptString } from '../services/encryptionService'
import {
  buildTemplateWorkbook,
  buildWorkbook,
  createWorkbookMeta,
  decodeRows,
  parseWorkbook,
  verifyWorkbookKey,
  type BuildOptions,
  type ParsedWorkbook,
  type WorkbookFormat,
  type WorkbookMeta,
} from '../services/excelService'
import { deriveKeyForParams, keyring, persistKdfParams, type KdfParams } from '../services/keyring'
import {
  FileHandleAdapter,
  createExcelFileHandle,
  pickExcelFileHandle,
  supportsFileSystemAccess,
} from '../services/storage/fileHandleAdapter'
import { GraphAdapter, isCloudConfigured } from '../services/storage/graphAdapter'
import { IDB_KEYS, idbDelete, idbGet, idbSet } from '../services/storage/handleStore'
import {
  loadLastSyncAt,
  loadSourceDescriptor,
  saveLastSyncAt,
  saveSourceDescriptor,
  type SourceDescriptor,
} from '../services/storage/sourceDescriptor'
import { UploadAdapter, type UploadCache } from '../services/storage/uploadAdapter'
import type { Credential, CredentialInput } from '../types/credential'
import {
  SyncFailure,
  type ConflictInfo,
  type ConflictResolution,
  type StorageAdapter,
  type SyncError,
  type SyncState,
  type SyncStatus,
  type ValidationIssue,
} from '../types/sync'
import { fileStamp } from '../utils/dateFormatter'
import { downloadBytes } from '../utils/download'
import { generateId } from '../utils/ids'
import { useAuth } from './AuthContext'
import { useSettings } from './SettingsContext'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface KeyPrompt {
  context: 'source' | 'import'
  fileName: string
  parsed: ParsedWorkbook
  /** Set after a passphrase that decrypts the workbook but differs from the master password. */
  attempts: number
}

export interface ImportPreview {
  fileName: string
  format: WorkbookFormat
  parsed: ParsedWorkbook
  credentials: Credential[] | null
  issues: ValidationIssue[]
  needsKey: boolean
  counts: { incoming: number; existing: number; overlapping: number }
}

export interface VaultState {
  credentials: Credential[]
  /** True until the first load attempt has settled (drives shimmer skeletons). */
  loading: boolean
  sync: SyncState
  conflict: ConflictInfo | null
  keyPrompt: KeyPrompt | null
  importPreview: ImportPreview | null
  /** Format of the workbook as last read from the source. */
  sourceFormat: WorkbookFormat | null
  /** True when the in-memory data was decrypted with a passphrase other than the master password. */
  decryptedWithForeignKey: boolean
  supportsDirectFileAccess: boolean
  cloudConfigured: boolean
  /** Changes were encrypted and parked when the app locked; restored after unlock. */
  hasParkedChanges: boolean
}

export interface VaultApi {
  state: VaultState
  connectLocalFile: () => Promise<boolean>
  createLocalFile: () => Promise<boolean>
  connectUpload: (file: File) => Promise<boolean>
  connectCloud: (path: string) => Promise<boolean>
  reconnectCloud: () => Promise<boolean>
  requestPermission: () => Promise<boolean>
  disconnectSource: () => Promise<void>
  syncNow: () => Promise<void>
  addCredential: (input: CredentialInput) => Credential
  updateCredential: (id: string, input: CredentialInput) => void
  deleteCredential: (id: string) => void
  toggleFavorite: (id: string) => void
  resolveConflict: (resolution: ConflictResolution) => Promise<void>
  submitPassphrase: (passphrase: string) => Promise<{ ok: boolean; matchesMaster: boolean }>
  cancelKeyPrompt: () => void
  reencryptNow: () => void
  exportBackup: (format: WorkbookFormat) => Promise<boolean>
  downloadTemplate: () => Promise<void>
  openImport: (file: File) => Promise<void>
  applyImport: (mode: 'replace' | 'merge') => Promise<void>
  cancelImport: () => void
  validateSource: () => Promise<{ issues: ValidationIssue[]; count: number; format: WorkbookFormat } | SyncError>
  lockApp: () => Promise<void>
  signOutApp: () => void
}

const VaultContext = createContext<VaultApi | null>(null)

const initialSync: SyncState = {
  status: 'no-source',
  lastSyncAt: null,
  error: null,
  dirty: false,
  source: null,
  importedCount: 0,
  issues: [],
}

function errorToStatus(error: SyncError): SyncStatus {
  switch (error.code) {
    case 'permission-denied':
    case 'auth-expired':
      return 'permission-required'
    case 'network':
      return navigator.onLine ? 'failed' : 'offline'
    case 'conflict':
      return 'conflict'
    default:
      return 'failed'
  }
}

function toSyncError(error: unknown): SyncError {
  if (error instanceof SyncFailure) return { code: error.code, message: error.message, details: error.details }
  return { code: 'unknown', message: 'Something went wrong while synchronizing. Please try again.' }
}

function mergeCredentials(mine: Credential[], theirs: Credential[]): Credential[] {
  const map = new Map<string, Credential>()
  for (const c of theirs) map.set(c.id, c)
  for (const c of mine) {
    const other = map.get(c.id)
    if (!other || c.updatedAt >= other.updatedAt) map.set(c.id, c)
  }
  return [...map.values()]
}

interface ParkedSnapshot {
  payload: string
  params: KdfParams
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function VaultProvider({ children }: { children: ReactNode }) {
  const auth = useAuth()
  const { settings } = useSettings()
  const toast = useToast()

  const [state, setState] = useState<VaultState>(() => ({
    credentials: [],
    loading: false,
    sync: { ...initialSync, lastSyncAt: loadLastSyncAt(), source: descriptorToSource(loadSourceDescriptor()) },
    conflict: null,
    keyPrompt: null,
    importPreview: null,
    sourceFormat: null,
    decryptedWithForeignKey: false,
    supportsDirectFileAccess: supportsFileSystemAccess(),
    cloudConfigured: isCloudConfigured(),
    hasParkedChanges: false,
  }))

  const adapterRef = useRef<StorageAdapter | null>(null)
  const credentialsRef = useRef<Credential[]>([])
  const metaRef = useRef<WorkbookMeta | null>(null)
  const baseFingerprintRef = useRef<string | null>(null)
  const conflictFingerprintRef = useRef<string | null>(null)
  const dirtyRef = useRef(false)
  const inFlightRef = useRef(false)
  const queuedRef = useRef(false)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastPeekRef = useRef(0)
  const parkedRef = useRef<ParkedSnapshot | null>(null)
  const formatRef = useRef<WorkbookFormat>(settings.workbookFormat)
  formatRef.current = settings.workbookFormat

  // ----- state helpers -----------------------------------------------------

  const patch = useCallback((partial: Partial<VaultState>) => setState((prev) => ({ ...prev, ...partial })), [])
  const patchSync = useCallback(
    (partial: Partial<SyncState>) => setState((prev) => ({ ...prev, sync: { ...prev.sync, ...partial } })),
    [],
  )

  const setCredentials = useCallback(
    (next: Credential[], markDirty: boolean) => {
      credentialsRef.current = next
      dirtyRef.current = markDirty
      setState((prev) => ({
        ...prev,
        credentials: next,
        sync: { ...prev.sync, dirty: markDirty, status: markDirty && prev.sync.status !== 'syncing' ? 'pending' : prev.sync.status },
      }))
    },
    [],
  )

  const failWith = useCallback(
    (error: unknown) => {
      const syncError = toSyncError(error)
      patchSync({ status: errorToStatus(syncError), error: syncError })
      return syncError
    },
    [patchSync],
  )

  const setAdapter = useCallback(
    (adapter: StorageAdapter | null, descriptor: SourceDescriptor | null) => {
      adapterRef.current = adapter
      baseFingerprintRef.current = null
      metaRef.current = null
      saveSourceDescriptor(descriptor)
      patchSync({ source: adapter ? { mode: adapter.mode, name: adapter.name, canWrite: adapter.canWrite } : null })
    },
    [patchSync],
  )

  // ----- build options -----------------------------------------------------

  const buildOptions = useCallback(async (): Promise<BuildOptions> => {
    if (formatRef.current === 'plain') return { format: 'plain' }
    const key = keyring.get()
    const params = keyring.params()
    if (!key || !params) throw new SyncFailure('key-unavailable', 'The encryption key is unavailable. Unlock KeyNest again to continue.')
    if (!metaRef.current || metaRef.current.salt !== params.salt) {
      metaRef.current = await createWorkbookMeta(key, params.salt, params.iterations)
    }
    return { format: 'encrypted', key, meta: metaRef.current }
  }, [])

  // ----- apply decoded workbook -------------------------------------------

  const applyLoaded = useCallback(
    async (parsed: ParsedWorkbook, credentials: Credential[], issues: ValidationIssue[], fingerprint: string, needsReencryption: boolean, foreignKey: boolean) => {
      metaRef.current = parsed.meta
      baseFingerprintRef.current = fingerprint
      const now = Date.now()
      saveLastSyncAt(now)
      // Plaintext cells inside an encrypted workbook are written back encrypted right away (the caller schedules
      // the save). A fully plaintext source or a foreign key only shows a banner with an explicit action.
      const convertNeeded = needsReencryption
      credentialsRef.current = credentials
      dirtyRef.current = convertNeeded
      const adapter = adapterRef.current
      if (adapter instanceof UploadAdapter) {
        adapter.cacheEnabled = parsed.format === 'encrypted'
        await adapter.persistCache()
      }
      setState((prev) => ({
        ...prev,
        credentials,
        loading: false,
        keyPrompt: null,
        conflict: null,
        sourceFormat: parsed.format,
        decryptedWithForeignKey: foreignKey,
        sync: {
          ...prev.sync,
          status: convertNeeded ? 'pending' : 'synced',
          lastSyncAt: now,
          error: null,
          dirty: convertNeeded,
          importedCount: credentials.length,
          issues,
        },
      }))
    },
    [],
  )

  // ----- save --------------------------------------------------------------

  const save = useCallback(
    async (opts: { force?: boolean } = {}): Promise<boolean> => {
      if (inFlightRef.current) {
        queuedRef.current = true
        return false
      }
      const adapter = adapterRef.current
      if (!adapter) {
        patchSync({
          status: 'pending',
          error: {
            code: 'write-unsupported',
            message: 'No workbook is connected. Your changes are kept in memory only. Connect a file or export a backup to keep them.',
          },
        })
        return false
      }
      inFlightRef.current = true
      patchSync({ status: 'syncing', error: null })
      try {
        const permission = await adapter.checkPermission()
        if (permission !== 'granted') {
          patchSync({
            status: 'permission-required',
            error: { code: 'permission-denied', message: `KeyNest needs permission to write to "${adapter.name}". Your changes are kept in memory until then.` },
          })
          return false
        }
        if (!opts.force && baseFingerprintRef.current) {
          const remote = await adapter.peekFingerprint()
          if (remote && remote !== baseFingerprintRef.current) {
            const snapshot = await adapter.read()
            const parsed = parseWorkbook(snapshot.bytes)
            const decoded = await decodeRows(parsed, keyring.get())
            conflictFingerprintRef.current = snapshot.fingerprint
            patch({ conflict: { mine: credentialsRef.current, theirs: decoded.credentials, detectedAt: Date.now() } })
            patchSync({ status: 'conflict', error: { code: 'conflict', message: `"${adapter.name}" was changed outside KeyNest while you have unsaved edits.` } })
            return false
          }
        }
        const options = await buildOptions()
        const bytes = await buildWorkbook(credentialsRef.current, options)
        const fingerprint = await adapter.write(bytes)
        baseFingerprintRef.current = fingerprint
        dirtyRef.current = false
        const now = Date.now()
        saveLastSyncAt(now)
        setState((prev) => ({
          ...prev,
          sourceFormat: options.format,
          decryptedWithForeignKey: false,
          sync: { ...prev.sync, status: 'synced', dirty: false, error: null, lastSyncAt: now, importedCount: credentialsRef.current.length },
        }))
        if (adapter instanceof UploadAdapter) {
          toast.info(`Updated workbook downloaded as "${adapter.name}". Replace your original file with it.`)
        }
        return true
      } catch (error) {
        failWith(error)
        return false
      } finally {
        inFlightRef.current = false
        if (queuedRef.current) {
          queuedRef.current = false
          void save()
        }
      }
    },
    [buildOptions, failWith, patch, patchSync, toast],
  )

  const scheduleSave = useCallback(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => {
      saveTimerRef.current = null
      void save()
    }, 500)
  }, [save])

  // ----- load --------------------------------------------------------------

  const load = useCallback(
    async (adapter: StorageAdapter): Promise<boolean> => {
      if (inFlightRef.current) return false
      inFlightRef.current = true
      setState((prev) => ({ ...prev, loading: prev.credentials.length === 0, sync: { ...prev.sync, status: 'syncing', error: null } }))
      try {
        const permission = await adapter.checkPermission()
        if (permission !== 'granted') {
          setState((prev) => ({
            ...prev,
            loading: false,
            sync: {
              ...prev.sync,
              status: 'permission-required',
              error: {
                code: adapter.mode === 'cloud-graph' ? 'auth-expired' : 'permission-denied',
                message:
                  adapter.mode === 'cloud-graph'
                    ? 'Sign in to Microsoft to load the cloud workbook.'
                    : `Grant KeyNest access to "${adapter.name}" to load your credentials.`,
              },
            },
          }))
          return false
        }
        const snapshot = await adapter.read()
        const parsed = parseWorkbook(snapshot.bytes)
        const params = keyring.params()
        if (parsed.format === 'encrypted' && parsed.meta && params && parsed.meta.salt !== params.salt) {
          baseFingerprintRef.current = snapshot.fingerprint
          patch({ loading: false, keyPrompt: { context: 'source', fileName: adapter.name, parsed, attempts: 0 } })
          patchSync({ status: 'failed', error: { code: 'key-unavailable', message: 'This workbook was encrypted with a different passphrase or on another device. Enter its passphrase to open it.' } })
          return false
        }
        try {
          const decoded = await decodeRows(parsed, keyring.get())
          await applyLoaded(parsed, decoded.credentials, decoded.issues, snapshot.fingerprint, decoded.needsReencryption, false)
          if (decoded.needsReencryption) scheduleSave()
          return true
        } catch (error) {
          if (error instanceof SyncFailure && error.code === 'key-unavailable' && parsed.meta) {
            baseFingerprintRef.current = snapshot.fingerprint
            patch({ loading: false, keyPrompt: { context: 'source', fileName: adapter.name, parsed, attempts: 0 } })
          } else {
            patch({ loading: false })
          }
          failWith(error)
          return false
        }
      } catch (error) {
        patch({ loading: false })
        failWith(error)
        return false
      } finally {
        inFlightRef.current = false
      }
    },
    [applyLoaded, failWith, patch, patchSync, scheduleSave],
  )

  // ----- parked changes (lock with unsaved edits) ---------------------------

  const restoreParked = useCallback(async () => {
    const parked = parkedRef.current
    if (!parked) return
    parkedRef.current = null
    const key = keyring.get()
    const params = keyring.params()
    if (!key || !params || params.salt !== parked.params.salt) {
      patch({ hasParkedChanges: false })
      toast.warning('Changes parked before locking could not be restored with the current key.')
      return
    }
    try {
      const json = await decryptString(key, parked.payload)
      const restored = JSON.parse(json) as Credential[]
      setCredentials(mergeCredentials(restored, credentialsRef.current), true)
      patch({ hasParkedChanges: false })
      toast.info('Unsaved changes from before the lock were restored.')
      scheduleSave()
    } catch {
      patch({ hasParkedChanges: false })
      toast.error('Parked changes could not be restored.')
    }
  }, [patch, scheduleSave, setCredentials, toast])

  // ----- initialize on authentication -------------------------------------

  const initialize = useCallback(async () => {
    const descriptor = loadSourceDescriptor()
    if (!descriptor) {
      patch({ loading: false })
      patchSync({ status: 'no-source', source: null, error: null })
      await restoreParked()
      return
    }
    let adapter: StorageAdapter | null = null
    if (descriptor.mode === 'local-handle') {
      const handle = await idbGet<FileSystemFileHandle>(IDB_KEYS.sourceHandle)
      if (handle) adapter = new FileHandleAdapter(handle)
      else {
        patchSync({
          status: 'failed',
          source: { mode: 'local-handle', name: descriptor.name, canWrite: true },
          error: { code: 'file-not-found', message: `The saved link to "${descriptor.name}" is no longer available in this browser. Select the file again.` },
        })
        return
      }
    } else if (descriptor.mode === 'local-upload') {
      const cache = await idbGet<UploadCache>(IDB_KEYS.uploadCache)
      if (cache?.bytes) {
        const upload = new UploadAdapter(cache.name, cache.bytes)
        upload.cacheEnabled = true
        adapter = upload
      } else {
        patch({ loading: false })
        patchSync({
          status: 'failed',
          source: { mode: 'local-upload', name: descriptor.name, canWrite: false },
          error: { code: 'file-not-found', message: `Upload "${descriptor.name}" again to continue. This browser cannot reopen local files automatically.` },
        })
        return
      }
    } else {
      adapter = new GraphAdapter({ path: descriptor.path }, descriptor.name)
    }
    adapterRef.current = adapter
    patchSync({ source: { mode: adapter.mode, name: adapter.name, canWrite: adapter.canWrite } })
    const ok = await load(adapter)
    if (ok) await restoreParked()
  }, [load, patch, patchSync, restoreParked])

  const clearMemory = useCallback(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    credentialsRef.current = []
    dirtyRef.current = false
    metaRef.current = null
    setState((prev) => ({
      ...prev,
      credentials: [],
      conflict: null,
      keyPrompt: null,
      importPreview: null,
      decryptedWithForeignKey: false,
      loading: false,
      sync: { ...prev.sync, status: prev.sync.source ? 'synced' : 'no-source', dirty: false, error: null, issues: [] },
    }))
  }, [])

  const authStatus = auth.state.status
  const initializedRef = useRef(false)
  useEffect(() => {
    if (authStatus === 'authenticated') {
      if (!initializedRef.current) {
        initializedRef.current = true
        patch({ loading: true })
        void initialize()
      }
    } else {
      initializedRef.current = false
      clearMemory()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authStatus])

  // ----- external change detection & connectivity --------------------------

  useEffect(() => {
    const check = async () => {
      const adapter = adapterRef.current
      if (!adapter || inFlightRef.current || authStatus !== 'authenticated') return
      if (adapter.mode === 'local-upload') return
      if (Date.now() - lastPeekRef.current < 5000) return
      lastPeekRef.current = Date.now()
      try {
        if ((await adapter.checkPermission()) !== 'granted') return
        const remote = await adapter.peekFingerprint()
        if (!remote || !baseFingerprintRef.current || remote === baseFingerprintRef.current) return
        if (!dirtyRef.current) {
          const ok = await load(adapter)
          if (ok) toast.info(`Reloaded "${adapter.name}" after it changed outside KeyNest.`)
        } else {
          void save()
        }
      } catch {
        /* checked again on next focus */
      }
    }
    const onVisibility = () => {
      if (document.visibilityState === 'visible') void check()
    }
    window.addEventListener('focus', onVisibility)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      window.removeEventListener('focus', onVisibility)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [authStatus, load, save, toast])

  useEffect(() => {
    const onOnline = () => {
      if (dirtyRef.current) void save()
      else if (adapterRef.current?.mode === 'cloud-graph') patchSync({ status: 'synced', error: null })
    }
    const onOffline = () => {
      if (adapterRef.current?.mode === 'cloud-graph') patchSync({ status: 'offline', error: { code: 'network', message: 'You are offline. Changes will sync when the connection returns.' } })
    }
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    return () => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }, [patchSync, save])

  // ----- source management -------------------------------------------------

  const connectLocalFile = useCallback(async () => {
    try {
      const handle = await pickExcelFileHandle()
      if (!handle) return false
      await idbSet(IDB_KEYS.sourceHandle, handle)
      await idbDelete(IDB_KEYS.uploadCache)
      const adapter = new FileHandleAdapter(handle)
      setAdapter(adapter, { mode: 'local-handle', name: handle.name })
      const permission = await adapter.requestPermission()
      if (permission !== 'granted') {
        patchSync({ status: 'permission-required', error: { code: 'permission-denied', message: `Permission to access "${handle.name}" was not granted.` } })
        return false
      }
      return load(adapter)
    } catch (error) {
      failWith(error)
      return false
    }
  }, [failWith, load, patchSync, setAdapter])

  const createLocalFile = useCallback(async () => {
    try {
      const handle = await createExcelFileHandle()
      if (!handle) return false
      await idbSet(IDB_KEYS.sourceHandle, handle)
      await idbDelete(IDB_KEYS.uploadCache)
      const adapter = new FileHandleAdapter(handle)
      setAdapter(adapter, { mode: 'local-handle', name: handle.name })
      const options = await buildOptions()
      const bytes = await buildWorkbook(credentialsRef.current, options)
      await adapter.write(bytes)
      return load(adapter)
    } catch (error) {
      failWith(error)
      return false
    }
  }, [buildOptions, failWith, load, setAdapter])

  const connectUpload = useCallback(
    async (file: File) => {
      try {
        const bytes = await file.arrayBuffer()
        const adapter = new UploadAdapter(file.name, bytes)
        await idbDelete(IDB_KEYS.sourceHandle)
        setAdapter(adapter, { mode: 'local-upload', name: file.name })
        return load(adapter)
      } catch (error) {
        failWith(error)
        return false
      }
    },
    [failWith, load, setAdapter],
  )

  const connectCloud = useCallback(
    async (path: string) => {
      const adapter = new GraphAdapter({ path })
      await idbDelete(IDB_KEYS.sourceHandle)
      await idbDelete(IDB_KEYS.uploadCache)
      setAdapter(adapter, { mode: 'cloud-graph', name: adapter.name, path })
      try {
        if ((await adapter.checkPermission()) !== 'granted') {
          const result = await adapter.requestPermission()
          if (result !== 'granted') {
            patchSync({ status: 'permission-required', error: { code: 'auth-expired', message: 'Microsoft sign-in was cancelled or failed.' } })
            return false
          }
        }
        const ok = await load(adapter)
        if (ok) saveSourceDescriptor({ mode: 'cloud-graph', name: adapter.name, path })
        return ok
      } catch (error) {
        failWith(error)
        return false
      }
    },
    [failWith, load, patchSync, setAdapter],
  )

  const reconnectCloud = useCallback(async () => {
    const adapter = adapterRef.current
    if (!(adapter instanceof GraphAdapter)) return false
    try {
      const result = await adapter.requestPermission()
      if (result !== 'granted') return false
      const ok = await load(adapter)
      if (ok && dirtyRef.current) void save()
      return ok
    } catch (error) {
      failWith(error)
      return false
    }
  }, [failWith, load, save])

  const requestPermission = useCallback(async () => {
    const adapter = adapterRef.current
    if (!adapter) return false
    try {
      const result = await adapter.requestPermission()
      if (result !== 'granted') {
        patchSync({ status: 'permission-required', error: { code: 'permission-denied', message: `Permission to access "${adapter.name}" was denied. You can select the file again from Settings.` } })
        return false
      }
      if (dirtyRef.current && baseFingerprintRef.current) return save()
      return load(adapter)
    } catch (error) {
      failWith(error)
      return false
    }
  }, [failWith, load, patchSync, save])

  const disconnectSource = useCallback(async () => {
    const adapter = adapterRef.current
    if (adapter instanceof GraphAdapter) await adapter.signOut()
    await idbDelete(IDB_KEYS.sourceHandle)
    await idbDelete(IDB_KEYS.uploadCache)
    setAdapter(null, null)
    saveLastSyncAt(null)
    setState((prev) => ({
      ...prev,
      sourceFormat: null,
      keyPrompt: null,
      conflict: null,
      sync: { ...prev.sync, status: 'no-source', error: null, lastSyncAt: null, importedCount: 0, issues: [], source: null, dirty: prev.credentials.length > 0 },
    }))
  }, [setAdapter])

  const syncNow = useCallback(async () => {
    const adapter = adapterRef.current
    if (!adapter) {
      patchSync({ status: 'no-source', error: { code: 'file-not-found', message: 'No workbook is connected yet. Choose a source to synchronize.' } })
      return
    }
    if (dirtyRef.current) {
      await save()
      return
    }
    await load(adapter)
  }, [load, patchSync, save])

  // ----- CRUD --------------------------------------------------------------

  const addCredential = useCallback(
    (input: CredentialInput) => {
      const now = new Date().toISOString()
      const credential: Credential = { ...input, id: generateId(), createdAt: now, updatedAt: now }
      setCredentials([credential, ...credentialsRef.current], true)
      scheduleSave()
      return credential
    },
    [scheduleSave, setCredentials],
  )

  const updateCredential = useCallback(
    (id: string, input: CredentialInput) => {
      const now = new Date().toISOString()
      setCredentials(
        credentialsRef.current.map((c) => (c.id === id ? { ...c, ...input, updatedAt: now } : c)),
        true,
      )
      scheduleSave()
    },
    [scheduleSave, setCredentials],
  )

  const deleteCredential = useCallback(
    (id: string) => {
      setCredentials(credentialsRef.current.filter((c) => c.id !== id), true)
      scheduleSave()
    },
    [scheduleSave, setCredentials],
  )

  const toggleFavorite = useCallback(
    (id: string) => {
      const now = new Date().toISOString()
      setCredentials(
        credentialsRef.current.map((c) => (c.id === id ? { ...c, favorite: !c.favorite, updatedAt: now } : c)),
        true,
      )
      scheduleSave()
    },
    [scheduleSave, setCredentials],
  )

  // ----- conflicts ---------------------------------------------------------

  const resolveConflict = useCallback(
    async (resolution: ConflictResolution) => {
      const conflict = state.conflict
      if (!conflict) return
      const remoteFingerprint = conflictFingerprintRef.current
      patch({ conflict: null })
      if (resolution === 'use-theirs') {
        setCredentials(conflict.theirs, false)
        baseFingerprintRef.current = remoteFingerprint
        const now = Date.now()
        saveLastSyncAt(now)
        patchSync({ status: 'synced', error: null, dirty: false, lastSyncAt: now, importedCount: conflict.theirs.length })
        return
      }
      if (resolution === 'merge') setCredentials(mergeCredentials(conflict.mine, conflict.theirs), true)
      else setCredentials(conflict.mine, true)
      baseFingerprintRef.current = remoteFingerprint
      await save({ force: true })
    },
    [patch, patchSync, save, setCredentials, state.conflict],
  )

  // ----- key prompt --------------------------------------------------------

  const submitPassphrase = useCallback(
    async (passphrase: string) => {
      const prompt = state.keyPrompt
      if (!prompt?.parsed.meta) return { ok: false, matchesMaster: false }
      const params: KdfParams = { salt: prompt.parsed.meta.salt, iterations: prompt.parsed.meta.iterations }
      const key = await deriveKeyForParams(passphrase, params)
      const verified = await verifyWorkbookKey(prompt.parsed.meta, key)
      if (verified === false) {
        patch({ keyPrompt: { ...prompt, attempts: prompt.attempts + 1 } })
        return { ok: false, matchesMaster: false }
      }
      const matchesMaster = await verifyMasterPassword(passphrase)
      if (matchesMaster) {
        // Same master password, different salt: adopt the workbook's salt permanently so future launches just work.
        keyring.set(key, params)
        persistKdfParams(params)
      }
      let decoded
      try {
        decoded = await decodeRows(prompt.parsed, key)
      } catch (error) {
        failWith(error)
        patch({ keyPrompt: null })
        return { ok: false, matchesMaster }
      }
      if (prompt.context === 'source') {
        await applyLoaded(prompt.parsed, decoded.credentials, decoded.issues, baseFingerprintRef.current ?? '', decoded.needsReencryption, !matchesMaster)
        if (decoded.needsReencryption) scheduleSave()
        if (!matchesMaster) {
          toast.warning('Opened with a different passphrase. Save to re-encrypt with your current master password.')
        }
      } else {
        setState((prev) => {
          if (!prev.importPreview) return { ...prev, keyPrompt: null }
          const existingIds = new Set(prev.credentials.map((c) => c.id))
          const overlapping = decoded.credentials.filter((c) => existingIds.has(c.id)).length
          return {
            ...prev,
            keyPrompt: null,
            importPreview: {
              ...prev.importPreview,
              credentials: decoded.credentials,
              issues: decoded.issues,
              needsKey: false,
              counts: { incoming: decoded.credentials.length, existing: prev.credentials.length, overlapping },
            },
          }
        })
      }
      return { ok: true, matchesMaster }
    },
    [applyLoaded, failWith, patch, scheduleSave, state.keyPrompt, toast],
  )

  const cancelKeyPrompt = useCallback(() => {
    setState((prev) => ({
      ...prev,
      keyPrompt: null,
      importPreview: prev.keyPrompt?.context === 'import' ? null : prev.importPreview,
      loading: false,
    }))
  }, [])

  const reencryptNow = useCallback(() => {
    dirtyRef.current = true
    patchSync({ dirty: true, status: 'pending' })
    void save()
  }, [patchSync, save])

  // ----- backup & restore --------------------------------------------------

  const exportBackup = useCallback(
    async (format: WorkbookFormat) => {
      try {
        const options: BuildOptions =
          format === 'plain'
            ? { format: 'plain' }
            : await (async () => {
                const key = keyring.get()
                const params = keyring.params()
                if (!key || !params) throw new SyncFailure('key-unavailable', 'The encryption key is unavailable. Unlock KeyNest again.')
                const meta = metaRef.current && metaRef.current.salt === params.salt ? metaRef.current : await createWorkbookMeta(key, params.salt, params.iterations)
                return { format: 'encrypted' as const, key, meta }
              })()
        const bytes = await buildWorkbook(credentialsRef.current, options)
        downloadBytes(bytes, `keynest-${format === 'plain' ? 'PLAINTEXT-export' : 'backup'}-${fileStamp()}.xlsx`)
        return true
      } catch (error) {
        toast.error(toSyncError(error).message)
        return false
      }
    },
    [toast],
  )

  const downloadTemplate = useCallback(async () => {
    downloadBytes(await buildTemplateWorkbook(), 'keynest-template.xlsx')
  }, [])

  const openImport = useCallback(
    async (file: File) => {
      try {
        const bytes = await file.arrayBuffer()
        const parsed = parseWorkbook(bytes)
        const existing = credentialsRef.current
        const existingIds = new Set(existing.map((c) => c.id))
        const params = keyring.params()
        const saltDiffers = parsed.format === 'encrypted' && parsed.meta !== null && params !== null && parsed.meta.salt !== params.salt
        if (saltDiffers) {
          patch({
            importPreview: { fileName: file.name, format: parsed.format, parsed, credentials: null, issues: parsed.issues, needsKey: true, counts: { incoming: parsed.rows.length, existing: existing.length, overlapping: 0 } },
            keyPrompt: { context: 'import', fileName: file.name, parsed, attempts: 0 },
          })
          return
        }
        try {
          const decoded = await decodeRows(parsed, keyring.get())
          const overlapping = decoded.credentials.filter((c) => existingIds.has(c.id)).length
          patch({
            importPreview: { fileName: file.name, format: parsed.format, parsed, credentials: decoded.credentials, issues: decoded.issues, needsKey: false, counts: { incoming: decoded.credentials.length, existing: existing.length, overlapping } },
          })
        } catch (error) {
          if (error instanceof SyncFailure && error.code === 'key-unavailable' && parsed.meta) {
            patch({
              importPreview: { fileName: file.name, format: parsed.format, parsed, credentials: null, issues: parsed.issues, needsKey: true, counts: { incoming: parsed.rows.length, existing: existing.length, overlapping: 0 } },
              keyPrompt: { context: 'import', fileName: file.name, parsed, attempts: 0 },
            })
            return
          }
          throw error
        }
      } catch (error) {
        const syncError = toSyncError(error)
        toast.error(syncError.details?.length ? `${syncError.message} ${syncError.details[0]}` : syncError.message, { durationMs: 8000 })
      }
    },
    [patch, toast],
  )

  const applyImport = useCallback(
    async (mode: 'replace' | 'merge') => {
      const preview = state.importPreview
      if (!preview?.credentials) return
      const next = mode === 'replace' ? preview.credentials : mergeCredentials(preview.credentials, credentialsRef.current)
      setCredentials(next, true)
      patch({ importPreview: null })
      toast.success(mode === 'replace' ? `Restored ${preview.credentials.length} records from "${preview.fileName}".` : `Merged ${preview.credentials.length} records from "${preview.fileName}".`)
      await save()
    },
    [patch, save, setCredentials, state.importPreview, toast],
  )

  const cancelImport = useCallback(() => patch({ importPreview: null, keyPrompt: null }), [patch])

  const validateSource = useCallback(async () => {
    const adapter = adapterRef.current
    if (!adapter) return { code: 'file-not-found', message: 'No workbook is connected.' } as SyncError
    try {
      if ((await adapter.checkPermission()) !== 'granted') {
        return { code: 'permission-denied', message: 'Permission is required to read the workbook.' } as SyncError
      }
      const snapshot = await adapter.read()
      const parsed = parseWorkbook(snapshot.bytes)
      const issues = [...parsed.issues]
      if (parsed.format === 'encrypted') {
        const verified = await verifyWorkbookKey(parsed.meta, keyring.get() as CryptoKey)
        if (verified === false) issues.push({ level: 'error', message: 'The current session key does not match this workbook.' })
        if (verified === null) issues.push({ level: 'warning', message: 'No verifier found; the key cannot be checked without decrypting rows.' })
      } else {
        issues.push({ level: 'warning', message: 'This workbook stores passwords in plaintext.' })
      }
      return { issues, count: parsed.rows.length, format: parsed.format }
    } catch (error) {
      return toSyncError(error)
    }
  }, [])

  // ----- lock / sign out ---------------------------------------------------

  const lockApp = useCallback(async () => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current)
      saveTimerRef.current = null
    }
    if (dirtyRef.current && adapterRef.current && !inFlightRef.current) await save()
    if (dirtyRef.current) {
      const key = keyring.get()
      const params = keyring.params()
      if (key && params) {
        try {
          parkedRef.current = { payload: await encryptString(key, JSON.stringify(credentialsRef.current)), params }
          patch({ hasParkedChanges: true })
        } catch {
          parkedRef.current = null
        }
      }
    }
    auth.lock()
  }, [auth, patch, save])

  const signOutApp = useCallback(() => {
    parkedRef.current = null
    patch({ hasParkedChanges: false })
    auth.signOut()
  }, [auth, patch])

  const api = useMemo<VaultApi>(
    () => ({
      state,
      connectLocalFile,
      createLocalFile,
      connectUpload,
      connectCloud,
      reconnectCloud,
      requestPermission,
      disconnectSource,
      syncNow,
      addCredential,
      updateCredential,
      deleteCredential,
      toggleFavorite,
      resolveConflict,
      submitPassphrase,
      cancelKeyPrompt,
      reencryptNow,
      exportBackup,
      downloadTemplate,
      openImport,
      applyImport,
      cancelImport,
      validateSource,
      lockApp,
      signOutApp,
    }),
    [
      state,
      connectLocalFile,
      createLocalFile,
      connectUpload,
      connectCloud,
      reconnectCloud,
      requestPermission,
      disconnectSource,
      syncNow,
      addCredential,
      updateCredential,
      deleteCredential,
      toggleFavorite,
      resolveConflict,
      submitPassphrase,
      cancelKeyPrompt,
      reencryptNow,
      exportBackup,
      downloadTemplate,
      openImport,
      applyImport,
      cancelImport,
      validateSource,
      lockApp,
      signOutApp,
    ],
  )

  return <VaultContext.Provider value={api}>{children}</VaultContext.Provider>
}

function descriptorToSource(descriptor: SourceDescriptor | null): SyncState['source'] {
  if (!descriptor) return null
  return { mode: descriptor.mode, name: descriptor.name, canWrite: descriptor.mode !== 'local-upload' }
}

export function useVault(): VaultApi {
  const ctx = useContext(VaultContext)
  if (!ctx) throw new Error('useVault must be used within VaultProvider')
  return ctx
}
