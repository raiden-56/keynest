import {
  Alert,
  Box,
  Button,
  Checkbox,
  Divider,
  FormControlLabel,
  MenuItem,
  Paper,
  Switch,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material'
import { useColorScheme } from '@mui/material/styles'
import { Cloud, Download, FileCheck, FileDown, FileSpreadsheet, FileUp, HardDrive, Lock, LogOut, Monitor, Moon, RefreshCw, Sun, Unplug, Upload } from 'lucide-react'
import { useRef, useState, type ReactNode } from 'react'
import { AppButton } from '../components/common/AppButton'
import { ConfirmDialog } from '../components/common/ConfirmDialog'
import { MotionFade } from '../components/common/MotionFade'
import { useToast } from '../components/common/ToastProvider'
import { SyncStatusIndicator } from '../components/sync/SyncStatusIndicator'
import { useAuth } from '../store/AuthContext'
import { useSettings } from '../store/SettingsContext'
import { useUi } from '../store/UiContext'
import { useVault } from '../store/VaultContext'
import type { SyncError, ValidationIssue } from '../types/sync'
import { PAGE_SIZE_OPTIONS } from '../utils/constants'
import { formatDateTime } from '../utils/dateFormatter'
import { SORT_OPTIONS } from '../utils/filtering'

const LOCK_OPTIONS = [1, 5, 10, 15, 30, 60, 0]
const CLIPBOARD_OPTIONS = [0, 15, 30, 60, 120]
const REVEAL_OPTIONS = [0, 10, 20, 30, 60]

export function SettingsPage() {
  const { settings, update, categories } = useSettings()
  const { state: auth } = useAuth()
  const vault = useVault()
  const { openSourceDialog } = useUi()
  const toast = useToast()
  const { mode, setMode } = useColorScheme()
  const importInput = useRef<HTMLInputElement>(null)

  const [plainConfirm, setPlainConfirm] = useState(false)
  const [plainAck, setPlainAck] = useState(false)
  const [formatConfirm, setFormatConfirm] = useState(false)
  const [disconnectConfirm, setDisconnectConfirm] = useState(false)
  const [validation, setValidation] = useState<{ issues: ValidationIssue[]; count: number; format: string } | SyncError | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  const run = async (name: string, fn: () => Promise<unknown>) => {
    setBusy(name)
    try {
      await fn()
    } finally {
      setBusy(null)
    }
  }

  const sync = vault.state.sync

  return (
    <MotionFade>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, maxWidth: 820 }}>
        <Section title="General" description="Naming, defaults and how lists are displayed.">
          <Row label="Application name">
            <TextField size="small" value={settings.appName} onChange={(e) => update({ appName: e.target.value })} onBlur={(e) => !e.target.value.trim() && update({ appName: 'KeyNest' })} sx={{ width: 240 }} />
          </Row>
          <Row label="Default category">
            <TextField select size="small" value={categories.includes(settings.defaultCategory) ? settings.defaultCategory : categories[0]} onChange={(e) => update({ defaultCategory: e.target.value })} sx={{ width: 240 }}>
              {categories.map((c) => (
                <MenuItem key={c} value={c}>
                  {c}
                </MenuItem>
              ))}
            </TextField>
          </Row>
          <Row label="Default sorting">
            <TextField select size="small" value={settings.defaultSort} onChange={(e) => update({ defaultSort: e.target.value as typeof settings.defaultSort })} sx={{ width: 240 }}>
              {SORT_OPTIONS.map((s) => (
                <MenuItem key={s.value} value={s.value}>
                  {s.label}
                </MenuItem>
              ))}
            </TextField>
          </Row>
          <Row label="List layout" hint="Phones always use cards.">
            <ToggleButtonGroup size="small" exclusive value={settings.viewMode} onChange={(_, v) => v && update({ viewMode: v })}>
              <ToggleButton value="table">Table</ToggleButton>
              <ToggleButton value="cards">Cards</ToggleButton>
            </ToggleButtonGroup>
          </Row>
          <Row label="Rows per page">
            <TextField select size="small" value={settings.pageSize} onChange={(e) => update({ pageSize: Number(e.target.value) })} sx={{ width: 120 }}>
              {PAGE_SIZE_OPTIONS.map((n) => (
                <MenuItem key={n} value={n}>
                  {n}
                </MenuItem>
              ))}
            </TextField>
          </Row>
        </Section>

        <Section title="Security" description="Locking, clipboard hygiene and password visibility.">
          <Row label="Lock after inactivity">
            <TextField select size="small" value={settings.autoLockMinutes} onChange={(e) => update({ autoLockMinutes: Number(e.target.value) })} sx={{ width: 180 }}>
              {LOCK_OPTIONS.map((m) => (
                <MenuItem key={m} value={m}>
                  {m === 0 ? 'Never (not recommended)' : `${m} minute${m === 1 ? '' : 's'}`}
                </MenuItem>
              ))}
            </TextField>
          </Row>
          <Row label="Clear clipboard after" hint="Best effort: clipboard managers and synced clipboards may keep a copy.">
            <TextField select size="small" value={settings.clipboardClearSeconds} onChange={(e) => update({ clipboardClearSeconds: Number(e.target.value) })} sx={{ width: 180 }}>
              {CLIPBOARD_OPTIONS.map((s) => (
                <MenuItem key={s} value={s}>
                  {s === 0 ? 'Never' : `${s} seconds`}
                </MenuItem>
              ))}
            </TextField>
          </Row>
          <Row label="Hide revealed passwords after">
            <TextField select size="small" value={settings.revealTimeoutSeconds} onChange={(e) => update({ revealTimeoutSeconds: Number(e.target.value) })} sx={{ width: 180 }}>
              {REVEAL_OPTIONS.map((s) => (
                <MenuItem key={s} value={s}>
                  {s === 0 ? 'Never' : `${s} seconds`}
                </MenuItem>
              ))}
            </TextField>
          </Row>
          <Row label="Show password when opening details" hint="Lists always keep passwords masked; only one can be revealed at a time.">
            <Switch checked={settings.passwordsVisibleByDefault} onChange={(e) => update({ passwordsVisibleByDefault: e.target.checked })} />
          </Row>
          <Divider />
          <Row label="Session" hint={`Signed in as ${auth.username ?? '—'} · since ${formatDateTime(auth.signedInAt)}`}>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Button variant="outlined" color="inherit" startIcon={<Lock size={16} />} onClick={() => void vault.lockApp()}>
                Lock now
              </Button>
              <Button variant="outlined" color="inherit" startIcon={<LogOut size={16} />} onClick={vault.signOutApp}>
                Sign out
              </Button>
            </Box>
          </Row>
        </Section>

        <Section title="Excel integration" description="Where your credentials are stored and how they are synchronized.">
          <Row label="Current workbook">
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
              {sync.source ? (
                <>
                  {sync.source.mode === 'cloud-graph' ? <Cloud size={16} /> : <HardDrive size={16} />}
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {sync.source.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {sync.source.mode === 'local-handle' ? 'Local file (direct access)' : sync.source.mode === 'local-upload' ? 'Uploaded file (download to save)' : 'OneDrive / SharePoint'}
                  </Typography>
                </>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No workbook connected
                </Typography>
              )}
            </Box>
          </Row>
          <Row label="Status">
            <SyncStatusIndicator />
          </Row>
          <Row label="Last successful sync">
            <Typography variant="body2">{sync.lastSyncAt ? formatDateTime(sync.lastSyncAt) : 'Never'}</Typography>
          </Row>
          <Row label="Imported records">
            <Typography variant="body2">{sync.importedCount}</Typography>
          </Row>
          <Row label="Workbook format" hint="Encrypted is strongly recommended. Plaintext writes readable passwords into the file.">
            <TextField
              select
              size="small"
              value={settings.workbookFormat}
              onChange={(e) => (e.target.value === 'plain' ? setFormatConfirm(true) : update({ workbookFormat: 'encrypted' }))}
              sx={{ width: 240 }}
            >
              <MenuItem value="encrypted">Encrypted (AES-256-GCM)</MenuItem>
              <MenuItem value="plain">Plaintext (not recommended)</MenuItem>
            </TextField>
          </Row>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', pt: 0.5 }}>
            <AppButton variant="contained" startIcon={<RefreshCw size={16} />} loading={sync.status === 'syncing'} onClick={() => void vault.syncNow()} disabled={!sync.source}>
              Sync now
            </AppButton>
            <Button variant="outlined" color="inherit" startIcon={<FileSpreadsheet size={16} />} onClick={openSourceDialog}>
              {sync.source ? 'Change source file' : 'Choose source file'}
            </Button>
            {sync.source?.mode === 'cloud-graph' && (
              <AppButton variant="outlined" color="inherit" startIcon={<Cloud size={16} />} loading={busy === 'reconnect'} onClick={() => void run('reconnect', vault.reconnectCloud)}>
                Reconnect to Microsoft
              </AppButton>
            )}
            <AppButton
              variant="outlined"
              color="inherit"
              startIcon={<FileCheck size={16} />}
              loading={busy === 'validate'}
              disabled={!sync.source}
              onClick={() => void run('validate', async () => setValidation(await vault.validateSource()))}
            >
              Validate workbook
            </AppButton>
            {sync.source && (
              <Button variant="text" color="error" startIcon={<Unplug size={16} />} onClick={() => setDisconnectConfirm(true)}>
                Disconnect
              </Button>
            )}
          </Box>
          {validation && (
            <Alert severity={'code' in validation ? 'error' : validation.issues.some((i) => i.level === 'error') ? 'error' : 'success'} onClose={() => setValidation(null)}>
              {'code' in validation ? (
                validation.message
              ) : (
                <>
                  <strong>
                    {validation.count} record{validation.count === 1 ? '' : 's'} · {validation.format} format
                  </strong>
                  {validation.issues.length > 0 && (
                    <Box component="ul" sx={{ m: 0, mt: 0.5, pl: 2.5 }}>
                      {validation.issues.map((i, idx) => (
                        <li key={idx}>{i.message}</li>
                      ))}
                    </Box>
                  )}
                  {validation.issues.length === 0 && <Box>No issues found.</Box>}
                </>
              )}
            </Alert>
          )}
        </Section>

        <Section title="Backup & recovery" description="The workbook is your only copy. Keep encrypted backups somewhere safe.">
          <Alert severity="warning" sx={{ py: 0.5 }}>
            Encrypted backups can only be opened with the master password used when they were created. If you lose it, the credentials inside are unrecoverable.
          </Alert>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <AppButton variant="contained" startIcon={<Download size={16} />} loading={busy === 'backup'} onClick={() => void run('backup', () => vault.exportBackup('encrypted').then((ok) => ok && toast.success('Encrypted backup downloaded.')))}>
              Export encrypted backup
            </AppButton>
            <Button variant="outlined" color="inherit" startIcon={<FileUp size={16} />} onClick={() => importInput.current?.click()}>
              Restore from file
            </Button>
            <input
              ref={importInput}
              type="file"
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              hidden
              onChange={(e) => {
                const file = e.target.files?.[0]
                e.target.value = ''
                if (file) void vault.openImport(file)
              }}
            />
            <Button variant="text" color="inherit" startIcon={<FileDown size={16} />} onClick={() => void vault.downloadTemplate()}>
              Download template
            </Button>
            <Button variant="text" color="error" startIcon={<Upload size={16} />} onClick={() => setPlainConfirm(true)}>
              Export plaintext…
            </Button>
          </Box>
        </Section>

        <Section title="Appearance">
          <Row label="Theme">
            <ToggleButtonGroup size="small" exclusive value={mode ?? 'system'} onChange={(_, v) => v && setMode(v)}>
              <ToggleButton value="light" aria-label="Light theme">
                <Sun size={15} style={{ marginRight: 6 }} /> Light
              </ToggleButton>
              <ToggleButton value="dark" aria-label="Dark theme">
                <Moon size={15} style={{ marginRight: 6 }} /> Dark
              </ToggleButton>
              <ToggleButton value="system" aria-label="System theme">
                <Monitor size={15} style={{ marginRight: 6 }} /> System
              </ToggleButton>
            </ToggleButtonGroup>
          </Row>
          <Row label="Density">
            <ToggleButtonGroup size="small" exclusive value={settings.density} onChange={(_, v) => v && update({ density: v })}>
              <ToggleButton value="comfortable">Comfortable</ToggleButton>
              <ToggleButton value="compact">Compact</ToggleButton>
            </ToggleButtonGroup>
          </Row>
        </Section>

        <Section title="Security limitations">
          <Typography variant="body2" color="text.secondary">
            KeyNest runs entirely in your browser. The master login is verified against a hash that ships inside the JavaScript bundle, so anyone with access to the built files can attempt to crack it offline, and anyone who can modify the files can bypass the login screen. Encryption of the workbook (AES-256-GCM with a PBKDF2-derived key) protects the file at rest, but it cannot protect against a compromised browser or device. Treat this as a personal, local tool, not a production authentication system.
          </Typography>
        </Section>
      </Box>

      <ConfirmDialog
        open={plainConfirm}
        title="Export readable passwords?"
        description="The exported workbook will contain every username, password and note in plain text. Anyone who opens the file can read them. Store it securely and delete it when no longer needed."
        confirmLabel="Export plaintext"
        destructive
        confirmDisabled={!plainAck}
        loading={busy === 'plain'}
        onCancel={() => {
          setPlainConfirm(false)
          setPlainAck(false)
        }}
        onConfirm={() =>
          void run('plain', async () => {
            const ok = await vault.exportBackup('plain')
            if (ok) toast.warning('Plaintext export downloaded. It contains readable passwords.')
            setPlainConfirm(false)
            setPlainAck(false)
          })
        }
      >
        <FormControlLabel control={<Checkbox checked={plainAck} onChange={(e) => setPlainAck(e.target.checked)} size="small" />} label={<Typography variant="body2">I understand the file will contain readable passwords</Typography>} sx={{ mt: 1.5, ml: -1 }} />
      </ConfirmDialog>

      <ConfirmDialog
        open={formatConfirm}
        title="Switch the workbook to plaintext?"
        description="From the next save on, the source workbook will store usernames, passwords and notes unencrypted. This is only sensible if you fully control where the file lives."
        confirmLabel="Use plaintext"
        destructive
        onCancel={() => setFormatConfirm(false)}
        onConfirm={() => {
          update({ workbookFormat: 'plain' })
          setFormatConfirm(false)
        }}
      />

      <ConfirmDialog
        open={disconnectConfirm}
        title="Disconnect this workbook?"
        description="KeyNest will forget the link to the file. Nothing is deleted from disk; records currently loaded stay in memory until you lock or sign out."
        confirmLabel="Disconnect"
        destructive
        onCancel={() => setDisconnectConfirm(false)}
        onConfirm={() => {
          void vault.disconnectSource()
          setDisconnectConfirm(false)
        }}
      />
    </MotionFade>
  )
}

function Section({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <Paper component="section" sx={{ p: 'var(--kn-card-pad)', display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Box>
        <Typography variant="h3" component="h2">
          {title}
        </Typography>
        {description && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
            {description}
          </Typography>
        )}
      </Box>
      {children}
    </Paper>
  )
}

function Row({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <Box sx={{ display: 'flex', alignItems: { xs: 'flex-start', sm: 'center' }, justifyContent: 'space-between', gap: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Typography variant="body2" sx={{ fontWeight: 500 }}>
          {label}
        </Typography>
        {hint && (
          <Typography variant="caption" color="text.secondary">
            {hint}
          </Typography>
        )}
      </Box>
      <Box sx={{ flexShrink: 0, maxWidth: '100%' }}>{children}</Box>
    </Box>
  )
}
