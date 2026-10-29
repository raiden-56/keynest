import { Box, Paper, Typography } from '@mui/material'
import { useCredentialActions } from '../../store/CredentialActionsContext'
import type { Credential } from '../../types/credential'
import { formatRelative } from '../../utils/dateFormatter'
import { hostnameOf } from '../../utils/validators'
import { AppAvatar } from '../common/AppAvatar'
import { CategoryDot } from '../common/CategoryDot'
import { Shimmer } from '../common/Shimmer'
import { CredentialRowActions } from './CredentialRowActions'
import { PasswordField } from './PasswordField'

interface CredentialCardProps {
  credential: Credential
  revealed: boolean
  onReveal: () => void
}

export function CredentialCard({ credential, revealed, onReveal }: CredentialCardProps) {
  const actions = useCredentialActions()
  return (
    <Paper
      component="article"
      onClick={() => actions.openDetails(credential)}
      sx={{
        p: 'var(--kn-card-pad)',
        cursor: 'pointer',
        transition: 'border-color 160ms ease, transform 160ms ease',
        '&:hover': { borderColor: 'text.secondary' },
      }}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && e.target === e.currentTarget) actions.openDetails(credential)
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <AppAvatar name={credential.appName} size={40} />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="subtitle1" className="kn-truncate" sx={{ fontWeight: 600 }}>
            {credential.appName}
          </Typography>
          <Typography variant="body2" color="text.secondary" className="kn-truncate">
            {credential.username || '—'}
          </Typography>
        </Box>
        <CredentialRowActions credential={credential} compact />
      </Box>
      <Box sx={{ mt: 1.5, display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }} onClick={(e) => e.stopPropagation()}>
        <PasswordField value={credential.password} revealed={revealed} onToggle={onReveal} size="small" />
      </Box>
      <Box sx={{ mt: 1.25, display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
        <CategoryDot category={credential.category} size="small" />
        <Typography variant="caption" color="text.secondary" className="kn-truncate" sx={{ flex: 1, minWidth: 0 }}>
          {credential.url ? hostnameOf(credential.url) : 'No website'}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {formatRelative(credential.updatedAt)}
        </Typography>
      </Box>
    </Paper>
  )
}

export function CredentialCardSkeleton() {
  return (
    <Paper sx={{ p: 'var(--kn-card-pad)' }} aria-hidden>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Shimmer width={40} height={40} radius={12} />
        <Box sx={{ flex: 1 }}>
          <Shimmer width="55%" height={13} />
          <Shimmer width="40%" height={11} sx={{ mt: 0.75 }} />
        </Box>
      </Box>
      <Shimmer width="45%" height={12} sx={{ mt: 2 }} />
      <Shimmer width="70%" height={10} sx={{ mt: 1.5 }} />
    </Paper>
  )
}
