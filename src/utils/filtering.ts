import type { Credential, CredentialFilterState, QuickFilter, SortKey } from '../types/credential'
import { RECENT_DAYS } from './constants'
import { isWithinDays } from './dateFormatter'
import { hostnameOf } from './validators'

export const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'updated-desc', label: 'Recently modified' },
  { value: 'updated-asc', label: 'Least recently modified' },
  { value: 'created-desc', label: 'Recently added' },
  { value: 'name-asc', label: 'Name A–Z' },
  { value: 'name-desc', label: 'Name Z–A' },
  { value: 'category', label: 'Category' },
]

export const QUICK_FILTER_OPTIONS: { value: QuickFilter; label: string }[] = [
  { value: 'favorites', label: 'Favorites' },
  { value: 'recently-updated', label: 'Recently updated' },
  { value: 'recently-added', label: 'Recently added' },
  { value: 'missing-url', label: 'Missing URL' },
  { value: 'duplicates', label: 'Duplicate username or URL' },
]

const QUICK_VALUES = new Set<string>(QUICK_FILTER_OPTIONS.map((q) => q.value))
const SORT_VALUES = new Set<string>(SORT_OPTIONS.map((s) => s.value))

/** IDs of records sharing a username or a hostname with at least one other record. */
export function findDuplicateIds(credentials: Credential[]): Set<string> {
  const byUser = new Map<string, string[]>()
  const byHost = new Map<string, string[]>()
  for (const c of credentials) {
    const user = c.username.trim().toLowerCase()
    if (user) byUser.set(user, [...(byUser.get(user) ?? []), c.id])
    const host = c.url.trim() ? hostnameOf(c.url).toLowerCase() : ''
    if (host) byHost.set(host, [...(byHost.get(host) ?? []), c.id])
  }
  const ids = new Set<string>()
  for (const group of [...byUser.values(), ...byHost.values()]) {
    if (group.length > 1) group.forEach((id) => ids.add(id))
  }
  return ids
}

function matchesQuery(c: Credential, query: string): boolean {
  if (!query) return true
  const haystack = [c.appName, c.username, c.url, c.category, c.notes].join('\n').toLowerCase()
  return query
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((term) => haystack.includes(term))
}

export function sortCredentials(list: Credential[], sort: SortKey): Credential[] {
  const copy = [...list]
  const byName = (a: Credential, b: Credential) => a.appName.localeCompare(b.appName, undefined, { sensitivity: 'base' })
  switch (sort) {
    case 'name-asc':
      return copy.sort(byName)
    case 'name-desc':
      return copy.sort((a, b) => byName(b, a))
    case 'category':
      return copy.sort((a, b) => a.category.localeCompare(b.category) || byName(a, b))
    case 'updated-asc':
      return copy.sort((a, b) => a.updatedAt.localeCompare(b.updatedAt))
    case 'created-desc':
      return copy.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    case 'updated-desc':
    default:
      return copy.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  }
}

export function applyFilters(credentials: Credential[], filters: CredentialFilterState): Credential[] {
  const query = filters.query.trim()
  const duplicates = filters.quick.includes('duplicates') ? findDuplicateIds(credentials) : null
  const filtered = credentials.filter((c) => {
    if (filters.category && c.category !== filters.category) return false
    if (!matchesQuery(c, query)) return false
    for (const quick of filters.quick) {
      if (quick === 'favorites' && !c.favorite) return false
      if (quick === 'recently-updated' && !isWithinDays(c.updatedAt, RECENT_DAYS)) return false
      if (quick === 'recently-added' && !isWithinDays(c.createdAt, RECENT_DAYS)) return false
      if (quick === 'missing-url' && c.url.trim()) return false
      if (quick === 'duplicates' && !duplicates?.has(c.id)) return false
    }
    return true
  })
  return sortCredentials(filtered, filters.sort)
}

export function filtersFromParams(params: URLSearchParams, defaultSort: SortKey): CredentialFilterState {
  const sort = params.get('sort')
  return {
    query: params.get('q') ?? '',
    category: params.get('category'),
    quick: (params.get('quick') ?? '')
      .split(',')
      .filter((q): q is QuickFilter => QUICK_VALUES.has(q)),
    sort: sort && SORT_VALUES.has(sort) ? (sort as SortKey) : defaultSort,
  }
}

export function paramsFromFilters(filters: CredentialFilterState, defaultSort: SortKey): URLSearchParams {
  const params = new URLSearchParams()
  if (filters.query.trim()) params.set('q', filters.query.trim())
  if (filters.category) params.set('category', filters.category)
  if (filters.quick.length) params.set('quick', filters.quick.join(','))
  if (filters.sort !== defaultSort) params.set('sort', filters.sort)
  return params
}

export function countActiveFilters(filters: CredentialFilterState): number {
  return (filters.category ? 1 : 0) + filters.quick.length + (filters.query.trim() ? 1 : 0)
}
