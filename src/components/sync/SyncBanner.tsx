import { Box, Button, Collapse, Typography } from '@mui/material'
import { useState } from 'react'
import { useExcelSync } from '../../hooks/useExcelSync'
import { useSettings } from '../../store/SettingsContext'
import { AppButton } from '../common/AppButton'
import { ErrorMessage } from '../common/ErrorMessage'

interface SyncBannerProps {
  onChooseSource: () => void
}

/**
 * Explains sync problems inline, with the one action that fixes them.
 * Rendered above page content; hidden when everything is fine.
 */
export function SyncBanner({ onChooseSource }: SyncBannerProps) {
  const { sync, state, requestPermission, reconnectCloud, syncNow, reencryptNow, cancelKeyPrompt } = useExcelSync()
  const { settings } = useSettings()
  const [busy, setBusy] = useState(false)
  const [showIssues, setShowIssues] = useState(false)

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true)
    try {
      await fn()
    } finally {
      setBusy(false)
    }
  }

  const warnings = sync.issues.filter((i) => i.level === 'warning')
  const rowErrors = sync.issues.filter((i) => i.level === 'error')
  const needsEncryptionNotice = state.sourceFormat === 'plain' && settings.workbookFormat === 'encrypted' && sync.source && !sync.dirty
  const blocks: React.ReactNode[] = []

  if (sync.status === 'permission-required' && sync.source) {
    const cloud = sync.source.mode === 'cloud-graph'
    blocks.push(
      <ErrorMessage
        key="perm"
        severity="warning"
        title={cloud ? 'Reconnect to Microsoft' : `Permission needed for "${sync.source.name}"`}
        message={sync.error?.message}
        action={
          <>
            <AppButton variant="contained" size="small" loading={busy} onClick={() => void run(cloud ? reconnectCloud : requestPermission)}>
              {cloud ? 'Sign in again' : 'Grant access'}
            </AppButton>
            <Button size="small" color="inherit" onClick={onChooseSource}>
              Choose another workbook
            </Button>
          </>
        }
      />,
    )
  } else if (sync.status === 'failed' && sync.error) {
    const keyIssue = sync.error.code === 'key-unavailable'
    blocks.push(
      <ErrorMessage
        key="failed"
        title={titleFor(sync.error.code)}
        message={sync.error.message}
        details={sync.error.details}
        action={
          <>
            {keyIssue && state.keyPrompt === null ? null : keyIssue ? (
              <Button size="small" color="inherit" onClick={cancelKeyPrompt}>
                Dismiss
              </Button>
            ) : (
              <AppButton variant="contained" size="small" loading={busy} onClick={() => void run(syncNow)}>
                Retry
              </AppButton>
            )}
            <Button size="small" color="inherit" onClick={onChooseSource}>
              {sync.source ? 'Change workbook' : 'Choose workbook'}
            </Button>
          </>
        }
      />,
    )
  } else if (sync.status === 'offline') {
    blocks.push(<ErrorMessage key="offline" severity="warning" title="You are offline" message={sync.error?.message ?? 'Changes will sync when the connection returns.'} />)
  } else if (sync.status === 'pending' && !sync.source) {
    blocks.push(
      <ErrorMessage
        key="nosrc"
        severity="warning"
        title="Changes are not saved to a file yet"
        message="Your edits are held in memory for this session only. Connect a workbook to write them, or export a backup."
        action={
          <Button variant="contained" size="small" onClick={onChooseSource}>
            Connect a workbook
          </Button>
        }
      />,
    )
  } else if (sync.status === 'pending' && sync.source && sync.error) {
    blocks.push(<ErrorMessage key="pending-err" severity="warning" title="Changes pending" message={sync.error.message} action={<AppButton size="small" variant="contained" loading={busy} onClick={() => void run(syncNow)}>Try again</AppButton>} />)
  }

  if (state.decryptedWithForeignKey) {
    blocks.push(
      <ErrorMessage
        key="foreign"
        severity="warning"
        title="Opened with a different passphrase"
        message="The workbook is still encrypted with the old passphrase. Re-encrypt it with your current master password so it opens without prompts next time."
        action={
          <Button variant="contained" size="small" onClick={reencryptNow}>
            Re-encrypt now
          </Button>
        }
      />,
    )
  } else if (needsEncryptionNotice) {
    blocks.push(
      <ErrorMessage
        key="plain"
        severity="warning"
        title="This workbook stores plaintext passwords"
        message="KeyNest will convert it to the encrypted format on the next save. You can do that now."
        action={
          <Button variant="contained" size="small" onClick={reencryptNow}>
            Encrypt now
          </Button>
        }
      />,
    )
  }

  if (rowErrors.length) {
    blocks.push(<ErrorMessage key="rows" title={`${rowErrors.length} record${rowErrors.length === 1 ? '' : 's'} could not be read`} details={rowErrors.map((i) => i.message)} />)
  }

  if (warnings.length) {
    blocks.push(
      <Box key="warn" sx={{ px: 0.5 }}>
        <Button size="small" color="inherit" onClick={() => setShowIssues((v) => !v)} sx={{ color: 'text.secondary' }}>
          {showIssues ? 'Hide' : 'Show'} {warnings.length} workbook note{warnings.length === 1 ? '' : 's'}
        </Button>
        <Collapse in={showIssues}>
          <Box component="ul" sx={{ m: 0, mt: 0.5, pl: 2.5 }}>
            {warnings.map((w, i) => (
              <Typography key={i} component="li" variant="body2" color="text.secondary">
                {w.message}
              </Typography>
            ))}
          </Box>
        </Collapse>
      </Box>,
    )
  }

  if (!blocks.length) return null
  return <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mb: 3 }}>{blocks}</Box>
}

function titleFor(code: string): string {
  switch (code) {
    case 'file-not-found':
      return 'Workbook not found'
    case 'invalid-format':
      return 'The file is not a valid Excel workbook'
    case 'missing-columns':
      return 'Required columns are missing'
    case 'empty-file':
      return 'The workbook is empty'
    case 'network':
      return 'Network problem'
    case 'auth-expired':
      return 'Microsoft session expired'
    case 'key-unavailable':
      return 'Encryption key unavailable'
    case 'write-failed':
      return 'Changes could not be written'
    case 'write-unsupported':
      return 'Direct file writing is not available'
    default:
      return 'Synchronization failed'
  }
}
