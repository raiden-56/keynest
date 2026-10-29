import { Box, IconButton, List, ListItemButton, ListItemIcon, ListItemText, Tooltip, Typography } from '@mui/material'
import { Clock, Folders, KeyRound, LayoutDashboard, Lock, PanelLeft, PanelLeftClose, Settings, Star, type LucideIcon } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '../../store/AuthContext'
import { useSettings } from '../../store/SettingsContext'
import { useVault } from '../../store/VaultContext'
import { formatRelative } from '../../utils/dateFormatter'
import { initialsOf } from '../../utils/validators'
import { KeyNestLogo } from '../common/KeyNestLogo'
import { SyncStatusIndicator } from '../sync/SyncStatusIndicator'

export const NAV: { label: string; path: string; icon: LucideIcon; end?: boolean }[] = [
  { label: 'Dashboard', path: '/', icon: LayoutDashboard, end: true },
  { label: 'All Passwords', path: '/passwords', icon: KeyRound },
  { label: 'Favorites', path: '/favorites', icon: Star },
  { label: 'Categories', path: '/categories', icon: Folders },
  { label: 'Recently Updated', path: '/recent', icon: Clock },
  { label: 'Settings', path: '/settings', icon: Settings },
]

interface SidebarProps {
  collapsed: boolean
  onToggleCollapse?: () => void
  onNavigate?: () => void
}

export function Sidebar({ collapsed, onToggleCollapse, onNavigate }: SidebarProps) {
  const { state: auth } = useAuth()
  const { settings } = useSettings()
  const { state: vault, lockApp } = useVault()

  return (
    <Box
      component="nav"
      aria-label="Main navigation"
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'background.paper',
        borderRight: 1,
        borderColor: 'divider',
        width: collapsed ? 'var(--kn-sidebar-collapsed)' : 'var(--kn-sidebar-width)',
        transition: 'width 220ms cubic-bezier(0.2, 0, 0, 1)',
        overflow: 'hidden',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'space-between', px: collapsed ? 0 : 2, height: 'var(--kn-header-height)', flexShrink: 0 }}>
        <KeyNestLogo size={30} showName={!collapsed} name={settings.appName} />
        {onToggleCollapse && !collapsed && (
          <Tooltip title="Collapse sidebar" placement="right">
            <IconButton size="small" onClick={onToggleCollapse} aria-label="Collapse sidebar">
              <PanelLeftClose size={18} />
            </IconButton>
          </Tooltip>
        )}
      </Box>

      {onToggleCollapse && collapsed && (
        <Box sx={{ display: 'flex', justifyContent: 'center', pb: 1 }}>
          <Tooltip title="Expand sidebar" placement="right">
            <IconButton size="small" onClick={onToggleCollapse} aria-label="Expand sidebar">
              <PanelLeft size={18} />
            </IconButton>
          </Tooltip>
        </Box>
      )}

      {/* flex: 1 pushes the footer down; justifyContent keeps items packed at the top. */}
      <List sx={{ px: 1.25, py: 0.5, flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', gap: 0.25 }}>
        {NAV.map((item) => {
          const Icon = item.icon
          return (
            <MaybeTooltip key={item.path} title={item.label} enabled={collapsed}>
              <ListItemButton
                component={NavLink}
                to={item.path}
                end={item.end}
                onClick={onNavigate}
                sx={{
                  // MUI's ListItemButton sets flex-grow: 1, which made each item stretch to fill the column.
                  flexGrow: 0,
                  minHeight: 40,
                  px: collapsed ? 0 : 1.5,
                  py: 0.75,
                  justifyContent: collapsed ? 'center' : 'flex-start',
                  color: 'text.secondary',
                  '&.active': { bgcolor: 'action.selected', color: 'primary.main', '& .MuiListItemText-primary': { fontWeight: 600 } },
                  '&:hover': { color: 'text.primary' },
                }}
              >
                <ListItemIcon sx={{ minWidth: collapsed ? 0 : 34, color: 'inherit', justifyContent: 'center' }}>
                  <Icon size={19} strokeWidth={1.9} />
                </ListItemIcon>
                {!collapsed && <ListItemText primary={item.label} slotProps={{ primary: { variant: 'body2', noWrap: true } }} />}
              </ListItemButton>
            </MaybeTooltip>
          )
        })}
      </List>

      <Box sx={{ borderTop: 1, borderColor: 'divider', p: collapsed ? 1 : 1.5, display: 'flex', flexDirection: 'column', gap: 1, alignItems: collapsed ? 'center' : 'stretch' }}>
        {collapsed ? (
          <SyncStatusIndicator dotOnly />
        ) : (
          <Box sx={{ px: 0.5 }}>
            <SyncStatusIndicator compact />
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25 }}>
              Last sync: {vault.sync.lastSyncAt ? formatRelative(vault.sync.lastSyncAt) : 'never'}
            </Typography>
          </Box>
        )}

        <MaybeTooltip title="Lock application" enabled={collapsed}>
          <ListItemButton
            onClick={() => void lockApp()}
            aria-label={collapsed ? 'Lock application' : undefined}
            sx={{ flexGrow: 0, minHeight: 38, px: collapsed ? 0 : 1.5, py: 0.75, justifyContent: collapsed ? 'center' : 'flex-start', color: 'text.secondary' }}
          >
            <ListItemIcon sx={{ minWidth: collapsed ? 0 : 34, color: 'inherit', justifyContent: 'center' }}>
              <Lock size={18} />
            </ListItemIcon>
            {!collapsed && <ListItemText primary="Lock application" slotProps={{ primary: { variant: 'body2' } }} />}
          </ListItemButton>
        </MaybeTooltip>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, px: collapsed ? 0 : 1, pt: 0.5 }}>
          <Box
            aria-hidden
            sx={{ width: 32, height: 32, borderRadius: '10px', display: 'grid', placeItems: 'center', bgcolor: 'primary.main', color: 'primary.contrastText', fontSize: 12, fontWeight: 700, flexShrink: 0 }}
          >
            {initialsOf(auth.username ?? 'Me')}
          </Box>
          {!collapsed && (
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="body2" sx={{ fontWeight: 600 }} className="kn-truncate">
                {auth.username}
              </Typography>
              <Typography variant="caption" color="text.secondary" className="kn-truncate" sx={{ display: 'block' }}>
                {vault.sync.source?.name ?? 'No workbook connected'}
              </Typography>
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  )
}

/**
 * Wraps children in a Tooltip only when needed. MUI's Tooltip copies a string title into
 * `aria-label`, so an empty title would erase the accessible name of the wrapped link.
 */
function MaybeTooltip({ title, enabled, children }: { title: string; enabled: boolean; children: React.ReactElement }) {
  if (!enabled) return children
  return (
    <Tooltip title={title} placement="right">
      {children}
    </Tooltip>
  )
}
