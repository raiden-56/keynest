export interface CopyResult {
  ok: boolean
  message?: string
  /** True when a best-effort clipboard clear has been scheduled. */
  willClear: boolean
}

let clearTimer: ReturnType<typeof setTimeout> | null = null
let lastCopied: string | null = null

/**
 * Copies text to the clipboard and schedules a best-effort clear.
 * Clearing cannot remove entries from clipboard managers or synced clipboards.
 */
export async function copyToClipboard(text: string, clearAfterSeconds: number): Promise<CopyResult> {
  if (!navigator.clipboard?.writeText) {
    return { ok: false, message: 'Clipboard access is not available in this browser.', willClear: false }
  }
  try {
    await navigator.clipboard.writeText(text)
  } catch {
    return { ok: false, message: 'Clipboard permission was denied by the browser.', willClear: false }
  }
  lastCopied = text
  if (clearTimer) clearTimeout(clearTimer)
  if (clearAfterSeconds > 0) {
    clearTimer = setTimeout(() => void clearClipboardIfUnchanged(), clearAfterSeconds * 1000)
    return { ok: true, willClear: true }
  }
  return { ok: true, willClear: false }
}

/** Clears the clipboard only if it still holds the value we copied (when readable). */
export async function clearClipboardIfUnchanged(): Promise<void> {
  clearTimer = null
  if (lastCopied === null) return
  const expected = lastCopied
  lastCopied = null
  try {
    if (navigator.clipboard?.readText && document.hasFocus()) {
      const current = await navigator.clipboard.readText()
      if (current !== expected) return
    }
    await navigator.clipboard.writeText('')
  } catch {
    // Permission denied or document not focused; clearing is best-effort only.
  }
}

export function cancelScheduledClear() {
  if (clearTimer) clearTimeout(clearTimer)
  clearTimer = null
  lastCopied = null
}
