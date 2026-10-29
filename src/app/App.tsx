import CssBaseline from '@mui/material/CssBaseline'
import { ThemeProvider } from '@mui/material/styles'
import { RouterProvider } from 'react-router-dom'
import { ToastProvider } from '../components/common/ToastProvider'
import { AuthProvider } from '../store/AuthContext'
import { SettingsProvider } from '../store/SettingsContext'
import { UiProvider } from '../store/UiContext'
import { VaultProvider } from '../store/VaultContext'
import { theme } from '../theme/theme'
import { router } from './router'

export function App() {
  return (
    <ThemeProvider theme={theme} defaultMode="system" modeStorageKey="kn-mode" colorSchemeStorageKey="kn-color-scheme" noSsr>
      <CssBaseline enableColorScheme />
      <ToastProvider>
        <SettingsProvider>
          <AuthProvider>
            <VaultProvider>
              <UiProvider>
                <RouterProvider router={router} />
              </UiProvider>
            </VaultProvider>
          </AuthProvider>
        </SettingsProvider>
      </ToastProvider>
    </ThemeProvider>
  )
}
