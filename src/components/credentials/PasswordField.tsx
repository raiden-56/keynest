import { Box, IconButton, Tooltip, Typography } from '@mui/material'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Eye, EyeOff } from 'lucide-react'

interface PasswordFieldProps {
  value: string
  revealed: boolean
  onToggle: () => void
  size?: 'small' | 'medium'
  /** Hides the toggle button (e.g. when a parent renders its own). */
  hideToggle?: boolean
}

const MASK = '••••••••••'

/**
 * Read-only password display. Masked by default with a fixed-length mask (length is not leaked).
 * The reveal transition only animates opacity so characters are never partially shown.
 */
export function PasswordField({ value, revealed, onToggle, size = 'medium', hideToggle }: PasswordFieldProps) {
  const reduced = useReducedMotion()
  const show = revealed && value.length > 0
  return (
    <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, minWidth: 0, maxWidth: '100%' }}>
      <Box sx={{ position: 'relative', minWidth: 0, display: 'grid' }}>
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={show ? 'shown' : 'masked'}
            initial={reduced ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={reduced ? { opacity: 1 } : { opacity: 0 }}
            transition={{ duration: 0.15 }}
            style={{ display: 'block', minWidth: 0 }}
          >
            <Typography
              component="span"
              className={show ? 'kn-mono kn-truncate' : 'kn-truncate'}
              variant={size === 'small' ? 'body2' : 'body1'}
              sx={{
                display: 'block',
                color: show ? 'text.primary' : 'text.secondary',
                letterSpacing: show ? undefined : '0.12em',
                fontSize: show ? (size === 'small' ? '0.8125rem' : '0.875rem') : undefined,
                userSelect: show ? 'all' : 'none',
                maxWidth: 260,
              }}
              aria-label={show ? 'Password' : 'Password hidden'}
            >
              {show ? value : value ? MASK : '—'}
            </Typography>
          </motion.span>
        </AnimatePresence>
      </Box>
      {!hideToggle && value && (
        <Tooltip title={revealed ? 'Hide password' : 'Reveal password'}>
          <IconButton size="small" onClick={onToggle} aria-pressed={revealed} aria-label={revealed ? 'Hide password' : 'Reveal password'}>
            {revealed ? <EyeOff size={16} /> : <Eye size={16} />}
          </IconButton>
        </Tooltip>
      )}
    </Box>
  )
}
