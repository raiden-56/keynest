import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, InputAdornment, TextField, Typography } from '@mui/material'
import { Eye, EyeOff } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { useVault } from '../../store/VaultContext'
import { AppButton } from '../common/AppButton'

/** Asks for the passphrase of a workbook that was encrypted with a different key than the session's. */
export function KeyPromptDialog() {
  const { state, submitPassphrase, cancelKeyPrompt } = useVault()
  const prompt = state.keyPrompt
  const [passphrase, setPassphrase] = useState('')
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setPassphrase('')
    setShow(false)
    setError(null)
    setBusy(false)
  }, [prompt?.fileName, prompt?.context])

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!passphrase) return
    setBusy(true)
    setError(null)
    const result = await submitPassphrase(passphrase)
    setBusy(false)
    if (!result.ok) {
      setError('That passphrase does not unlock this workbook.')
      setPassphrase('')
    }
  }

  return (
    <Dialog open={prompt !== null} onClose={busy ? undefined : cancelKeyPrompt} maxWidth="xs" fullWidth aria-labelledby="key-title" slotProps={{ paper: { component: 'form', onSubmit: submit } as never }}>
      <DialogTitle id="key-title">Workbook passphrase needed</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Typography variant="body2" color="text.secondary">
          <strong>{prompt?.fileName}</strong> was encrypted with a different passphrase, or on another device. Enter the master password that was used when it was saved. If it matches your current master password, KeyNest will remember the workbook's key settings so this does not happen again.
        </Typography>
        {error && <Alert severity="error">{error}</Alert>}
        <TextField
          label="Passphrase"
          type={show ? 'text' : 'password'}
          value={passphrase}
          onChange={(e) => setPassphrase(e.target.value)}
          autoFocus
          autoComplete="current-password"
          fullWidth
          slotProps={{
            input: {
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => setShow((v) => !v)} aria-label={show ? 'Hide passphrase' : 'Show passphrase'}>
                    {show ? <EyeOff size={18} /> : <Eye size={18} />}
                  </IconButton>
                </InputAdornment>
              ),
            },
          }}
        />
        <Typography variant="caption" color="text.secondary">
          Without the right passphrase the encrypted usernames, passwords and notes cannot be recovered.
        </Typography>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button color="inherit" onClick={cancelKeyPrompt} disabled={busy}>
          Cancel
        </Button>
        <AppButton type="submit" variant="contained" loading={busy} disabled={!passphrase}>
          Unlock workbook
        </AppButton>
      </DialogActions>
    </Dialog>
  )
}
