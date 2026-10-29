import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Typography } from '@mui/material'
import { useMemo, useState } from 'react'
import { useVault } from '../../store/VaultContext'
import type { ConflictResolution } from '../../types/sync'
import { AppButton } from '../common/AppButton'

export function ConflictDialog() {
  const { state, resolveConflict } = useVault()
  const conflict = state.conflict
  const [busy, setBusy] = useState<ConflictResolution | null>(null)

  const summary = useMemo(() => {
    if (!conflict) return null
    const mine = new Map(conflict.mine.map((c) => [c.id, c]))
    const theirs = new Map(conflict.theirs.map((c) => [c.id, c]))
    let onlyMine = 0
    let onlyTheirs = 0
    let changed = 0
    for (const [id, c] of mine) {
      const other = theirs.get(id)
      if (!other) onlyMine += 1
      else if (other.updatedAt !== c.updatedAt || other.password !== c.password || other.username !== c.username) changed += 1
    }
    for (const id of theirs.keys()) if (!mine.has(id)) onlyTheirs += 1
    return { onlyMine, onlyTheirs, changed }
  }, [conflict])

  const choose = async (resolution: ConflictResolution) => {
    setBusy(resolution)
    try {
      await resolveConflict(resolution)
    } finally {
      setBusy(null)
    }
  }

  return (
    <Dialog open={conflict !== null} maxWidth="sm" fullWidth aria-labelledby="conflict-title">
      <DialogTitle id="conflict-title">The workbook changed outside KeyNest</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {state.sync.source?.name ?? 'The source file'} was modified while you had unsaved edits. Choose which version to keep. Nothing is written until you decide.
        </Typography>
        {conflict && summary && (
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5, mb: 1 }}>
            <Stat label="In this session" value={conflict.mine.length} hint={`${summary.onlyMine} only here · ${summary.changed} edited`} />
            <Stat label="In the file" value={conflict.theirs.length} hint={`${summary.onlyTheirs} only in file`} />
          </Box>
        )}
        <Box component="ul" sx={{ m: 0, pl: 2.5, color: 'text.secondary', fontSize: '0.8125rem', display: 'grid', gap: 0.5 }}>
          <li>
            <strong>Merge</strong> keeps every record from both; when the same record differs, the most recently updated one wins.
          </li>
          <li>
            <strong>Keep mine</strong> overwrites the file with this session's records.
          </li>
          <li>
            <strong>Use file</strong> discards this session's unsaved edits.
          </li>
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5, flexWrap: 'wrap', gap: 1 }}>
        <Button color="inherit" onClick={() => void choose('use-theirs')} disabled={busy !== null}>
          Use file
        </Button>
        <AppButton variant="outlined" loading={busy === 'keep-mine'} disabled={busy !== null} onClick={() => void choose('keep-mine')}>
          Keep mine
        </AppButton>
        <AppButton variant="contained" loading={busy === 'merge'} disabled={busy !== null} onClick={() => void choose('merge')}>
          Merge both
        </AppButton>
      </DialogActions>
    </Dialog>
  )
}

function Stat({ label, value, hint }: { label: string; value: number; hint: string }) {
  return (
    <Box sx={{ p: 1.5, borderRadius: 2.5, border: 1, borderColor: 'divider' }}>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="h3">{value}</Typography>
      <Typography variant="caption" color="text.secondary">
        {hint}
      </Typography>
    </Box>
  )
}
