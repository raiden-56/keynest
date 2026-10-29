import { Box, Typography } from '@mui/material'
import { Clock } from 'lucide-react'
import { EmptyState } from '../components/common/EmptyState'
import { MotionFade } from '../components/common/MotionFade'
import { CredentialFilters } from '../components/credentials/CredentialFilters'
import { CredentialList } from '../components/credentials/CredentialList'
import { useFilteredCredentials } from '../hooks/useCredentials'
import { useListFilters } from '../hooks/useListFilters'
import { useSettings } from '../store/SettingsContext'
import { useVault } from '../store/VaultContext'
import { RECENT_DAYS } from '../utils/constants'

export function RecentlyUpdatedPage() {
  const { state } = useVault()
  const { categories } = useSettings()
  const { filters, setFilters } = useListFilters()
  const sorted = useFilteredCredentials({ ...filters, sort: filters.sort === 'updated-asc' ? 'updated-asc' : 'updated-desc' })

  return (
    <MotionFade>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Typography variant="body2" color="text.secondary">
          Sorted by last update. Use the “Recently updated” chip to show only changes from the last {RECENT_DAYS} days.
        </Typography>
        <CredentialFilters filters={filters} categories={categories} onChange={setFilters} />
        <CredentialList
          credentials={sorted}
          loading={state.loading}
          sort={filters.sort}
          onSortChange={(sort) => setFilters({ ...filters, sort })}
          emptyState={
            <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 3.5, bgcolor: 'background.paper' }}>
              <EmptyState icon={Clock} title="No recent changes" description="Accounts you add or edit will appear here, newest first." />
            </Box>
          }
        />
      </Box>
    </MotionFade>
  )
}
