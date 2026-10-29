import { Box, useMediaQuery, useTheme } from '@mui/material'
import { Outlet } from 'react-router-dom'
import { useIdleLock } from '../../hooks/useIdleLock'
import { CredentialActionsProvider } from '../../store/CredentialActionsContext'
import { useSettings } from '../../store/SettingsContext'
import { useUi } from '../../store/UiContext'
import { useVault } from '../../store/VaultContext'
import { ConflictDialog } from '../sync/ConflictDialog'
import { ImportDialog } from '../sync/ImportDialog'
import { KeyPromptDialog } from '../sync/KeyPromptDialog'
import { SourceSetupDialog } from '../sync/SourceSetupDialog'
import { SyncBanner } from '../sync/SyncBanner'
import { Header } from './Header'
import { MobileNavigation } from './MobileNavigation'
import { Sidebar } from './Sidebar'

export function AppLayout() {
  const theme = useTheme()
  const mobile = useMediaQuery(theme.breakpoints.down('md'))
  const { settings } = useSettings()
  const { lockApp } = useVault()
  const { sidebarCollapsed, toggleSidebar, sourceDialogOpen, openSourceDialog, closeSourceDialog } = useUi()

  useIdleLock(settings.autoLockMinutes, true, () => void lockApp())

  return (
    <CredentialActionsProvider>
      <Box sx={{ display: 'flex', height: '100dvh', overflow: 'hidden', bgcolor: 'background.default' }}>
        {!mobile && (
          <Box sx={{ flexShrink: 0, height: '100%' }}>
            <Sidebar collapsed={sidebarCollapsed} onToggleCollapse={toggleSidebar} />
          </Box>
        )}
        <MobileNavigation />
        <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', height: '100%' }}>
          <Header />
          <Box component="main" sx={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', px: { xs: 2, sm: 3, lg: 4 }, py: { xs: 2.5, sm: 3 } }}>
            <Box sx={{ maxWidth: 1240, mx: 'auto' }}>
              <SyncBanner onChooseSource={openSourceDialog} />
              <Outlet />
            </Box>
          </Box>
        </Box>
      </Box>
      <SourceSetupDialog open={sourceDialogOpen} onClose={closeSourceDialog} />
      <ConflictDialog />
      <KeyPromptDialog />
      <ImportDialog />
    </CredentialActionsProvider>
  )
}
