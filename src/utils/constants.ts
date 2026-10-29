export const APP_NAME = 'KeyNest'
export const APP_TAGLINE = 'Your digital life, organized.'

export const DEFAULT_CATEGORIES = [
  'Work',
  'Personal',
  'Finance',
  'Shopping',
  'Social Media',
  'Entertainment',
  'Developer Tools',
  'Other',
] as const

export const STORAGE_KEYS = {
  settings: 'kn.settings',
  source: 'kn.source',
  kdf: 'kn.kdf',
  session: 'kn.session',
  lastSync: 'kn.lastSync',
} as const

export const IDB_NAME = 'keynest'
export const IDB_STORE = 'handles'

export const ENCRYPTION_VERSION = 'KN1'
export const PBKDF2_ITERATIONS = 600_000

export const RECENT_DAYS = 7
export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100]
export const MAX_LOGIN_ATTEMPTS = 5
export const LOCKOUT_BASE_SECONDS = 30
