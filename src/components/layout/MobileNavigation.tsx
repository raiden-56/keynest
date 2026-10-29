import { Drawer } from '@mui/material'
import { useUi } from '../../store/UiContext'
import { Sidebar } from './Sidebar'

/** Slide-out navigation drawer for phones and small tablets. */
export function MobileNavigation() {
  const { mobileNavOpen, setMobileNavOpen } = useUi()
  return (
    <Drawer
      open={mobileNavOpen}
      onClose={() => setMobileNavOpen(false)}
      slotProps={{ paper: { sx: { width: 'var(--kn-sidebar-width)', border: 0 } } }}
    >
      <Sidebar collapsed={false} onNavigate={() => setMobileNavOpen(false)} />
    </Drawer>
  )
}
