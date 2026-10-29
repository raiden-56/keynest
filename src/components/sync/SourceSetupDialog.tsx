import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material'
import { Cloud, FileDown, FilePlus, FolderOpen, HardDrive, Upload, X } from 'lucide-react'
import { useRef, useState } from 'react'
import { useVault } from '../../store/VaultContext'
import { AppButton } from '../common/AppButton'

interface SourceSetupDialogProps {
  open: boolean
  onClose: () => void
}

export function SourceSetupDialog({ open, onClose }: SourceSetupDialogProps) {
  const vault = useVault()
  const { supportsDirectFileAccess, cloudConfigured, sync } = vault.state
  const [tab, setTab] = useState<'local' | 'cloud'>('local')
  const [busy, setBusy] = useState<string | null>(null)
  const [cloudPath, setCloudPath] = useState('')
  const fileInput = useRef<HTMLInputElement>(null)

  const run = async (name: string, fn: () => Promise<boolean>) => {
    setBusy(name)
    try {
      const ok = await fn()
      if (ok) onClose()
    } finally {
      setBusy(null)
    }
  }

  return (
    <Dialog open={open} onClose={busy ? undefined : onClose} maxWidth="sm" fullWidth aria-labelledby="source-title">
      <DialogTitle id="source-title" sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pr: 1.5 }}>
        {sync.source ? 'Change workbook' : 'Connect your Excel workbook'}
        <IconButton size="small" onClick={onClose} aria-label="Close" disabled={Boolean(busy)}>
          <X size={18} />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ pt: '4px !important' }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          KeyNest keeps every credential in a single Excel file that you own. Choose where that file lives.
        </Typography>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Tab value="local" label="Local file" icon={<HardDrive size={16} />} iconPosition="start" />
          <Tab value="cloud" label="OneDrive / SharePoint" icon={<Cloud size={16} />} iconPosition="start" />
        </Tabs>

        {tab === 'local' && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {supportsDirectFileAccess ? (
              <>
                <Typography variant="body2">
                  This browser can keep a permitted link to the file, so KeyNest re-reads it on every launch and writes changes back directly.
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  <AppButton variant="contained" startIcon={<FolderOpen size={16} />} loading={busy === 'pick'} disabled={Boolean(busy)} onClick={() => void run('pick', vault.connectLocalFile)}>
                    Choose existing file
                  </AppButton>
                  <AppButton variant="outlined" startIcon={<FilePlus size={16} />} loading={busy === 'create'} disabled={Boolean(busy)} onClick={() => void run('create', vault.createLocalFile)}>
                    Create new workbook
                  </AppButton>
                </Box>
              </>
            ) : (
              <>
                <Alert severity="info">
                  This browser cannot reopen local files automatically. Upload the workbook; after changes, KeyNest downloads an updated copy for you to replace the original. Encrypted workbooks are cached locally so you do not need to re-upload on every visit. Chrome and Edge support direct file access.
                </Alert>
                <input
                  ref={fileInput}
                  type="file"
                  accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                  hidden
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    e.target.value = ''
                    if (file) void run('upload', () => vault.connectUpload(file))
                  }}
                />
                <AppButton variant="contained" startIcon={<Upload size={16} />} loading={busy === 'upload'} disabled={Boolean(busy)} onClick={() => fileInput.current?.click()} sx={{ alignSelf: 'flex-start' }}>
                  Upload workbook
                </AppButton>
              </>
            )}
            <Box sx={{ pt: 1, borderTop: 1, borderColor: 'divider' }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Starting from scratch? Download the template, fill it in Excel, then choose it here.
              </Typography>
              <Button size="small" variant="text" startIcon={<FileDown size={15} />} onClick={() => void vault.downloadTemplate()}>
                Download Excel template
              </Button>
            </Box>
          </Box>
        )}

        {tab === 'cloud' && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {cloudConfigured ? (
              <>
                <Typography variant="body2">
                  Sign in with your Microsoft account and point KeyNest at a workbook in OneDrive or SharePoint. Enter a OneDrive path such as{' '}
                  <code>Documents/keynest-vault.xlsx</code>, a sharing link, or a Graph item path.
                </Typography>
                <TextField
                  label="Workbook path or sharing link"
                  value={cloudPath}
                  onChange={(e) => setCloudPath(e.target.value)}
                  placeholder="Documents/keynest-vault.xlsx"
                  fullWidth
                  size="small"
                />
                <AppButton
                  variant="contained"
                  startIcon={<Cloud size={16} />}
                  loading={busy === 'cloud'}
                  disabled={Boolean(busy) || !cloudPath.trim()}
                  onClick={() => void run('cloud', () => vault.connectCloud(cloudPath.trim()))}
                  sx={{ alignSelf: 'flex-start' }}
                >
                  Sign in and connect
                </AppButton>
                <Typography variant="caption" color="text.secondary">
                  The file must already exist. Create it from the template and upload it to OneDrive first.
                </Typography>
              </>
            ) : (
              <Alert severity="info">
                Cloud mode needs a Microsoft Entra app registration. Set <code>VITE_MS_CLIENT_ID</code> in your <code>.env.local</code> file (see README) and restart the dev server.
              </Alert>
            )}
          </Box>
        )}
      </DialogContent>
    </Dialog>
  )
}
