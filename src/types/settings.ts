import type { SortKey } from './credential'

export type ViewMode = 'table' | 'cards'
export type Density = 'comfortable' | 'compact'
export type WorkbookFormat = 'encrypted' | 'plain'

export interface AppSettings {
  appName: string
  defaultCategory: string
  defaultSort: SortKey
  viewMode: ViewMode
  pageSize: number
  autoLockMinutes: number
  clipboardClearSeconds: number
  revealTimeoutSeconds: number
  passwordsVisibleByDefault: boolean
  density: Density
  customCategories: string[]
  workbookFormat: WorkbookFormat
}
