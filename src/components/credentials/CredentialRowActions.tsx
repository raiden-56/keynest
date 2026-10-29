import { Box, IconButton, ListItemIcon, ListItemText, Menu, MenuItem, Tooltip } from '@mui/material'
import { Copy, Ellipsis, ExternalLink, KeyRound, Pencil, Star, Trash2, User } from 'lucide-react'
import { useState, type MouseEvent } from 'react'
import { useCredentialActions } from '../../store/CredentialActionsContext'
import type { Credential } from '../../types/credential'

interface CredentialRowActionsProps {
  credential: Credential
  /** Show only favorite + overflow menu (used on narrow layouts). */
  compact?: boolean
}

export function CredentialRowActions({ credential, compact }: CredentialRowActionsProps) {
  const actions = useCredentialActions()
  const [anchor, setAnchor] = useState<HTMLElement | null>(null)

  const stop = (e: MouseEvent) => e.stopPropagation()
  const run = (fn: () => void) => () => {
    setAnchor(null)
    fn()
  }

  const favorite = (
    <Tooltip title={credential.favorite ? 'Remove from favorites' : 'Add to favorites'}>
      <IconButton
        size="small"
        onClick={(e) => {
          stop(e)
          actions.toggleFavorite(credential)
        }}
        aria-pressed={credential.favorite}
        aria-label="Toggle favorite"
        sx={{
          color: credential.favorite ? 'warning.main' : undefined,
          '& svg': { transition: 'transform 180ms ease' },
          '&:active svg': { transform: 'scale(0.85)' },
        }}
      >
        <Star size={16} fill={credential.favorite ? 'currentColor' : 'none'} />
      </IconButton>
    </Tooltip>
  )

  return (
    <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.25 }} onClick={stop}>
      {!compact && (
        <>
          <Tooltip title="Copy username">
            <IconButton size="small" onClick={() => actions.copyUsername(credential)} aria-label="Copy username">
              <User size={16} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Copy password">
            <IconButton size="small" onClick={() => actions.copyPassword(credential)} aria-label="Copy password">
              <KeyRound size={16} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Open website">
            <span>
              <IconButton size="small" onClick={() => actions.openUrl(credential)} aria-label="Open website" disabled={!credential.url}>
                <ExternalLink size={16} />
              </IconButton>
            </span>
          </Tooltip>
        </>
      )}
      {favorite}
      <Tooltip title="More actions">
        <IconButton size="small" onClick={(e) => setAnchor(e.currentTarget)} aria-label="More actions" aria-haspopup="menu">
          <Ellipsis size={16} />
        </IconButton>
      </Tooltip>
      <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)} onClick={stop}>
        {compact && (
          <MenuItem onClick={run(() => actions.copyUsername(credential))}>
            <ListItemIcon>
              <User size={16} />
            </ListItemIcon>
            <ListItemText>Copy username</ListItemText>
          </MenuItem>
        )}
        {compact && (
          <MenuItem onClick={run(() => actions.copyPassword(credential))}>
            <ListItemIcon>
              <Copy size={16} />
            </ListItemIcon>
            <ListItemText>Copy password</ListItemText>
          </MenuItem>
        )}
        {compact && (
          <MenuItem onClick={run(() => actions.openUrl(credential))} disabled={!credential.url}>
            <ListItemIcon>
              <ExternalLink size={16} />
            </ListItemIcon>
            <ListItemText>Open website</ListItemText>
          </MenuItem>
        )}
        <MenuItem onClick={run(() => actions.openEdit(credential))}>
          <ListItemIcon>
            <Pencil size={16} />
          </ListItemIcon>
          <ListItemText>Edit</ListItemText>
        </MenuItem>
        <MenuItem onClick={run(() => actions.confirmDelete(credential))} sx={{ color: 'error.main' }}>
          <ListItemIcon sx={{ color: 'inherit' }}>
            <Trash2 size={16} />
          </ListItemIcon>
          <ListItemText>Delete</ListItemText>
        </MenuItem>
      </Menu>
    </Box>
  )
}
