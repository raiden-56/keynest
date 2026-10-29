import { Box, Typography } from '@mui/material'
import { CircleAlert, TriangleAlert } from 'lucide-react'
import type { ReactNode } from 'react'

interface ErrorMessageProps {
  title: string
  message?: ReactNode
  details?: string[]
  severity?: 'error' | 'warning'
  action?: ReactNode
}

/** Explains what happened and what to do next. Never shows stack traces or credential values. */
export function ErrorMessage({ title, message, details, severity = 'error', action }: ErrorMessageProps) {
  const Icon = severity === 'error' ? CircleAlert : TriangleAlert
  const color = severity === 'error' ? 'error.main' : 'warning.main'
  return (
    <Box
      role="alert"
      sx={{
        display: 'flex',
        gap: 1.5,
        p: 2,
        borderRadius: 3,
        border: 1,
        borderColor: 'divider',
        bgcolor: 'background.paper',
        borderLeft: 3,
        borderLeftColor: color,
      }}
    >
      <Box sx={{ color, display: 'flex', pt: 0.25, flexShrink: 0 }}>
        <Icon size={20} />
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
          {title}
        </Typography>
        {message && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
            {message}
          </Typography>
        )}
        {details && details.length > 0 && (
          <Box component="ul" sx={{ m: 0, mt: 1, pl: 2.5, color: 'text.secondary', fontSize: '0.8125rem' }}>
            {details.map((d, i) => (
              <li key={i}>{d}</li>
            ))}
          </Box>
        )}
        {action && <Box sx={{ mt: 1.5, display: 'flex', gap: 1, flexWrap: 'wrap' }}>{action}</Box>}
      </Box>
    </Box>
  )
}
