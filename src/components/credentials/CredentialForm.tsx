import {
  Alert,
  Box,
  Button,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  InputAdornment,
  MenuItem,
  Switch,
  TextField,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material'
import { Eye, EyeOff, Sparkles, X } from 'lucide-react'
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useSettings } from '../../store/SettingsContext'
import type { Credential, CredentialInput } from '../../types/credential'
import { isValidUrl, normalizeUrl } from '../../utils/validators'
import { AppButton } from '../common/AppButton'
import { PasswordGenerator } from './PasswordGenerator'
import { PasswordStrengthMeter } from './PasswordStrengthMeter'

interface CredentialFormProps {
  open: boolean
  mode: 'add' | 'edit'
  initial?: Credential | null
  existing: Credential[]
  onClose: () => void
  onSubmit: (input: CredentialInput) => Promise<void> | void
}

interface FormValues {
  appName: string
  url: string
  username: string
  password: string
  category: string
  notes: string
  favorite: boolean
}

type FormErrors = Partial<Record<keyof FormValues, string>>

const NEW_CATEGORY = '__new__'

export function CredentialForm({ open, mode, initial, existing, onClose, onSubmit }: CredentialFormProps) {
  const theme = useTheme()
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'))
  const { settings, categories, addCategory } = useSettings()

  const [values, setValues] = useState<FormValues>(() => emptyValues(settings.defaultCategory))
  const [errors, setErrors] = useState<FormErrors>({})
  const [showPassword, setShowPassword] = useState(false)
  const [showGenerator, setShowGenerator] = useState(false)
  const [newCategory, setNewCategory] = useState('')
  const [saving, setSaving] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setValues(initial ? { ...pick(initial) } : emptyValues(settings.defaultCategory))
    setErrors({})
    setShowPassword(false)
    setShowGenerator(false)
    setNewCategory('')
    setSaving(false)
    setSubmitError(null)
  }, [open, initial, settings.defaultCategory])

  const duplicate = useMemo(() => {
    const name = values.appName.trim().toLowerCase()
    const user = values.username.trim().toLowerCase()
    if (!name || !user) return null
    return existing.find((c) => c.id !== initial?.id && c.appName.trim().toLowerCase() === name && c.username.trim().toLowerCase() === user) ?? null
  }, [existing, initial?.id, values.appName, values.username])

  const set = <K extends keyof FormValues>(key: K, value: FormValues[K]) => {
    setValues((prev) => ({ ...prev, [key]: value }))
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }))
  }

  const validate = (): boolean => {
    const next: FormErrors = {}
    if (!values.appName.trim()) next.appName = 'Application name is required.'
    if (!values.username.trim()) next.username = 'Username or email is required.'
    if (!values.password) next.password = 'Password is required.'
    if (values.url.trim() && !isValidUrl(values.url)) next.url = 'Enter a valid website address, e.g. https://example.com.'
    if (values.category === NEW_CATEGORY && !newCategory.trim()) next.category = 'Enter a name for the new category.'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!validate()) return
    let category = values.category
    if (category === NEW_CATEGORY) {
      const clean = newCategory.trim()
      addCategory(clean)
      category = clean
    }
    setSaving(true)
    setSubmitError(null)
    try {
      await onSubmit({
        appName: values.appName.trim(),
        url: values.url.trim() ? normalizeUrl(values.url) : '',
        username: values.username.trim(),
        password: values.password,
        category,
        notes: values.notes.trim(),
        favorite: values.favorite,
      })
    } catch {
      setSubmitError('The credential could not be saved. Please try again.')
      setSaving(false)
    }
  }

  return (
    <Dialog
      open={open}
      onClose={saving ? undefined : onClose}
      fullScreen={fullScreen}
      maxWidth="sm"
      fullWidth
      aria-labelledby="credential-form-title"
      slotProps={{ paper: { component: 'form', onSubmit: handleSubmit, noValidate: true } as never }}
    >
      <DialogTitle id="credential-form-title" sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pr: 1.5 }}>
        {mode === 'add' ? 'Add password' : 'Edit password'}
        <IconButton onClick={onClose} aria-label="Close" disabled={saving} size="small">
          <X size={18} />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '8px !important' }}>
        {submitError && <Alert severity="error">{submitError}</Alert>}
        <TextField
          label="Application name"
          value={values.appName}
          onChange={(e) => set('appName', e.target.value)}
          error={Boolean(errors.appName)}
          helperText={errors.appName}
          required
          autoFocus
          fullWidth
          autoComplete="off"
        />
        <TextField
          label="Website URL"
          value={values.url}
          onChange={(e) => set('url', e.target.value)}
          error={Boolean(errors.url)}
          helperText={errors.url ?? 'Optional. The scheme is added automatically.'}
          placeholder="example.com/login"
          fullWidth
          autoComplete="off"
          inputMode="url"
        />
        <TextField
          label="Username or email"
          value={values.username}
          onChange={(e) => set('username', e.target.value)}
          error={Boolean(errors.username)}
          helperText={errors.username}
          required
          fullWidth
          autoComplete="off"
        />
        {duplicate && (
          <Alert severity="warning" sx={{ py: 0.5 }}>
            An entry for <strong>{duplicate.appName}</strong> with this username already exists.
          </Alert>
        )}
        <Box>
          <TextField
            label="Password"
            type={showPassword ? 'text' : 'password'}
            value={values.password}
            onChange={(e) => set('password', e.target.value)}
            error={Boolean(errors.password)}
            helperText={errors.password}
            required
            fullWidth
            autoComplete="new-password"
            slotProps={{
              input: {
                className: showPassword ? 'kn-mono' : undefined,
                endAdornment: (
                  <InputAdornment position="end">
                    <Tooltip title="Generate a secure password">
                      <IconButton onClick={() => setShowGenerator((v) => !v)} aria-label="Toggle password generator" size="small" color={showGenerator ? 'primary' : 'default'}>
                        <Sparkles size={18} />
                      </IconButton>
                    </Tooltip>
                    <IconButton onClick={() => setShowPassword((v) => !v)} aria-label={showPassword ? 'Hide password' : 'Show password'} size="small">
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </IconButton>
                  </InputAdornment>
                ),
              },
            }}
          />
          <PasswordStrengthMeter password={values.password} />
          <Collapse in={showGenerator} unmountOnExit>
            <Box sx={{ mt: 1.5, p: 2, borderRadius: 3, border: 1, borderColor: 'divider' }}>
              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1.5 }}>
                Password generator
              </Typography>
              <PasswordGenerator
                onUse={(pw) => {
                  set('password', pw)
                  setShowGenerator(false)
                }}
              />
            </Box>
          </Collapse>
        </Box>
        <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: values.category === NEW_CATEGORY ? { xs: '1fr', sm: '1fr 1fr' } : '1fr' }}>
          <TextField
            select
            label="Category"
            value={values.category}
            onChange={(e) => set('category', e.target.value)}
            error={Boolean(errors.category) && values.category !== NEW_CATEGORY}
            fullWidth
          >
            {categories.map((c) => (
              <MenuItem key={c} value={c}>
                {c}
              </MenuItem>
            ))}
            {!categories.includes(values.category) && values.category !== NEW_CATEGORY && values.category && (
              <MenuItem value={values.category}>{values.category}</MenuItem>
            )}
            <MenuItem value={NEW_CATEGORY} sx={{ fontWeight: 600, color: 'primary.main' }}>
              + New category…
            </MenuItem>
          </TextField>
          {values.category === NEW_CATEGORY && (
            <TextField
              label="New category name"
              value={newCategory}
              onChange={(e) => {
                setNewCategory(e.target.value)
                if (errors.category) setErrors((prev) => ({ ...prev, category: undefined }))
              }}
              error={Boolean(errors.category)}
              helperText={errors.category}
              fullWidth
              autoFocus
            />
          )}
        </Box>
        <TextField
          label="Notes"
          value={values.notes}
          onChange={(e) => set('notes', e.target.value)}
          multiline
          minRows={2}
          maxRows={6}
          fullWidth
          helperText="Optional. Notes are encrypted together with the password."
        />
        <FormControlLabel
          control={<Switch checked={values.favorite} onChange={(e) => set('favorite', e.target.checked)} />}
          label="Mark as favorite"
          sx={{ ml: -1 }}
        />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5, pt: 1 }}>
        <Button onClick={onClose} color="inherit" disabled={saving}>
          Cancel
        </Button>
        <AppButton type="submit" variant="contained" loading={saving}>
          {mode === 'add' ? 'Save password' : 'Save changes'}
        </AppButton>
      </DialogActions>
    </Dialog>
  )
}

function emptyValues(defaultCategory: string): FormValues {
  return { appName: '', url: '', username: '', password: '', category: defaultCategory, notes: '', favorite: false }
}

function pick(c: Credential): FormValues {
  return { appName: c.appName, url: c.url, username: c.username, password: c.password, category: c.category, notes: c.notes, favorite: c.favorite }
}
