import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

interface UiContextValue {
  sidebarCollapsed: boolean
  toggleSidebar: () => void
  mobileNavOpen: boolean
  setMobileNavOpen: (open: boolean) => void
  sourceDialogOpen: boolean
  openSourceDialog: () => void
  closeSourceDialog: () => void
}

const UiContext = createContext<UiContextValue | null>(null)
const SIDEBAR_KEY = 'kn.sidebar'

export function UiProvider({ children }: { children: ReactNode }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem(SIDEBAR_KEY) === 'collapsed'
    } catch {
      return false
    }
  })
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [sourceDialogOpen, setSourceDialogOpen] = useState(false)

  useEffect(() => {
    try {
      localStorage.setItem(SIDEBAR_KEY, sidebarCollapsed ? 'collapsed' : 'expanded')
    } catch {
      /* ignore */
    }
  }, [sidebarCollapsed])

  const toggleSidebar = useCallback(() => setSidebarCollapsed((v) => !v), [])
  const openSourceDialog = useCallback(() => setSourceDialogOpen(true), [])
  const closeSourceDialog = useCallback(() => setSourceDialogOpen(false), [])

  const value = useMemo<UiContextValue>(
    () => ({ sidebarCollapsed, toggleSidebar, mobileNavOpen, setMobileNavOpen, sourceDialogOpen, openSourceDialog, closeSourceDialog }),
    [sidebarCollapsed, toggleSidebar, mobileNavOpen, sourceDialogOpen, openSourceDialog, closeSourceDialog],
  )
  return <UiContext.Provider value={value}>{children}</UiContext.Provider>
}

export function useUi(): UiContextValue {
  const ctx = useContext(UiContext)
  if (!ctx) throw new Error('useUi must be used within UiProvider')
  return ctx
}
