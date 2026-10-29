import {
  Alert,
  Box,
  Button,
  Checkbox,
  FormControlLabel,
  IconButton,
  InputAdornment,
  Paper,
  TextField,
  Typography,
} from '@mui/material'
import { Eye, EyeOff, ShieldAlert } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { AppButton } from '../components/common/AppButton'
import { KeyNestLogo } from '../components/common/KeyNestLogo'
import { MotionFade } from '../components/common/MotionFade'
import { useAuth } from '../store/AuthContext'
import { useSettings } from '../store/SettingsContext'
import { useVault } from '../store/VaultContext'

export function LoginPage() {
  const { state, configProblem, login, unlock, signOut } = useAuth()
  const { settings } = useSettings()
  const vault = useVault()
  const location = useLocation()
  const locked = state.status === 'locked'

  const [username, setUsername] = useState(state.username ?? '')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [remember, setRemember] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lockedUntil, setLockedUntil] = useState(0)
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (!lockedUntil) return
    const timer = setInterval(() => setNow(Date.now()), 500)
    return () => clearInterval(timer)
  }, [lockedUntil])

  useEffect(() => {
    if (locked && state.username) setUsername(state.username)
  }, [locked, state.username])

  if (state.status === 'authenticated') {
    const from = (location.state as { from?: string } | null)?.from ?? '/'
    return <Navigate to={from} replace />
  }

  const remaining = Math.max(0, Math.ceil((lockedUntil - now) / 1000))
  const countingDown = remaining > 0

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (busy || countingDown) return
    setBusy(true)
    setError(null)
    try {
      const result = locked ? await unlock(password) : await login(username, password, remember)
      if (!result.ok) {
        setError(result.message ?? 'Sign-in failed.')
        if (result.lockedUntil) setLockedUntil(result.lockedUntil)
        setPassword('')
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <Box sx={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', p: 2, bgcolor: 'background.default' }}>
      <MotionFade style={{ width: '100%', maxWidth: 400 }}>
        <Paper component="form" onSubmit={submit} noValidate sx={{ p: { xs: 3, sm: 4 }, display: 'flex', flexDirection: 'column', gap: 2.25 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5, textAlign: 'center' }}>
            <KeyNestLogo size={44} showName={false} />
            <Box>
              <Typography variant="h2" component="h1" sx={{ mb: 0.5 }}>
                {locked ? 'Welcome back' : `Welcome back to ${settings.appName}`}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {locked ? 'Enter your master password to unlock.' : 'Sign in with your master credentials.'}
              </Typography>
            </Box>
          </Box>

          {configProblem && (
            <Alert severity="error" icon={<ShieldAlert size={18} />}>
              Master credentials are not configured. Copy <code>.env.example</code> to <code>.env.local</code> and set <code>VITE_MASTER_USERNAME</code> and <code>VITE_MASTER_PASSWORD_HASH</code>, then restart the dev server.
            </Alert>
          )}

          {vault.state.hasParkedChanges && (
            <Alert severity="info" sx={{ py: 0.5 }}>
              Unsaved changes are held encrypted in memory and will be restored after you unlock.
            </Alert>
          )}

          <TextField
            label="Master username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            autoFocus={!locked}
            fullWidth
            disabled={locked}
            slotProps={{ input: { readOnly: locked } }}
          />
          <TextField
            label="Master password"
            type={show ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            autoFocus={locked}
            fullWidth
            error={Boolean(error)}
            slotProps={{
              input: {
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={() => setShow((v) => !v)} aria-label={show ? 'Hide password' : 'Show password'} edge="end" size="small">
                      {show ? <EyeOff size={18} /> : <Eye size={18} />}
                    </IconButton>
                  </InputAdornment>
                ),
              },
            }}
          />

          {error && (
            <Alert severity="error" sx={{ py: 0.5 }} role="alert">
              {countingDown ? `Too many attempts. Try again in ${remaining}s.` : error}
            </Alert>
          )}

          {!locked && (
            <FormControlLabel
              control={<Checkbox checked={remember} onChange={(e) => setRemember(e.target.checked)} size="small" />}
              label={<Typography variant="body2">Remember this session on this device</Typography>}
              sx={{ ml: -1, mt: -1 }}
            />
          )}

          <AppButton type="submit" variant="contained" size="large" loading={busy} disabled={countingDown || !password || (!locked && !username) || Boolean(configProblem)}>
            {countingDown ? `Locked (${remaining}s)` : locked ? 'Unlock' : 'Sign in'}
          </AppButton>

          {locked && (
            <Button variant="text" color="inherit" size="small" onClick={signOut} sx={{ color: 'text.secondary', alignSelf: 'center' }}>
              Not {state.username}? Sign in with a different account
            </Button>
          )}

          <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center', mt: 0.5 }}>
            Local prototype: the master login is checked in your browser against a hash bundled with the app. It is not production-grade authentication.
          </Typography>
        </Paper>
      </MotionFade>
    </Box>
  )
}
