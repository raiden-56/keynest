export interface Credential {
  id: string
  appName: string
  url: string
  username: string
  password: string
  category: string
  notes: string
  /** ISO-8601 timestamp */
  createdAt: string
  /** ISO-8601 timestamp */
  updatedAt: string
  favorite: boolean
}

export type CredentialInput = Omit<Credential, 'id' | 'createdAt' | 'updatedAt'>

export type SortKey =
  | 'name-asc'
  | 'name-desc'
  | 'category'
  | 'updated-desc'
  | 'updated-asc'
  | 'created-desc'

export type QuickFilter =
  | 'favorites'
  | 'recently-updated'
  | 'recently-added'
  | 'missing-url'
  | 'duplicates'

export interface CredentialFilterState {
  query: string
  category: string | null
  quick: QuickFilter[]
  sort: SortKey
}
