import { Box, Paper, Typography } from '@mui/material'
import type { LucideIcon } from 'lucide-react'
import { Shimmer } from '../common/Shimmer'

interface StatsCardProps {
  icon: LucideIcon
  label: string
  value: string | number
  hint?: string
  loading?: boolean
  onClick?: () => void
}

export function StatsCard({ icon: Icon, label, value, hint, loading, onClick }: StatsCardProps) {
  return (
    <Paper
      component={onClick ? 'button' : 'div'}
      onClick={onClick}
      sx={{
        p: 'var(--kn-card-pad)',
        display: 'flex',
        alignItems: 'center',
        gap: 1.75,
        textAlign: 'left',
        width: '100%',
        font: 'inherit',
        color: 'inherit',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'border-color 160ms ease',
        '&:hover': onClick ? { borderColor: 'text.secondary' } : undefined,
      }}
    >
      <Box
        sx={{
          width: 40,
          height: 40,
          borderRadius: '12px',
          display: 'grid',
          placeItems: 'center',
          bgcolor: 'action.hover',
          color: 'primary.main',
          flexShrink: 0,
        }}
      >
        <Icon size={19} strokeWidth={1.9} />
      </Box>
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 500 }}>
          {label}
        </Typography>
        {loading ? (
          <Shimmer width="50%" height={22} sx={{ mt: 0.5 }} />
        ) : (
          <Typography variant="h2" component="p" className="kn-truncate" sx={{ lineHeight: 1.25 }}>
            {value}
          </Typography>
        )}
        {hint && !loading && (
          <Typography variant="caption" color="text.secondary" className="kn-truncate" sx={{ display: 'block' }}>
            {hint}
          </Typography>
        )}
      </Box>
    </Paper>
  )
}
