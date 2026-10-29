import {
  Box,
  Button,
  Divider,
  IconButton,
  InputAdornment,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  TextField,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material'
import { Lock, LogOut, Menu as MenuIcon, Plus, RefreshCw, Search, Settings, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../store/AuthContext'
import { useCredentialActions } from '../../store/CredentialActionsContext'
import { useUi } from '../../store/UiContext'
import { useVault } from '../../store/VaultContext'
import { initialsOf } from '../../utils/validators'
import { NAV } from './Sidebar'

const LIST_PATHS = new Set(['/passwords', '/favorites', '/recent', '/categories'])

export function Header() {
  const theme = useTheme()
  const mobile = useMediaQuery(theme.breakpoints.down('md'))
  const location = useLocation()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const { state: auth } = useAuth()
  const { state: vault, syncNow, lockApp, signOutApp } = useVault()
  const { setMobileNavOpen } = useUi()
  const actions = useCredentialActions()
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null)
  const [query, setQuery] = useState(params.get('q') ?? '')
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null)

  const title = NAV.find((n) => (n.end ? n.path === location.pathname : location.pathname.startsWith(n.path)))?.label ?? 'KeyNest'
  const onListPage = LIST_PATHS.has(location.pathname)

  // Keep the input in sync when the URL changes (e.g. Clear filters).
  useEffect(() => {
    setQuery(params.get('q') ?? '')
  }, [params])

  const applySearch = (value: string) => {
    setQuery(value)
    if (debounce.current) clearTimeout(debounce.current)
    debounce.current = setTimeout(() => {
      const next = new URLSearchParams(onListPage ? params : undefined)
      if (value.trim()) next.set('q', value.trim())
      else next.delete('q')
      navigate({ pathname: onListPage ? location.pathname : '/passwords', search: next.toString() }, { replace: onListPage })
    }, 180)
  }

  const busy = vault.sync.status === 'syncing'

  return (
    <Box
      component="header"
      sx={{
        height: 'var(--kn-header-height)',
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        px: { xs: 1.5, sm: 2.5, md: 3 },
        borderBottom: 1,
        borderColor: 'divider',
        bgcolor: 'background.paper',
        position: 'sticky',
        top: 0,
        zIndex: (t) => t.zIndex.appBar,
      }}
    >
      {mobile && (
        <IconButton onClick={() => setMobileNavOpen(true)} aria-label="Open navigation" edge="start">
          <MenuIcon size={20} />
        </IconButton>
      )}
      <Typography variant="h3" component="h1" sx={{ whiteSpace: 'nowrap', mr: 1, display: { xs: 'none', sm: 'block' } }}>
        {title}
      </Typography>

      <TextField
        size="small"
        placeholder="Search accounts…"
        value={query}
        onChange={(e) => applySearch(e.target.value)}
        sx={{ flex: 1, maxWidth: 420, ml: 'auto', minWidth: 0 }}
        slotProps={{
          htmlInput: { 'aria-label': 'Search credentials', type: 'search', enterKeyHint: 'search' },
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <Search size={16} />
              </InputAdornment>
            ),
            endAdornment: query ? (
              <InputAdornment position="end">
                <IconButton size="small" aria-label="Clear search" onClick={() => applySearch('')}>
                  <X size={14} />
                </IconButton>
              </InputAdornment>
            ) : null,
          },
        }}
      />

      <Tooltip title={vault.sync.source ? 'Sync now' : 'No workbook connected'}>
        <span>
          <IconButton onClick={() => void syncNow()} disabled={busy} aria-label="Sync now" sx={{ display: { xs: 'inline-flex', md: 'none' } }}>
            <RefreshCw size={18} className={busy ? 'kn-spin' : undefined} />
          </IconButton>
          <Button
            variant="outlined"
            color="inherit"
            startIcon={<RefreshCw size={16} style={busy ? { animation: 'kn-spin 1s linear infinite' } : undefined} />}
            onClick={() => void syncNow()}
            disabled={busy}
            sx={{ display: { xs: 'none', md: 'inline-flex' } }}
          >
            {busy ? 'Syncing…' : 'Sync now'}
          </Button>
        </span>
      </Tooltip>

      <Button variant="contained" startIcon={<Plus size={16} />} onClick={actions.openAdd} sx={{ display: { xs: 'none', sm: 'inline-flex' }, whiteSpace: 'nowrap' }}>
        Add password
      </Button>
      <IconButton color="primary" onClick={actions.openAdd} aria-label="Add password" sx={{ display: { xs: 'inline-flex', sm: 'none' }, bgcolor: 'primary.main', color: 'primary.contrastText', '&:hover': { bgcolor: 'primary.dark', color: 'primary.contrastText' } }}>
        <Plus size={18} />
      </IconButton>

      <Tooltip title="Account">
        <IconButton onClick={(e) => setMenuAnchor(e.currentTarget)} aria-label="Account menu" aria-haspopup="menu" sx={{ p: 0.5 }}>
          <Box sx={{ width: 30, height: 30, borderRadius: '9px', display: 'grid', placeItems: 'center', bgcolor: 'action.hover', color: 'text.primary', fontSize: 11, fontWeight: 700 }}>
            {initialsOf(auth.username ?? 'Me')}
          </Box>
        </IconButton>
      </Tooltip>
      <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={() => setMenuAnchor(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} transformOrigin={{ vertical: 'top', horizontal: 'right' }}>
        <Box sx={{ px: 1.5, py: 1 }}>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {auth.username}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Master account
          </Typography>
        </Box>
        <Divider sx={{ my: 0.5 }} />
        <MenuItem
          onClick={() => {
            setMenuAnchor(null)
            navigate('/settings')
          }}
        >
          <ListItemIcon>
            <Settings size={16} />
          </ListItemIcon>
          <ListItemText>Settings</ListItemText>
        </MenuItem>
        <MenuItem
          onClick={() => {
            setMenuAnchor(null)
            void lockApp()
          }}
        >
          <ListItemIcon>
            <Lock size={16} />
          </ListItemIcon>
          <ListItemText>Lock application</ListItemText>
        </MenuItem>
        <MenuItem
          onClick={() => {
            setMenuAnchor(null)
            signOutApp()
          }}
        >
          <ListItemIcon>
            <LogOut size={16} />
          </ListItemIcon>
          <ListItemText>Sign out</ListItemText>
        </MenuItem>
      </Menu>
    </Box>
  )
}
