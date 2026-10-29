import { Box, Button } from '@mui/material'
import { FileSpreadsheet, Plus, Search } from 'lucide-react'
import { EmptyState } from '../components/common/EmptyState'
import { MotionFade } from '../components/common/MotionFade'
import { CredentialFilters } from '../components/credentials/CredentialFilters'
import { CredentialList } from '../components/credentials/CredentialList'
import { useFilteredCredentials } from '../hooks/useCredentials'
import { useListFilters } from '../hooks/useListFilters'
import { useCredentialActions } from '../store/CredentialActionsContext'
import { useSettings } from '../store/SettingsContext'
import { useUi } from '../store/UiContext'
import { useVault } from '../store/VaultContext'
import { countActiveFilters } from '../utils/filtering'

export function AllPasswordsPage() {
  const { state } = useVault()
  const { categories } = useSettings()
  const { openSourceDialog } = useUi()
  const actions = useCredentialActions()
  const { filters, setFilters } = useListFilters()
  const filtered = useFilteredCredentials(filters)
  const hasAny = state.credentials.length > 0
  const active = countActiveFilters(filters)

  const emptyState = hasAny ? (
    <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 3.5, bgcolor: 'background.paper' }}>
      <EmptyState
        icon={Search}
        title="No matching accounts"
        description={active > 0 ? 'Try different search terms or clear the active filters.' : 'Nothing to show.'}
        action={active > 0 ? <Button variant="outlined" color="inherit" onClick={() => setFilters({ ...filters, query: '', category: null, quick: [] })}>Clear filters</Button> : undefined}
      />
    </Box>
  ) : (
    <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 3.5, bgcolor: 'background.paper' }}>
      <EmptyState
        icon={FileSpreadsheet}
        title={state.sync.source ? 'No passwords yet' : 'No workbook connected'}
        description={state.sync.source ? 'Add your first credential. It will be written to your workbook automatically.' : 'Connect an Excel workbook to load your saved credentials, or start adding passwords now.'}
        action={
          <>
            {!state.sync.source && (
              <Button variant="contained" startIcon={<FileSpreadsheet size={16} />} onClick={openSourceDialog}>
                Choose workbook
              </Button>
            )}
            <Button variant={state.sync.source ? 'contained' : 'outlined'} color={state.sync.source ? 'primary' : 'inherit'} startIcon={<Plus size={16} />} onClick={actions.openAdd}>
              Add password
            </Button>
          </>
        }
      />
    </Box>
  )

  return (
    <MotionFade>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <CredentialFilters filters={filters} categories={categories} onChange={setFilters} />
        <CredentialList credentials={filtered} loading={state.loading} sort={filters.sort} onSortChange={(sort) => setFilters({ ...filters, sort })} emptyState={emptyState} />
      </Box>
    </MotionFade>
  )
}
