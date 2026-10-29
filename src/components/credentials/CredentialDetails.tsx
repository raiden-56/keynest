import { Box, Button, Divider, Drawer, IconButton, Tooltip, Typography, useMediaQuery, useTheme } from '@mui/material'
import { Copy, ExternalLink, Lock, Pencil, Star, Trash2, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useSettings } from '../../store/SettingsContext'
import type { CredentialActions } from '../../store/CredentialActionsContext'
import type { Credential } from '../../types/credential'
import { formatDateTime } from '../../utils/dateFormatter'
import { hostnameOf } from '../../utils/validators'
import { AppAvatar } from '../common/AppAvatar'
import { CategoryDot } from '../common/CategoryDot'
import { PasswordField } from './PasswordField'

interface CredentialDetailsProps {
  credential: Credential | null
  open: boolean
  onClose: () => void
  actions: CredentialActions
  onLock: () => void
}

export function CredentialDetails({ credential, open, onClose, actions, onLock }: CredentialDetailsProps) {
  const theme = useTheme()
  const mobile = useMediaQuery(theme.breakpoints.down('sm'))
  const { settings } = useSettings()
  const [revealed, setRevealed] = useState(false)

  // Re-mask whenever the drawer opens, the record changes, or the timeout elapses.
  useEffect(() => {
    setRevealed(false)
  }, [open, credential?.id])

  useEffect(() => {
    if (!revealed || settings.revealTimeoutSeconds <= 0) return
    const timer = setTimeout(() => setRevealed(false), settings.revealTimeoutSeconds * 1000)
    return () => clearTimeout(timer)
  }, [revealed, settings.revealTimeoutSeconds])

  return (
    <Drawer
      anchor={mobile ? 'bottom' : 'right'}
      open={open}
      onClose={onClose}
      slotProps={{
        paper: {
          sx: {
            width: mobile ? '100%' : 440,
            maxWidth: '100vw',
            height: mobile ? '92vh' : '100%',
            borderTopLeftRadius: mobile ? 16 : 0,
            borderTopRightRadius: mobile ? 16 : 0,
            display: 'flex',
            flexDirection: 'column',
          },
        },
      }}
    >
      {credential && (
        <>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 2.5, pb: 2 }}>
            <AppAvatar name={credential.appName} size={44} />
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="h3" className="kn-truncate">
                {credential.appName}
              </Typography>
              <Typography variant="body2" color="text.secondary" className="kn-truncate">
                {credential.url ? hostnameOf(credential.url) : 'No website'}
              </Typography>
            </Box>
            <Tooltip title={credential.favorite ? 'Remove from favorites' : 'Add to favorites'}>
              <IconButton
                onClick={() => actions.toggleFavorite(credential)}
                aria-pressed={credential.favorite}
                aria-label="Toggle favorite"
                sx={{ color: credential.favorite ? 'warning.main' : undefined }}
              >
                <Star size={18} fill={credential.favorite ? 'currentColor' : 'none'} />
              </IconButton>
            </Tooltip>
            <IconButton onClick={onClose} aria-label="Close details">
              <X size={18} />
            </IconButton>
          </Box>
          <Divider />

          <Box sx={{ p: 2.5, display: 'flex', flexDirection: 'column', gap: 2.25, overflowY: 'auto', flex: 1 }}>
            <Field label="Username">
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Typography sx={{ flex: 1, minWidth: 0 }} className="kn-truncate">
                  {credential.username || '—'}
                </Typography>
                <Tooltip title="Copy username">
                  <IconButton size="small" onClick={() => actions.copyUsername(credential)} aria-label="Copy username">
                    <Copy size={16} />
                  </IconButton>
                </Tooltip>
              </Box>
            </Field>

            <Field label="Password">
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <PasswordField value={credential.password} revealed={revealed} onToggle={() => setRevealed((v) => !v)} />
                </Box>
                <Tooltip title="Copy password">
                  <IconButton size="small" onClick={() => actions.copyPassword(credential)} aria-label="Copy password">
                    <Copy size={16} />
                  </IconButton>
                </Tooltip>
              </Box>
              {revealed && settings.revealTimeoutSeconds > 0 && (
                <Typography variant="caption" color="text.secondary">
                  Hides automatically after {settings.revealTimeoutSeconds}s.
                </Typography>
              )}
            </Field>

            <Field label="Website">
              {credential.url ? (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Typography sx={{ flex: 1, minWidth: 0, wordBreak: 'break-all' }} variant="body2">
                    {credential.url}
                  </Typography>
                  <Tooltip title="Open website in a new tab">
                    <IconButton size="small" onClick={() => actions.openUrl(credential)} aria-label="Open website">
                      <ExternalLink size={16} />
                    </IconButton>
                  </Tooltip>
                </Box>
              ) : (
                <Typography color="text.secondary">—</Typography>
              )}
            </Field>

            <Field label="Category">
              <CategoryDot category={credential.category} />
            </Field>

            <Field label="Notes">
              <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', color: credential.notes ? 'text.primary' : 'text.secondary' }}>
                {credential.notes || 'No notes'}
              </Typography>
            </Field>

            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <Field label="Created">
                <Typography variant="body2">{formatDateTime(credential.createdAt)}</Typography>
              </Field>
              <Field label="Last updated">
                <Typography variant="body2">{formatDateTime(credential.updatedAt)}</Typography>
              </Field>
            </Box>
          </Box>

          <Divider />
          <Box sx={{ p: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Button variant="contained" startIcon={<Pencil size={16} />} onClick={() => actions.openEdit(credential)}>
              Edit
            </Button>
            <Button variant="outlined" color="error" startIcon={<Trash2 size={16} />} onClick={() => actions.confirmDelete(credential)}>
              Delete
            </Button>
            <Box sx={{ flex: 1 }} />
            <Tooltip title="Lock application">
              <Button variant="text" color="inherit" startIcon={<Lock size={16} />} onClick={onLock}>
                Lock
              </Button>
            </Tooltip>
          </Box>
        </>
      )}
    </Drawer>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Box>
      <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5 }}>
        {label}
      </Typography>
      {children}
    </Box>
  )
}
