import { Box, Button } from '@mui/material'
import { Star } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { EmptyState } from '../components/common/EmptyState'
import { MotionFade } from '../components/common/MotionFade'
import { CredentialFilters } from '../components/credentials/CredentialFilters'
import { CredentialList } from '../components/credentials/CredentialList'
import { useFilteredCredentials } from '../hooks/useCredentials'
import { useListFilters } from '../hooks/useListFilters'
import { useSettings } from '../store/SettingsContext'
import { useVault } from '../store/VaultContext'

const LOCKED = ['favorites'] as const

export function FavoritesPage() {
  const { state } = useVault()
  const { categories } = useSettings()
  const navigate = useNavigate()
  const { filters, setFilters } = useListFilters({ lockedQuick: [...LOCKED] })
  const filtered = useFilteredCredentials(filters)
  const anyFavorites = state.credentials.some((c) => c.favorite)

  return (
    <MotionFade>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <CredentialFilters filters={filters} categories={categories} onChange={setFilters} hiddenQuick={[...LOCKED]} />
        <CredentialList
          credentials={filtered}
          loading={state.loading}
          sort={filters.sort}
          onSortChange={(sort) => setFilters({ ...filters, sort })}
          emptyState={
            <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 3.5, bgcolor: 'background.paper' }}>
              <EmptyState
                icon={Star}
                title={anyFavorites ? 'No favorites match these filters' : 'No favorites yet'}
                description={anyFavorites ? 'Adjust the filters to see more.' : 'Star the accounts you use most and they will appear here for quick access.'}
                action={
                  <Button variant="outlined" color="inherit" onClick={() => navigate('/passwords')}>
                    Browse all passwords
                  </Button>
                }
              />
            </Box>
          }
        />
      </Box>
    </MotionFade>
  )
}
