import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useSettings } from '../store/SettingsContext'
import type { CredentialFilterState, QuickFilter } from '../types/credential'
import { filtersFromParams, paramsFromFilters } from '../utils/filtering'

interface ListFilterOptions {
  /** Quick filters the page always applies (not stored in the URL). */
  lockedQuick?: QuickFilter[]
  /** Category the page always applies. */
  lockedCategory?: string | null
}

/** Filter state stored in the URL so it survives navigation and can be shared. */
export function useListFilters(options: ListFilterOptions = {}) {
  const { settings } = useSettings()
  const [params, setParams] = useSearchParams()
  const defaultSort = settings.defaultSort

  const urlFilters = useMemo(() => filtersFromParams(params, defaultSort), [params, defaultSort])

  const filters = useMemo<CredentialFilterState>(
    () => ({
      ...urlFilters,
      category: options.lockedCategory !== undefined ? options.lockedCategory : urlFilters.category,
      quick: Array.from(new Set([...(options.lockedQuick ?? []), ...urlFilters.quick])),
    }),
    [urlFilters, options.lockedCategory, options.lockedQuick],
  )

  const setFilters = useCallback(
    (next: CredentialFilterState) => {
      const cleaned: CredentialFilterState = {
        ...next,
        quick: next.quick.filter((q) => !(options.lockedQuick ?? []).includes(q)),
        category: options.lockedCategory !== undefined ? null : next.category,
      }
      setParams(paramsFromFilters(cleaned, defaultSort), { replace: true })
    },
    [defaultSort, options.lockedCategory, options.lockedQuick, setParams],
  )

  return { filters, setFilters }
}
