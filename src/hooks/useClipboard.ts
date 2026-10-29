import { useCallback } from 'react'
import { useToast } from '../components/common/ToastProvider'
import { copyToClipboard } from '../services/clipboardService'
import { useSettings } from '../store/SettingsContext'

/** Copies values with toast feedback. Never includes the copied value in the message. */
export function useClipboard() {
  const toast = useToast()
  const { settings } = useSettings()

  const copy = useCallback(
    async (value: string, label: string) => {
      if (!value) {
        toast.info(`No ${label.toLowerCase()} to copy.`)
        return false
      }
      const result = await copyToClipboard(value, settings.clipboardClearSeconds)
      if (!result.ok) {
        toast.error(result.message ?? `Could not copy ${label.toLowerCase()}.`)
        return false
      }
      toast.success(result.willClear ? `${label} copied. Clipboard clears in ${settings.clipboardClearSeconds}s.` : `${label} copied.`)
      return true
    },
    [settings.clipboardClearSeconds, toast],
  )

  return {
    copyUsername: (value: string) => copy(value, 'Username'),
    copyPassword: (value: string) => copy(value, 'Password'),
    copyText: copy,
  }
}
