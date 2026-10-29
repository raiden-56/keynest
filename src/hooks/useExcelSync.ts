import { useMemo } from 'react'
import { useVault } from '../store/VaultContext'
import type { SyncStatus } from '../types/sync'
import { formatRelative } from '../utils/dateFormatter'

export interface SyncPresentation {
  status: SyncStatus
  label: string
  /** MUI palette key used for the indicator dot. */
  color: 'success' | 'warning' | 'error' | 'secondary' | 'text'
  detail: string
  busy: boolean
}

const LABELS: Record<SyncStatus, SyncPresentation['label']> = {
  'no-source': 'No workbook',
  synced: 'Synced',
  syncing: 'Syncing',
  pending: 'Changes pending',
  failed: 'Sync failed',
  'permission-required': 'Permission required',
  offline: 'Offline',
  conflict: 'Conflict',
}

const COLORS: Record<SyncStatus, SyncPresentation['color']> = {
  'no-source': 'text',
  synced: 'success',
  syncing: 'secondary',
  pending: 'warning',
  failed: 'error',
  'permission-required': 'warning',
  offline: 'text',
  conflict: 'error',
}

export function useExcelSync() {
  const vault = useVault()
  const { sync } = vault.state
  const presentation = useMemo<SyncPresentation>(() => {
    let detail: string
    if (sync.status === 'synced') detail = sync.lastSyncAt ? `Last sync ${formatRelative(sync.lastSyncAt)}` : 'Up to date'
    else if (sync.status === 'syncing') detail = sync.source ? `Reading ${sync.source.name}` : 'Working…'
    else if (sync.status === 'pending') detail = sync.source ? 'Waiting to write changes' : 'Connect a workbook to save'
    else if (sync.status === 'no-source') detail = 'Choose a workbook to get started'
    else detail = sync.error?.message ?? LABELS[sync.status]
    return { status: sync.status, label: LABELS[sync.status], color: COLORS[sync.status], detail, busy: sync.status === 'syncing' }
  }, [sync])
  return { ...vault, sync, presentation }
}
