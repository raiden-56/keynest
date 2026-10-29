import { PBKDF2_ITERATIONS, STORAGE_KEYS } from '../utils/constants'
import { deriveVaultKey, fromBase64, randomBytes, toBase64 } from './encryptionService'

/**
 * Holds the session's vault encryption key in memory only.
 * The key is a non-extractable CryptoKey; the master password itself is never retained.
 */
export interface KdfParams {
  /** base64 */
  salt: string
  iterations: number
}

interface KeyringState {
  key: CryptoKey
  params: KdfParams
}

let state: KeyringState | null = null

export const keyring = {
  has(): boolean {
    return state !== null
  },
  get(): CryptoKey | null {
    return state?.key ?? null
  },
  params(): KdfParams | null {
    return state?.params ?? null
  },
  set(key: CryptoKey, params: KdfParams) {
    state = { key, params }
  },
  clear() {
    state = null
  },
}

/** Loads the persisted (non-secret) KDF parameters, creating fresh ones if absent. */
export function loadOrCreateKdfParams(): KdfParams {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.kdf)
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<KdfParams>
      if (typeof parsed.salt === 'string' && typeof parsed.iterations === 'number' && parsed.iterations >= 100_000) {
        return { salt: parsed.salt, iterations: parsed.iterations }
      }
    }
  } catch {
    /* fall through to create */
  }
  const params: KdfParams = { salt: toBase64(randomBytes(16)), iterations: PBKDF2_ITERATIONS }
  persistKdfParams(params)
  return params
}

export function persistKdfParams(params: KdfParams) {
  try {
    localStorage.setItem(STORAGE_KEYS.kdf, JSON.stringify(params))
  } catch {
    /* storage unavailable */
  }
}

export async function deriveKeyForParams(password: string, params: KdfParams): Promise<CryptoKey> {
  return deriveVaultKey(password, fromBase64(params.salt), params.iterations)
}

/** Derives the session key from the master password and stores it in the keyring. */
export async function unlockKeyring(password: string, params = loadOrCreateKdfParams()): Promise<void> {
  const key = await deriveKeyForParams(password, params)
  keyring.set(key, params)
}
