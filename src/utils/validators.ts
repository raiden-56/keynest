export function normalizeUrl(input: string): string {
  const trimmed = input.trim()
  if (!trimmed) return ''
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed)) return trimmed
  return `https://${trimmed}`
}

export function isValidUrl(input: string): boolean {
  const trimmed = input.trim()
  if (!trimmed) return false
  try {
    const url = new URL(normalizeUrl(trimmed))
    if (!['http:', 'https:'].includes(url.protocol)) return false
    // Require a plausible host: at least one dot or "localhost".
    return url.hostname === 'localhost' || url.hostname.includes('.')
  } catch {
    return false
  }
}

export function hostnameOf(url: string): string {
  try {
    return new URL(normalizeUrl(url)).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

export function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return '?'
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  return (words[0][0] + words[1][0]).toUpperCase()
}

/** Deterministic warm hue (in degrees) for avatar backgrounds. */
export function hueOf(text: string): number {
  let hash = 0
  for (let i = 0; i < text.length; i++) hash = (hash * 31 + text.charCodeAt(i)) | 0
  // Keep within warm/green hues (20°–160°) to stay on-palette.
  return 20 + (Math.abs(hash) % 140)
}
