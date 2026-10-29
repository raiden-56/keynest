import { useMemo } from 'react'
import { useVault } from '../store/VaultContext'
import type { Credential, CredentialFilterState } from '../types/credential'
import { applyFilters } from '../utils/filtering'

export { useVault } from '../store/VaultContext'

export function useCredentials(): Credential[] {
  return useVault().state.credentials
}

export function useFilteredCredentials(filters: CredentialFilterState): Credential[] {
  const credentials = useCredentials()
  return useMemo(() => applyFilters(credentials, filters), [credentials, filters])
}

export function useCategoryCounts(): Map<string, number> {
  const credentials = useCredentials()
  return useMemo(() => {
    const counts = new Map<string, number>()
    for (const c of credentials) counts.set(c.category, (counts.get(c.category) ?? 0) + 1)
    return counts
  }, [credentials])
}
