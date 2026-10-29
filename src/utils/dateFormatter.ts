const dateTime = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'short',
})
const dateOnly = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' })
const timeOnly = new Intl.DateTimeFormat(undefined, { timeStyle: 'short' })

function toDate(value: string | number | Date | null | undefined): Date | null {
  if (value === null || value === undefined || value === '') return null
  const d = value instanceof Date ? value : new Date(value)
  return Number.isNaN(d.getTime()) ? null : d
}

export function formatDateTime(value: string | number | Date | null | undefined): string {
  const d = toDate(value)
  return d ? dateTime.format(d) : '—'
}

export function formatDate(value: string | number | Date | null | undefined): string {
  const d = toDate(value)
  return d ? dateOnly.format(d) : '—'
}

export function formatTime(value: string | number | Date | null | undefined): string {
  const d = toDate(value)
  return d ? timeOnly.format(d) : '—'
}

export function formatRelative(value: string | number | Date | null | undefined): string {
  const d = toDate(value)
  if (!d) return 'never'
  const diff = Date.now() - d.getTime()
  const minutes = Math.round(diff / 60_000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours} h ago`
  const days = Math.round(hours / 24)
  if (days < 7) return `${days} d ago`
  return dateOnly.format(d)
}

export function isWithinDays(value: string, days: number): boolean {
  const d = toDate(value)
  if (!d) return false
  return Date.now() - d.getTime() <= days * 86_400_000
}

export function fileStamp(date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}${p(date.getMonth() + 1)}${p(date.getDate())}-${p(date.getHours())}${p(date.getMinutes())}`
}
