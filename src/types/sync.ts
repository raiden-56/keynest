import type { Credential } from './credential'

export type StorageMode = 'local-handle' | 'local-upload' | 'cloud-graph'

export type SyncStatus =
  | 'no-source'
  | 'synced'
  | 'syncing'
  | 'pending'
  | 'failed'
  | 'permission-required'
  | 'offline'
  | 'conflict'

export type SyncErrorCode =
  | 'file-not-found'
  | 'permission-denied'
  | 'invalid-format'
  | 'missing-columns'
  | 'empty-file'
  | 'network'
  | 'auth-expired'
  | 'key-unavailable'
  | 'write-failed'
  | 'write-unsupported'
  | 'conflict'
  | 'unknown'

export interface SyncError {
  code: SyncErrorCode
  message: string
  details?: string[]
}

export interface SourceInfo {
  mode: StorageMode
  name: string
  canWrite: boolean
}

export interface ValidationIssue {
  level: 'error' | 'warning'
  message: string
}

export interface SyncState {
  status: SyncStatus
  lastSyncAt: number | null
  error: SyncError | null
  dirty: boolean
  source: SourceInfo | null
  importedCount: number
  issues: ValidationIssue[]
}

export interface ConflictInfo {
  /** Records currently held in memory (with local edits). */
  mine: Credential[]
  /** Records read from the externally modified file. */
  theirs: Credential[]
  detectedAt: number
}

export type ConflictResolution = 'keep-mine' | 'use-theirs' | 'merge'

export interface SourceSnapshot {
  bytes: ArrayBuffer
  /** Opaque change token (lastModified+size, eTag, …). */
  fingerprint: string
}

export interface StorageAdapter {
  readonly mode: StorageMode
  readonly name: string
  readonly canWrite: boolean
  checkPermission(): Promise<PermissionState>
  requestPermission(): Promise<PermissionState>
  read(): Promise<SourceSnapshot>
  /** Cheap change detection; returns null if not supported. */
  peekFingerprint(): Promise<string | null>
  /** Writes the bytes and returns the new fingerprint. */
  write(bytes: ArrayBuffer): Promise<string>
}

export class SyncFailure extends Error {
  code: SyncErrorCode
  details?: string[]
  constructor(code: SyncErrorCode, message: string, details?: string[]) {
    super(message)
    this.name = 'SyncFailure'
    this.code = code
    this.details = details
  }
}
