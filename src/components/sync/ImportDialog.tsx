import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Radio,
  RadioGroup,
  Typography,
} from '@mui/material'
import { useEffect, useState } from 'react'
import { useVault } from '../../store/VaultContext'
import { AppButton } from '../common/AppButton'

/** Confirms a restore/import after validation, showing exactly what will change. */
export function ImportDialog() {
  const { state, applyImport, cancelImport } = useVault()
  const preview = state.importPreview
  const [mode, setMode] = useState<'merge' | 'replace'>('merge')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    setMode('merge')
    setBusy(false)
  }, [preview?.fileName])

  const apply = async () => {
    setBusy(true)
    try {
      await applyImport(mode)
    } finally {
      setBusy(false)
    }
  }

  const open = preview !== null && !preview.needsKey && state.keyPrompt === null
  const errors = preview?.issues.filter((i) => i.level === 'error') ?? []
  const warnings = preview?.issues.filter((i) => i.level === 'warning') ?? []
  const replaced = mode === 'replace' ? (preview?.counts.existing ?? 0) : (preview?.counts.overlapping ?? 0)

  return (
    <Dialog open={open} onClose={busy ? undefined : cancelImport} maxWidth="sm" fullWidth aria-labelledby="import-title">
      <DialogTitle id="import-title">Restore from {preview?.fileName}</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {preview && (
          <>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1.5 }}>
              <Stat label="In file" value={preview.counts.incoming} />
              <Stat label="Currently stored" value={preview.counts.existing} />
              <Stat label={mode === 'replace' ? 'Will be replaced' : 'Overlapping IDs'} value={replaced} />
            </Box>
            <Alert severity={preview.format === 'plain' ? 'warning' : 'info'} sx={{ py: 0.5 }}>
              {preview.format === 'plain'
                ? 'This is a plaintext workbook. Its contents will be encrypted when KeyNest saves to your source workbook.'
                : 'This is an encrypted KeyNest backup and has been decrypted successfully.'}
            </Alert>
            <RadioGroup value={mode} onChange={(e) => setMode(e.target.value as 'merge' | 'replace')}>
              <FormControlLabel value="merge" control={<Radio size="small" />} label={<Typography variant="body2">Merge: add new records, update overlapping ones if the backup is newer</Typography>} />
              <FormControlLabel value="replace" control={<Radio size="small" />} label={<Typography variant="body2">Replace: discard everything currently stored and use the file's records</Typography>} />
            </RadioGroup>
            {errors.length > 0 && (
              <Alert severity="error">
                {errors.length} record{errors.length === 1 ? '' : 's'} could not be read and will be skipped.
              </Alert>
            )}
            {warnings.length > 0 && (
              <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
                {warnings.map((w, i) => (
                  <Typography key={i} component="li" variant="caption" color="text.secondary">
                    {w.message}
                  </Typography>
                ))}
              </Box>
            )}
          </>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button color="inherit" onClick={cancelImport} disabled={busy}>
          Cancel
        </Button>
        <AppButton variant="contained" color={mode === 'replace' ? 'error' : 'primary'} loading={busy} onClick={() => void apply()} disabled={!preview?.credentials}>
          {mode === 'replace' ? `Replace ${preview?.counts.existing ?? 0} records` : `Merge ${preview?.counts.incoming ?? 0} records`}
        </AppButton>
      </DialogActions>
    </Dialog>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <Box sx={{ p: 1.5, borderRadius: 2.5, border: 1, borderColor: 'divider' }}>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
        {label}
      </Typography>
      <Typography variant="h3">{value}</Typography>
    </Box>
  )
}
