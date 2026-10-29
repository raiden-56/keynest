import { Box, Button, Typography } from '@mui/material'
import { Clock, FileSpreadsheet, Folders, KeyRound, Plus, Star } from 'lucide-react'
import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { EmptyState } from '../components/common/EmptyState'
import { MotionItem, MotionStagger } from '../components/common/MotionFade'
import { CategoryCard, CategoryCardSkeleton } from '../components/dashboard/CategoryCard'
import { RecentAccounts } from '../components/dashboard/RecentAccounts'
import { StatsCard } from '../components/dashboard/StatsCard'
import { useCategoryCounts } from '../hooks/useCredentials'
import { useCredentialActions } from '../store/CredentialActionsContext'
import { useSettings } from '../store/SettingsContext'
import { useUi } from '../store/UiContext'
import { useVault } from '../store/VaultContext'
import { APP_TAGLINE } from '../utils/constants'
import { formatRelative, formatTime } from '../utils/dateFormatter'

export function DashboardPage() {
  const navigate = useNavigate()
  const { state, syncNow } = useVault()
  const { categories } = useSettings()
  const { openSourceDialog } = useUi()
  const actions = useCredentialActions()
  const counts = useCategoryCounts()
  const { credentials, loading, sync } = state

  const favorites = useMemo(() => credentials.filter((c) => c.favorite).length, [credentials])
  const categoriesInUse = counts.size
  const allCategories = useMemo(() => {
    const extra = [...counts.keys()].filter((c) => !categories.includes(c))
    return [...categories, ...extra]
  }, [categories, counts])

  const noSource = !sync.source && credentials.length === 0 && !loading

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Box>
        <Typography variant="h1" component="h2" sx={{ mb: 0.5 }}>
          {APP_TAGLINE}
        </Typography>
        <Typography variant="body1" color="text.secondary">
          {loading
            ? 'Loading your vault…'
            : credentials.length === 0
              ? 'No accounts saved yet.'
              : `${credentials.length} saved ${credentials.length === 1 ? 'account' : 'accounts'} across ${categoriesInUse} ${categoriesInUse === 1 ? 'category' : 'categories'}.`}
        </Typography>
      </Box>

      {noSource ? (
        <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 3.5, bgcolor: 'background.paper' }}>
          <EmptyState
            icon={FileSpreadsheet}
            title="Connect your Excel workbook"
            description="KeyNest reads and writes a single .xlsx file that you own. Pick an existing file, create a new one, or start adding passwords now and connect a file later."
            action={
              <>
                <Button variant="contained" startIcon={<FileSpreadsheet size={16} />} onClick={openSourceDialog}>
                  Choose workbook
                </Button>
                <Button variant="outlined" color="inherit" startIcon={<Plus size={16} />} onClick={actions.openAdd}>
                  Add a password
                </Button>
              </>
            }
          />
        </Box>
      ) : (
        <MotionStagger style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
          <MotionItem>
            <StatsCard icon={KeyRound} label="Total accounts" value={credentials.length} loading={loading} onClick={() => navigate('/passwords')} />
          </MotionItem>
          <MotionItem>
            <StatsCard icon={Star} label="Favorites" value={favorites} loading={loading} onClick={() => navigate('/favorites')} />
          </MotionItem>
          <MotionItem>
            <StatsCard icon={Folders} label="Categories" value={categoriesInUse} hint={`${allCategories.length} available`} loading={loading} onClick={() => navigate('/categories')} />
          </MotionItem>
          <MotionItem>
            <StatsCard
              icon={Clock}
              label="Last synced"
              value={sync.lastSyncAt ? formatTime(sync.lastSyncAt) : 'Never'}
              hint={sync.lastSyncAt ? formatRelative(sync.lastSyncAt) : sync.source ? 'Click to sync' : 'No workbook'}
              loading={loading}
              onClick={() => void syncNow()}
            />
          </MotionItem>
        </MotionStagger>
      )}

      <Box>
        <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', mb: 1.5 }}>
          <Typography variant="h3" component="h2">
            Categories
          </Typography>
          <Button size="small" color="inherit" sx={{ color: 'text.secondary' }} onClick={() => navigate('/categories')}>
            Manage
          </Button>
        </Box>
        <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)', md: 'repeat(4, 1fr)' } }}>
          {loading
            ? Array.from({ length: 8 }, (_, i) => <CategoryCardSkeleton key={i} />)
            : allCategories.map((category) => (
                <CategoryCard key={category} category={category} count={counts.get(category) ?? 0} onClick={() => navigate(`/passwords?category=${encodeURIComponent(category)}`)} />
              ))}
        </Box>
      </Box>

      <RecentAccounts credentials={credentials} loading={loading} />
    </Box>
  )
}
