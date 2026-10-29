import { Box, CircularProgress, Typography } from '@mui/material'

export function LoadingSpinner({ label, size = 22 }: { label?: string; size?: number }) {
  return (
    <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1.25 }} role="status" aria-live="polite">
      <CircularProgress size={size} thickness={4} color="inherit" sx={{ color: 'secondary.main' }} />
      {label && (
        <Typography variant="body2" color="text.secondary">
          {label}
        </Typography>
      )}
    </Box>
  )
}
