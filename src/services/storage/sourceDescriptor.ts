import type { StorageMode } from '../../types/sync'
import { STORAGE_KEYS } from '../../utils/constants'

/** Non-secret description of where the workbook lives, persisted so the app can reconnect on launch. */
export type SourceDescriptor =
  | { mode: 'local-handle'; name: string }
  | { mode: 'local-upload'; name: string }
  | { mode: 'cloud-graph'; name: string; path: string }

export function loadSourceDescriptor(): SourceDescriptor | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.source)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<SourceDescriptor> & { mode?: StorageMode }
    if (!parsed.mode || typeof parsed.name !== 'string') return null
    if (parsed.mode === 'cloud-graph') {
      return typeof parsed.path === 'string' ? { mode: 'cloud-graph', name: parsed.name, path: parsed.path } : null
    }
    if (parsed.mode === 'local-handle' || parsed.mode === 'local-upload') return { mode: parsed.mode, name: parsed.name }
    return null
  } catch {
    return null
  }
}

export function saveSourceDescriptor(descriptor: SourceDescriptor | null) {
  try {
    if (descriptor) localStorage.setItem(STORAGE_KEYS.source, JSON.stringify(descriptor))
    else localStorage.removeItem(STORAGE_KEYS.source)
  } catch {
    /* ignore */
  }
}

export function loadLastSyncAt(): number | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.lastSync)
    const value = raw ? Number(raw) : NaN
    return Number.isFinite(value) ? value : null
  } catch {
    return null
  }
}

export function saveLastSyncAt(value: number | null) {
  try {
    if (value) localStorage.setItem(STORAGE_KEYS.lastSync, String(value))
    else localStorage.removeItem(STORAGE_KEYS.lastSync)
  } catch {
    /* ignore */
  }
}
