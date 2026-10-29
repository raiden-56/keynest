import { SyncFailure, type SourceSnapshot, type StorageAdapter } from '../../types/sync'

const EXCEL_TYPES: FilePickerAcceptType[] = [
  {
    description: 'Excel workbook',
    accept: { 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'] },
  },
]

export function supportsFileSystemAccess(): boolean {
  return typeof window !== 'undefined' && 'showOpenFilePicker' in window && window.isSecureContext
}

/** Opens the native picker; resolves null when the user cancels. */
export async function pickExcelFileHandle(): Promise<FileSystemFileHandle | null> {
  try {
    const [handle] = await window.showOpenFilePicker({ types: EXCEL_TYPES, multiple: false, excludeAcceptAllOption: false })
    return handle ?? null
  } catch (error) {
    if ((error as DOMException).name === 'AbortError') return null
    throw new SyncFailure('permission-denied', 'The browser blocked access to the file picker.')
  }
}

/** Lets the user choose where to create a brand-new workbook. */
export async function createExcelFileHandle(suggestedName = 'keynest-vault.xlsx'): Promise<FileSystemFileHandle | null> {
  try {
    return await window.showSaveFilePicker({ types: EXCEL_TYPES, suggestedName })
  } catch (error) {
    if ((error as DOMException).name === 'AbortError') return null
    throw new SyncFailure('permission-denied', 'The browser blocked access to the save dialog.')
  }
}

function fingerprintOf(file: File): string {
  return `${file.lastModified}:${file.size}`
}

export class FileHandleAdapter implements StorageAdapter {
  readonly mode = 'local-handle' as const
  readonly canWrite: boolean
  readonly handle: FileSystemFileHandle

  constructor(handle: FileSystemFileHandle) {
    this.handle = handle
    this.canWrite = typeof handle.createWritable === 'function'
  }

  get name(): string {
    return this.handle.name
  }

  async checkPermission(): Promise<PermissionState> {
    const mode: FileSystemPermissionMode = this.canWrite ? 'readwrite' : 'read'
    try {
      return await this.handle.queryPermission({ mode })
    } catch {
      return 'prompt'
    }
  }

  async requestPermission(): Promise<PermissionState> {
    const mode: FileSystemPermissionMode = this.canWrite ? 'readwrite' : 'read'
    try {
      return await this.handle.requestPermission({ mode })
    } catch {
      return 'denied'
    }
  }

  private async getFile(): Promise<File> {
    try {
      return await this.handle.getFile()
    } catch (error) {
      const name = (error as DOMException).name
      if (name === 'NotFoundError') {
        throw new SyncFailure('file-not-found', `"${this.handle.name}" could not be found. It may have been moved, renamed or deleted.`)
      }
      if (name === 'NotAllowedError' || name === 'SecurityError') {
        throw new SyncFailure('permission-denied', `KeyNest no longer has permission to read "${this.handle.name}".`)
      }
      throw new SyncFailure('unknown', `The file "${this.handle.name}" could not be read.`)
    }
  }

  async read(): Promise<SourceSnapshot> {
    const file = await this.getFile()
    return { bytes: await file.arrayBuffer(), fingerprint: fingerprintOf(file) }
  }

  async peekFingerprint(): Promise<string | null> {
    const file = await this.getFile()
    return fingerprintOf(file)
  }

  async write(bytes: ArrayBuffer): Promise<string> {
    if (!this.canWrite) {
      throw new SyncFailure('write-unsupported', 'This browser cannot write to local files directly. Download the updated workbook instead.')
    }
    try {
      const writable = await this.handle.createWritable()
      await writable.write(bytes)
      await writable.close()
    } catch (error) {
      const name = (error as DOMException).name
      if (name === 'NotAllowedError' || name === 'SecurityError') {
        throw new SyncFailure('permission-denied', `KeyNest does not have permission to write to "${this.handle.name}".`)
      }
      if (name === 'NotFoundError') {
        throw new SyncFailure('file-not-found', `"${this.handle.name}" no longer exists at its original location.`)
      }
      throw new SyncFailure('write-failed', `Writing to "${this.handle.name}" failed. The file may be open in Excel or locked by another program.`)
    }
    const file = await this.getFile()
    return fingerprintOf(file)
  }
}
