import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { ConfirmDialog } from '../components/common/ConfirmDialog'
import { useToast } from '../components/common/ToastProvider'
import { CredentialDetails } from '../components/credentials/CredentialDetails'
import { CredentialForm } from '../components/credentials/CredentialForm'
import { useClipboard } from '../hooks/useClipboard'
import type { Credential, CredentialInput } from '../types/credential'
import { normalizeUrl, isValidUrl } from '../utils/validators'
import { useVault } from './VaultContext'

export interface CredentialActions {
  openAdd: () => void
  openEdit: (credential: Credential) => void
  openDetails: (credential: Credential) => void
  confirmDelete: (credential: Credential) => void
  toggleFavorite: (credential: Credential) => void
  copyUsername: (credential: Credential) => void
  copyPassword: (credential: Credential) => void
  openUrl: (credential: Credential) => void
}

const CredentialActionsContext = createContext<CredentialActions | null>(null)

export function CredentialActionsProvider({ children }: { children: ReactNode }) {
  const vault = useVault()
  const toast = useToast()
  const clipboard = useClipboard()

  const [form, setForm] = useState<{ open: boolean; mode: 'add' | 'edit'; credential: Credential | null }>({ open: false, mode: 'add', credential: null })
  const [detailsId, setDetailsId] = useState<string | null>(null)
  const [pendingDelete, setPendingDelete] = useState<Credential | null>(null)
  const [deleting, setDeleting] = useState(false)

  const credentials = vault.state.credentials
  const detailsCredential = useMemo(() => credentials.find((c) => c.id === detailsId) ?? null, [credentials, detailsId])

  const openAdd = useCallback(() => setForm({ open: true, mode: 'add', credential: null }), [])
  const openEdit = useCallback((credential: Credential) => setForm({ open: true, mode: 'edit', credential }), [])
  const openDetails = useCallback((credential: Credential) => setDetailsId(credential.id), [])
  const confirmDelete = useCallback((credential: Credential) => setPendingDelete(credential), [])

  const toggleFavorite = useCallback(
    (credential: Credential) => {
      vault.toggleFavorite(credential.id)
    },
    [vault],
  )

  const copyUsername = useCallback((credential: Credential) => void clipboard.copyUsername(credential.username), [clipboard])
  const copyPassword = useCallback((credential: Credential) => void clipboard.copyPassword(credential.password), [clipboard])

  const openUrl = useCallback(
    (credential: Credential) => {
      if (!credential.url || !isValidUrl(credential.url)) {
        toast.info('This entry has no valid website address.')
        return
      }
      window.open(normalizeUrl(credential.url), '_blank', 'noopener,noreferrer')
    },
    [toast],
  )

  const handleSubmit = useCallback(
    async (input: CredentialInput) => {
      if (form.mode === 'edit' && form.credential) {
        vault.updateCredential(form.credential.id, input)
        toast.success(`Updated ${input.appName}.`)
      } else {
        vault.addCredential(input)
        toast.success(`Added ${input.appName}.`)
      }
      setForm((prev) => ({ ...prev, open: false }))
    },
    [form.credential, form.mode, toast, vault],
  )

  const handleDelete = useCallback(() => {
    if (!pendingDelete) return
    setDeleting(true)
    vault.deleteCredential(pendingDelete.id)
    toast.success(`Deleted ${pendingDelete.appName}.`)
    if (detailsId === pendingDelete.id) setDetailsId(null)
    setPendingDelete(null)
    setDeleting(false)
  }, [detailsId, pendingDelete, toast, vault])

  const actions = useMemo<CredentialActions>(
    () => ({ openAdd, openEdit, openDetails, confirmDelete, toggleFavorite, copyUsername, copyPassword, openUrl }),
    [openAdd, openEdit, openDetails, confirmDelete, toggleFavorite, copyUsername, copyPassword, openUrl],
  )

  return (
    <CredentialActionsContext.Provider value={actions}>
      {children}
      <CredentialForm
        open={form.open}
        mode={form.mode}
        initial={form.credential}
        existing={credentials}
        onClose={() => setForm((prev) => ({ ...prev, open: false }))}
        onSubmit={handleSubmit}
      />
      <CredentialDetails
        credential={detailsCredential}
        open={detailsId !== null && detailsCredential !== null}
        onClose={() => setDetailsId(null)}
        actions={actions}
        onLock={() => void vault.lockApp()}
      />
      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete this password?"
        description={
          pendingDelete ? `"${pendingDelete.appName}" (${pendingDelete.username}) will be removed from your vault and from the workbook on the next sync. This cannot be undone.` : ''
        }
        confirmLabel="Delete"
        destructive
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </CredentialActionsContext.Provider>
  )
}

export function useCredentialActions(): CredentialActions {
  const ctx = useContext(CredentialActionsContext)
  if (!ctx) throw new Error('useCredentialActions must be used within CredentialActionsProvider')
  return ctx
}
