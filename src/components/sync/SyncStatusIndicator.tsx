import { Box, CircularProgress, Tooltip, Typography } from '@mui/material'
import { useExcelSync } from '../../hooks/useExcelSync'

interface SyncStatusIndicatorProps {
  /** Dot + label only. */
  compact?: boolean
  /** Dot only (for the collapsed sidebar). */
  dotOnly?: boolean
}

export function SyncStatusIndicator({ compact, dotOnly }: SyncStatusIndicatorProps) {
  const { presentation } = useExcelSync()
  const dotColor = presentation.color === 'text' ? 'text.disabled' : `${presentation.color}.main`

  const dot = presentation.busy ? (
    <CircularProgress size={10} thickness={6} sx={{ color: 'secondary.main' }} />
  ) : (
    <Box aria-hidden sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: dotColor, flexShrink: 0 }} />
  )

  if (dotOnly) {
    return (
      <Tooltip title={`${presentation.label} · ${presentation.detail}`} placement="right">
        <Box sx={{ display: 'grid', placeItems: 'center', width: 32, height: 32 }} role="status" aria-label={presentation.label}>
          {dot}
        </Box>
      </Tooltip>
    )
  }

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }} role="status">
      {dot}
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="body2" sx={{ fontWeight: 600, lineHeight: 1.2 }} className="kn-truncate">
          {presentation.label}
        </Typography>
        {!compact && (
          <Typography variant="caption" color="text.secondary" className="kn-truncate" sx={{ display: 'block' }}>
            {presentation.detail}
          </Typography>
        )}
      </Box>
    </Box>
  )
}
