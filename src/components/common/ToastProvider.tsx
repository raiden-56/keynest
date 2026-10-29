import { Box, IconButton, Typography } from '@mui/material'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { CircleAlert, CircleCheck, Info, TriangleAlert, X } from 'lucide-react'
import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react'

export type ToastSeverity = 'success' | 'error' | 'info' | 'warning'

export interface ToastOptions {
  message: string
  severity?: ToastSeverity
  durationMs?: number
  action?: { label: string; onClick: () => void }
}

interface ToastItem extends Required<Pick<ToastOptions, 'message' | 'severity' | 'durationMs'>> {
  id: number
  action?: ToastOptions['action']
}

interface ToastApi {
  show: (options: ToastOptions) => void
  success: (message: string, options?: Omit<ToastOptions, 'message' | 'severity'>) => void
  error: (message: string, options?: Omit<ToastOptions, 'message' | 'severity'>) => void
  info: (message: string, options?: Omit<ToastOptions, 'message' | 'severity'>) => void
  warning: (message: string, options?: Omit<ToastOptions, 'message' | 'severity'>) => void
}

const ToastContext = createContext<ToastApi | null>(null)

const ICONS: Record<ToastSeverity, typeof CircleCheck> = {
  success: CircleCheck,
  error: CircleAlert,
  info: Info,
  warning: TriangleAlert,
}

const COLORS: Record<ToastSeverity, string> = {
  success: 'success.main',
  error: 'error.main',
  info: 'secondary.main',
  warning: 'warning.main',
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])
  const counter = useRef(0)
  const reduced = useReducedMotion()

  const dismiss = useCallback((id: number) => {
    setItems((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const show = useCallback(
    (options: ToastOptions) => {
      const id = ++counter.current
      const item: ToastItem = {
        id,
        message: options.message,
        severity: options.severity ?? 'info',
        durationMs: options.durationMs ?? (options.severity === 'error' ? 6000 : 3200),
        action: options.action,
      }
      setItems((prev) => [...prev.slice(-2), item])
      window.setTimeout(() => dismiss(id), item.durationMs)
    },
    [dismiss],
  )

  const api = useMemo<ToastApi>(
    () => ({
      show,
      success: (message, o) => show({ ...o, message, severity: 'success' }),
      error: (message, o) => show({ ...o, message, severity: 'error' }),
      info: (message, o) => show({ ...o, message, severity: 'info' }),
      warning: (message, o) => show({ ...o, message, severity: 'warning' }),
    }),
    [show],
  )

  return (
    <ToastContext.Provider value={api}>
      {children}
      <Box
        aria-live="polite"
        sx={{
          position: 'fixed',
          right: { xs: 12, sm: 20 },
          bottom: { xs: 12, sm: 20 },
          left: { xs: 12, sm: 'auto' },
          zIndex: (t) => t.zIndex.snackbar,
          display: 'flex',
          flexDirection: 'column',
          gap: 1,
          pointerEvents: 'none',
        }}
      >
        <AnimatePresence initial={false}>
          {items.map((item) => {
            const Icon = ICONS[item.severity]
            return (
              <motion.div
                key={item.id}
                layout={!reduced}
                initial={reduced ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={reduced ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.98 }}
                transition={{ duration: 0.2, ease: [0.2, 0, 0, 1] }}
                style={{ pointerEvents: 'auto' }}
              >
                <Box
                  role="status"
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.25,
                    minWidth: { sm: 300 },
                    maxWidth: 440,
                    px: 1.5,
                    py: 1.25,
                    bgcolor: 'background.paper',
                    border: 1,
                    borderColor: 'divider',
                    borderRadius: 3,
                    boxShadow: '0 12px 32px -12px rgba(20, 24, 18, 0.35)',
                  }}
                >
                  <Box sx={{ color: COLORS[item.severity], display: 'flex', flexShrink: 0 }}>
                    <Icon size={18} />
                  </Box>
                  <Typography variant="body2" sx={{ flex: 1, color: 'text.primary' }}>
                    {item.message}
                  </Typography>
                  {item.action && (
                    <Typography
                      component="button"
                      variant="body2"
                      onClick={() => {
                        item.action?.onClick()
                        dismiss(item.id)
                      }}
                      sx={{
                        border: 0,
                        background: 'none',
                        color: 'primary.main',
                        fontWeight: 600,
                        cursor: 'pointer',
                        px: 0.5,
                        fontFamily: 'inherit',
                      }}
                    >
                      {item.action.label}
                    </Typography>
                  )}
                  <IconButton size="small" aria-label="Dismiss" onClick={() => dismiss(item.id)} sx={{ ml: -0.5 }}>
                    <X size={16} />
                  </IconButton>
                </Box>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </Box>
    </ToastContext.Provider>
  )
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
