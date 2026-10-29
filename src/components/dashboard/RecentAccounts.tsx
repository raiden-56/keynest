import { Box, Button, List, ListItem, ListItemButton, Paper, Typography } from '@mui/material'
import { Inbox } from 'lucide-react'
import { Link as RouterLink } from 'react-router-dom'
import { useCredentialActions } from '../../store/CredentialActionsContext'
import type { Credential } from '../../types/credential'
import { formatRelative } from '../../utils/dateFormatter'
import { AppAvatar } from '../common/AppAvatar'
import { CategoryDot } from '../common/CategoryDot'
import { EmptyState } from '../common/EmptyState'
import { Shimmer } from '../common/Shimmer'
import { CredentialRowActions } from '../credentials/CredentialRowActions'

interface RecentAccountsProps {
  credentials: Credential[]
  loading?: boolean
  limit?: number
}

export function RecentAccounts({ credentials, loading, limit = 6 }: RecentAccountsProps) {
  const actions = useCredentialActions()
  const items = [...credentials].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, limit)

  return (
    <Paper sx={{ overflow: 'hidden' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2.5, pt: 2, pb: 1 }}>
        <Typography variant="h3" component="h2">
          Recently updated
        </Typography>
        <Button component={RouterLink} to="/recent" size="small" color="inherit" sx={{ color: 'text.secondary' }}>
          View all
        </Button>
      </Box>
      {loading ? (
        <List disablePadding>
          {Array.from({ length: 4 }, (_, i) => (
            <ListItem key={i} sx={{ px: 2.5, py: 1.25, gap: 1.5 }}>
              <Shimmer width={36} height={36} radius={11} />
              <Box sx={{ flex: 1 }}>
                <Shimmer width="40%" height={12} />
                <Shimmer width="28%" height={10} sx={{ mt: 0.75 }} />
              </Box>
              <Shimmer width={60} height={10} />
            </ListItem>
          ))}
        </List>
      ) : items.length === 0 ? (
        <EmptyState icon={Inbox} title="Nothing here yet" description="Accounts you add or edit will show up here." compact />
      ) : (
        <List disablePadding>
          {items.map((c) => (
            <ListItem
              key={c.id}
              disablePadding
              secondaryAction={<CredentialRowActions credential={c} compact />}
              sx={{ borderTop: 1, borderColor: 'divider', '& .MuiListItemSecondaryAction-root': { right: 12 } }}
            >
              <ListItemButton onClick={() => actions.openDetails(c)} sx={{ px: 2.5, py: 1.25, gap: 1.5, borderRadius: 0, pr: 12 }}>
                <AppAvatar name={c.appName} size={36} />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }} className="kn-truncate">
                    {c.appName}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" className="kn-truncate" sx={{ display: 'block' }}>
                    {c.username || '—'}
                  </Typography>
                </Box>
                <Box sx={{ display: { xs: 'none', sm: 'flex' }, alignItems: 'center', gap: 2, flexShrink: 0 }}>
                  <CategoryDot category={c.category} size="small" />
                  <Typography variant="caption" color="text.secondary" sx={{ minWidth: 64, textAlign: 'right' }}>
                    {formatRelative(c.updatedAt)}
                  </Typography>
                </Box>
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      )}
    </Paper>
  )
}
