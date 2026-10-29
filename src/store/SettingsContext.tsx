import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { DEFAULT_SETTINGS, loadSettings, saveSettings } from '../services/settingsService'
import type { AppSettings } from '../types/settings'
import { DEFAULT_CATEGORIES } from '../utils/constants'

interface SettingsContextValue {
  settings: AppSettings
  update: (patch: Partial<AppSettings>) => void
  reset: () => void
  /** Built-in categories followed by custom ones. */
  categories: string[]
  addCategory: (name: string) => boolean
  removeCategory: (name: string) => void
}

const SettingsContext = createContext<SettingsContextValue | null>(null)

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(() => loadSettings())

  useEffect(() => {
    saveSettings(settings)
  }, [settings])

  useEffect(() => {
    document.body.dataset.density = settings.density
  }, [settings.density])

  useEffect(() => {
    document.title = settings.appName
  }, [settings.appName])

  const update = useCallback((patch: Partial<AppSettings>) => {
    setSettings((prev) => ({ ...prev, ...patch }))
  }, [])

  const reset = useCallback(() => setSettings(DEFAULT_SETTINGS), [])

  const categories = useMemo(() => {
    const seen = new Set<string>(DEFAULT_CATEGORIES)
    const custom = settings.customCategories.filter((c) => {
      const key = c.trim()
      if (!key || seen.has(key)) return false
      seen.add(key)
      return true
    })
    return [...DEFAULT_CATEGORIES, ...custom]
  }, [settings.customCategories])

  const addCategory = useCallback(
    (name: string) => {
      const clean = name.trim().slice(0, 32)
      if (!clean) return false
      if (categories.some((c) => c.toLowerCase() === clean.toLowerCase())) return false
      setSettings((prev) => ({ ...prev, customCategories: [...prev.customCategories, clean] }))
      return true
    },
    [categories],
  )

  const removeCategory = useCallback((name: string) => {
    setSettings((prev) => ({
      ...prev,
      customCategories: prev.customCategories.filter((c) => c !== name),
      defaultCategory: prev.defaultCategory === name ? DEFAULT_SETTINGS.defaultCategory : prev.defaultCategory,
    }))
  }, [])

  const value = useMemo<SettingsContextValue>(
    () => ({ settings, update, reset, categories, addCategory, removeCategory }),
    [settings, update, reset, categories, addCategory, removeCategory],
  )

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext)
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider')
  return ctx
}
