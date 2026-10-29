import { ENCRYPTION_VERSION, PBKDF2_ITERATIONS } from '../utils/constants'

const encoder = new TextEncoder()
const decoder = new TextDecoder()

export function randomBytes(length: number): Uint8Array<ArrayBuffer> {
  const bytes = new Uint8Array(length)
  crypto.getRandomValues(bytes)
  return bytes
}

export function toBase64(bytes: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
  return btoa(binary)
}

export function fromBase64(value: string): Uint8Array<ArrayBuffer> {
  const binary = atob(value)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

function encodeText(text: string): Uint8Array<ArrayBuffer> {
  const encoded = encoder.encode(text)
  // Copy into a plain ArrayBuffer-backed view so it satisfies BufferSource typings.
  const out = new Uint8Array(encoded.length)
  out.set(encoded)
  return out
}

/** PBKDF2-SHA256 → raw bits. Used for the master-login hash check. */
export async function pbkdf2Bits(
  password: string,
  salt: Uint8Array<ArrayBuffer>,
  iterations: number,
  lengthBytes = 32,
): Promise<Uint8Array<ArrayBuffer>> {
  const base = await crypto.subtle.importKey('raw', encodeText(password), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations },
    base,
    lengthBytes * 8,
  )
  return new Uint8Array(bits)
}

/** PBKDF2-SHA256 → non-extractable AES-256-GCM key. */
export async function deriveVaultKey(
  password: string,
  salt: Uint8Array<ArrayBuffer>,
  iterations = PBKDF2_ITERATIONS,
): Promise<CryptoKey> {
  const base = await crypto.subtle.importKey('raw', encodeText(password), 'PBKDF2', false, ['deriveKey'])
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  )
}

/**
 * Encrypts a string with AES-256-GCM using a fresh 96-bit nonce.
 * Output format: `KN1:<iv base64>:<ciphertext base64>`. Empty input stays empty.
 */
export async function encryptString(key: CryptoKey, plaintext: string): Promise<string> {
  if (plaintext === '') return ''
  const iv = randomBytes(12)
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encodeText(plaintext))
  return `${ENCRYPTION_VERSION}:${toBase64(iv)}:${toBase64(new Uint8Array(ciphertext))}`
}

export function isEncryptedPayload(value: unknown): value is string {
  return typeof value === 'string' && /^KN\d+:[A-Za-z0-9+/=]+:[A-Za-z0-9+/=]*$/.test(value)
}

export class DecryptionError extends Error {
  constructor(message = 'Unable to decrypt value') {
    super(message)
    this.name = 'DecryptionError'
  }
}

export async function decryptString(key: CryptoKey, payload: string): Promise<string> {
  if (payload === '') return ''
  if (!isEncryptedPayload(payload)) throw new DecryptionError('Value is not an encrypted payload')
  const [version, ivB64, ctB64] = payload.split(':')
  if (version !== ENCRYPTION_VERSION) throw new DecryptionError(`Unsupported encryption version ${version}`)
  try {
    const plain = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: fromBase64(ivB64) },
      key,
      fromBase64(ctB64),
    )
    return decoder.decode(plain)
  } catch {
    throw new DecryptionError()
  }
}

/** Constant-time comparison for equal-length byte arrays. */
export function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i]
  return diff === 0
}

export async function sha256Bytes(text: string): Promise<Uint8Array<ArrayBuffer>> {
  const digest = await crypto.subtle.digest('SHA-256', encodeText(text))
  return new Uint8Array(digest)
}

export function hexToBytes(hex: string): Uint8Array<ArrayBuffer> {
  const clean = hex.trim().toLowerCase()
  const bytes = new Uint8Array(clean.length / 2)
  for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16)
  return bytes
}

/** Fast non-cryptographic fingerprint for change detection of in-memory bytes. */
export function fingerprintBytes(bytes: ArrayBuffer): string {
  const view = new Uint8Array(bytes)
  let h1 = 0x811c9dc5
  let h2 = 0x01000193
  for (let i = 0; i < view.length; i++) {
    h1 = Math.imul(h1 ^ view[i], 0x01000193)
    h2 = Math.imul(h2 + view[i], 0x9e3779b1)
  }
  return `${(h1 >>> 0).toString(16)}${(h2 >>> 0).toString(16)}:${view.length}`
}
