import type { SourceSnapshot, StorageAdapter } from '../../types/sync'
import { downloadBytes } from '../../utils/download'
import { fingerprintBytes } from '../encryptionService'
import { IDB_KEYS, idbDelete, idbSet } from './handleStore'

export interface UploadCache {
  name: string
  bytes: ArrayBuffer
  savedAt: number
}

/**
 * Fallback for browsers without the File System Access API.
 * Reads come from the uploaded bytes held in memory; "writes" download the updated workbook.
 * Encrypted workbooks may be cached in IndexedDB so the app can reopen without a re-upload.
 */
export class UploadAdapter implements StorageAdapter {
  readonly mode = 'local-upload' as const
  readonly canWrite = false
  readonly name: string
  private bytes: ArrayBuffer
  /** Set by the vault according to the workbook format; plaintext workbooks are never cached. */
  cacheEnabled = false

  constructor(name: string, bytes: ArrayBuffer) {
    this.name = name
    this.bytes = bytes
  }

  async checkPermission(): Promise<PermissionState> {
    return 'granted'
  }

  async requestPermission(): Promise<PermissionState> {
    return 'granted'
  }

  async read(): Promise<SourceSnapshot> {
    return { bytes: this.bytes, fingerprint: fingerprintBytes(this.bytes) }
  }

  async peekFingerprint(): Promise<string | null> {
    return fingerprintBytes(this.bytes)
  }

  async write(bytes: ArrayBuffer): Promise<string> {
    this.bytes = bytes
    downloadBytes(bytes, this.name)
    await this.persistCache()
    return fingerprintBytes(bytes)
  }

  async persistCache(): Promise<void> {
    if (this.cacheEnabled) {
      const cache: UploadCache = { name: this.name, bytes: this.bytes, savedAt: Date.now() }
      await idbSet(IDB_KEYS.uploadCache, cache)
    } else {
      await idbDelete(IDB_KEYS.uploadCache)
    }
  }
}
