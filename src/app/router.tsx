import { Navigate, createBrowserRouter, useLocation } from 'react-router-dom'
import { AppLayout } from '../components/layout/AppLayout'
import { AllPasswordsPage } from '../pages/AllPasswordsPage'
import { CategoriesPage } from '../pages/CategoriesPage'
import { DashboardPage } from '../pages/DashboardPage'
import { FavoritesPage } from '../pages/FavoritesPage'
import { LoginPage } from '../pages/LoginPage'
import { NotFoundPage } from '../pages/NotFoundPage'
import { RecentlyUpdatedPage } from '../pages/RecentlyUpdatedPage'
import { SettingsPage } from '../pages/SettingsPage'
import { useAuth } from '../store/AuthContext'

/** Blocks every dashboard route until the master login succeeded. */
function ProtectedLayout() {
  const { state } = useAuth()
  const location = useLocation()
  if (state.status !== 'authenticated') {
    return <Navigate to="/login" replace state={{ from: `${location.pathname}${location.search}` }} />
  }
  return <AppLayout />
}

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    path: '/',
    element: <ProtectedLayout />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'passwords', element: <AllPasswordsPage /> },
      { path: 'favorites', element: <FavoritesPage /> },
      { path: 'categories', element: <CategoriesPage /> },
      { path: 'recent', element: <RecentlyUpdatedPage /> },
      { path: 'settings', element: <SettingsPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
], {
  // Matches Vite's `base` so routes work when hosted under a sub-path (GitHub Pages).
  basename: import.meta.env.BASE_URL.replace(/\/$/, '') || '/',
})
