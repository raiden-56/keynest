import { Box, Typography } from '@mui/material'
import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description?: ReactNode
  action?: ReactNode
  compact?: boolean
}

export function EmptyState({ icon: Icon, title, description, action, compact }: EmptyStateProps) {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        py: compact ? 4 : 8,
        px: 3,
        gap: 1.25,
      }}
    >
      <Box
        sx={{
          width: 52,
          height: 52,
          borderRadius: '14px',
          display: 'grid',
          placeItems: 'center',
          bgcolor: 'action.hover',
          color: 'secondary.main',
          mb: 0.5,
        }}
      >
        <Icon size={24} strokeWidth={1.75} />
      </Box>
      <Typography variant="h4" component="h3">
        {title}
      </Typography>
      {description && (
        <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 420 }}>
          {description}
        </Typography>
      )}
      {action && (
        <Box sx={{ mt: 1.5, display: 'flex', gap: 1, flexWrap: 'wrap', justifyContent: 'center' }}>{action}</Box>
      )}
    </Box>
  )
}
