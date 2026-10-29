import type { AppSettings } from '../types/settings'
import { APP_NAME, PAGE_SIZE_OPTIONS, STORAGE_KEYS } from '../utils/constants'

export const DEFAULT_SETTINGS: AppSettings = {
  appName: APP_NAME,
  defaultCategory: 'Personal',
  defaultSort: 'updated-desc',
  viewMode: 'table',
  pageSize: 25,
  autoLockMinutes: 10,
  clipboardClearSeconds: 30,
  revealTimeoutSeconds: 20,
  passwordsVisibleByDefault: false,
  density: 'comfortable',
  customCategories: [],
  workbookFormat: 'encrypted',
}

const SORT_KEYS = new Set(['name-asc', 'name-desc', 'category', 'updated-desc', 'updated-asc', 'created-desc'])

function sanitize(input: Partial<AppSettings>): AppSettings {
  const s = { ...DEFAULT_SETTINGS, ...input }
  return {
    appName: typeof s.appName === 'string' && s.appName.trim() ? s.appName.trim().slice(0, 40) : APP_NAME,
    defaultCategory: typeof s.defaultCategory === 'string' ? s.defaultCategory : DEFAULT_SETTINGS.defaultCategory,
    defaultSort: SORT_KEYS.has(s.defaultSort) ? s.defaultSort : DEFAULT_SETTINGS.defaultSort,
    viewMode: s.viewMode === 'cards' ? 'cards' : 'table',
    pageSize: PAGE_SIZE_OPTIONS.includes(Number(s.pageSize)) ? Number(s.pageSize) : DEFAULT_SETTINGS.pageSize,
    autoLockMinutes: clamp(Number(s.autoLockMinutes), 0, 240, DEFAULT_SETTINGS.autoLockMinutes),
    clipboardClearSeconds: clamp(Number(s.clipboardClearSeconds), 0, 600, DEFAULT_SETTINGS.clipboardClearSeconds),
    revealTimeoutSeconds: clamp(Number(s.revealTimeoutSeconds), 0, 300, DEFAULT_SETTINGS.revealTimeoutSeconds),
    passwordsVisibleByDefault: Boolean(s.passwordsVisibleByDefault),
    density: s.density === 'compact' ? 'compact' : 'comfortable',
    customCategories: Array.isArray(s.customCategories)
      ? s.customCategories.filter((c): c is string => typeof c === 'string' && c.trim().length > 0).slice(0, 50)
      : [],
    workbookFormat: s.workbookFormat === 'plain' ? 'plain' : 'encrypted',
  }
}

function clamp(value: number, min: number, max: number, fallback: number): number {
  if (!Number.isFinite(value)) return fallback
  return Math.min(max, Math.max(min, value))
}

export function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.settings)
    if (!raw) return DEFAULT_SETTINGS
    return sanitize(JSON.parse(raw) as Partial<AppSettings>)
  } catch {
    return DEFAULT_SETTINGS
  }
}

export function saveSettings(settings: AppSettings) {
  try {
    localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(sanitize(settings)))
  } catch {
    /* storage unavailable */
  }
}
