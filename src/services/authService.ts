import type { LoginResult } from '../types/auth'
import { LOCKOUT_BASE_SECONDS, MAX_LOGIN_ATTEMPTS, STORAGE_KEYS } from '../utils/constants'
import { fromBase64, hexToBytes, pbkdf2Bits, sha256Bytes, timingSafeEqual } from './encryptionService'

type ParsedHash =
  | { kind: 'pbkdf2'; iterations: number; salt: Uint8Array<ArrayBuffer>; hash: Uint8Array<ArrayBuffer> }
  | { kind: 'sha256'; hash: Uint8Array<ArrayBuffer> }

export interface MasterConfig {
  username: string
  hash: ParsedHash
}

export type ConfigProblem = 'missing-username' | 'missing-hash' | 'invalid-hash'

/**
 * Built-in master login, used when VITE_MASTER_* is missing or unreadable.
 * Only a PBKDF2-SHA256 hash is stored here, never the password itself.
 * Regenerate with: npm run hash -- "password"
 */
const DEFAULT_MASTER = {
  username: 'ganeshmesta1234@gmail.com',
  hash: 'pbkdf2:310000:fWUJZ3QWuKHH8/NOO1+4fg==:HjNYP/05mVY6MFhhOUbRz9FYTCtWVAkxEkckOYnBYSc=',
}

/**
 * Accepted formats:
 *   pbkdf2:<iterations>:<salt b64>:<hash b64>   (preferred — no "$", which Vite would expand in .env files)
 *   pbkdf2$<iterations>$<salt b64>$<hash b64>   (legacy)
 *   sha256$<hex> or a bare 64-char hex digest
 */
function parseHash(raw: string): ParsedHash | null {
  const value = raw.trim()
  if (!value) return null
  if (value.startsWith('pbkdf2:') || value.startsWith('pbkdf2$')) {
    const separator = value.includes(':') ? ':' : '$'
    const [, iter, salt, hash] = value.split(separator)
    const iterations = Number(iter)
    if (!iterations || !salt || !hash) return null
    try {
      return { kind: 'pbkdf2', iterations, salt: fromBase64(salt), hash: fromBase64(hash) }
    } catch {
      return null
    }
  }
  const hex = value.startsWith('sha256$') ? value.slice(7) : value
  if (/^[0-9a-f]{64}$/i.test(hex)) return { kind: 'sha256', hash: hexToBytes(hex) }
  return null
}

export function getMasterConfig(): { config: MasterConfig | null; problem: ConfigProblem | null } {
  const username = (import.meta.env.VITE_MASTER_USERNAME ?? '').trim()
  const rawHash = import.meta.env.VITE_MASTER_PASSWORD_HASH ?? ''
  const envHash = rawHash.trim() ? parseHash(rawHash) : null
  if (username && envHash) return { config: { username, hash: envHash }, problem: null }

  // Environment not usable: fall back to the built-in login so the app always opens for its owner.
  const fallback = parseHash(DEFAULT_MASTER.hash)
  if (fallback) return { config: { username: DEFAULT_MASTER.username, hash: fallback }, problem: null }

  if (!username) return { config: null, problem: 'missing-username' }
  if (!rawHash.trim()) return { config: null, problem: 'missing-hash' }
  return { config: null, problem: 'invalid-hash' }
}

/** Checks a password against the configured master hash (no username check). */
export async function verifyMasterPassword(password: string): Promise<boolean> {
  const { config } = getMasterConfig()
  if (!config) return false
  const { hash } = config
  if (hash.kind === 'pbkdf2') {
    const computed = await pbkdf2Bits(password, hash.salt, hash.iterations, hash.hash.length)
    return timingSafeEqual(computed, hash.hash)
  }
  const computed = await sha256Bytes(password)
  return timingSafeEqual(computed, hash.hash)
}

// ---------------------------------------------------------------------------
// Lockout tracking (in memory for the lifetime of the page).
// ---------------------------------------------------------------------------
let failedAttempts = 0
let lockedUntil = 0

export function getLockout(): { lockedUntil: number; remainingAttempts: number } {
  return {
    lockedUntil: lockedUntil > Date.now() ? lockedUntil : 0,
    remainingAttempts: Math.max(0, MAX_LOGIN_ATTEMPTS - failedAttempts),
  }
}

export async function attemptLogin(username: string, password: string): Promise<LoginResult> {
  const now = Date.now()
  if (lockedUntil > now) {
    return { ok: false, message: 'Too many attempts. Please wait before trying again.', lockedUntil }
  }
  const { config, problem } = getMasterConfig()
  if (!config || problem) {
    return { ok: false, message: 'Master credentials are not configured. See the README for setup.' }
  }
  const usernameMatches = username.trim().toLowerCase() === config.username.toLowerCase()
  const passwordMatches = await verifyMasterPassword(password)
  if (usernameMatches && passwordMatches) {
    failedAttempts = 0
    lockedUntil = 0
    return { ok: true }
  }
  failedAttempts += 1
  if (failedAttempts >= MAX_LOGIN_ATTEMPTS) {
    const multiplier = 2 ** (failedAttempts - MAX_LOGIN_ATTEMPTS)
    lockedUntil = Date.now() + LOCKOUT_BASE_SECONDS * 1000 * Math.min(multiplier, 16)
    return { ok: false, message: 'Too many failed attempts.', lockedUntil }
  }
  const remaining = MAX_LOGIN_ATTEMPTS - failedAttempts
  return {
    ok: false,
    message: `That username and password don't match. ${remaining} attempt${remaining === 1 ? '' : 's'} left before a short lockout.`,
  }
}

// ---------------------------------------------------------------------------
// Session marker: only the username and timestamps are stored — never a password or key.
// ---------------------------------------------------------------------------
interface SessionMarker {
  username: string
  signedInAt: number
}

export function saveSessionMarker(username: string, remember: boolean) {
  const marker: SessionMarker = { username, signedInAt: Date.now() }
  try {
    const target = remember ? localStorage : sessionStorage
    const other = remember ? sessionStorage : localStorage
    target.setItem(STORAGE_KEYS.session, JSON.stringify(marker))
    other.removeItem(STORAGE_KEYS.session)
  } catch {
    /* storage unavailable */
  }
}

export function readSessionMarker(): SessionMarker | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEYS.session) ?? localStorage.getItem(STORAGE_KEYS.session)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<SessionMarker>
    if (typeof parsed.username !== 'string') return null
    return { username: parsed.username, signedInAt: Number(parsed.signedInAt) || Date.now() }
  } catch {
    return null
  }
}

export function clearSessionMarker() {
  try {
    sessionStorage.removeItem(STORAGE_KEYS.session)
    localStorage.removeItem(STORAGE_KEYS.session)
  } catch {
    /* ignore */
  }
}
