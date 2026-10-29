import { describe, expect, it } from 'vitest'
import {
  decryptString,
  deriveVaultKey,
  encryptString,
  fromBase64,
  isEncryptedPayload,
  randomBytes,
  timingSafeEqual,
  toBase64,
} from '../services/encryptionService'

describe('encryptionService', () => {
  it('round-trips text through AES-GCM', async () => {
    const key = await deriveVaultKey('correct horse battery staple', randomBytes(16), 1_000)
    const payload = await encryptString(key, 'p@ssw0rd — ünïcödé ✓')
    expect(isEncryptedPayload(payload)).toBe(true)
    expect(payload.startsWith('KN1:')).toBe(true)
    expect(await decryptString(key, payload)).toBe('p@ssw0rd — ünïcödé ✓')
  })

  it('uses a unique nonce per encryption', async () => {
    const key = await deriveVaultKey('pw', randomBytes(16), 1_000)
    const a = await encryptString(key, 'same')
    const b = await encryptString(key, 'same')
    expect(a).not.toBe(b)
    expect(a.split(':')[1]).not.toBe(b.split(':')[1])
  })

  it('fails to decrypt with a different key or salt', async () => {
    const salt = randomBytes(16)
    const key = await deriveVaultKey('pw', salt, 1_000)
    const wrongPassword = await deriveVaultKey('pw2', salt, 1_000)
    const wrongSalt = await deriveVaultKey('pw', randomBytes(16), 1_000)
    const payload = await encryptString(key, 'secret')
    await expect(decryptString(wrongPassword, payload)).rejects.toThrow()
    await expect(decryptString(wrongSalt, payload)).rejects.toThrow()
  })

  it('detects tampering', async () => {
    const key = await deriveVaultKey('pw', randomBytes(16), 1_000)
    const payload = await encryptString(key, 'secret')
    const [v, iv, ct] = payload.split(':')
    const bytes = fromBase64(ct)
    bytes[0] ^= 0xff
    await expect(decryptString(key, `${v}:${iv}:${toBase64(bytes)}`)).rejects.toThrow()
  })

  it('keeps empty strings empty and rejects non-payloads', async () => {
    const key = await deriveVaultKey('pw', randomBytes(16), 1_000)
    expect(await encryptString(key, '')).toBe('')
    expect(await decryptString(key, '')).toBe('')
    expect(isEncryptedPayload('plain text')).toBe(false)
    await expect(decryptString(key, 'plain text')).rejects.toThrow()
  })

  it('compares bytes in constant-time helper', () => {
    expect(timingSafeEqual(new Uint8Array([1, 2, 3]), new Uint8Array([1, 2, 3]))).toBe(true)
    expect(timingSafeEqual(new Uint8Array([1, 2, 3]), new Uint8Array([1, 2, 4]))).toBe(false)
    expect(timingSafeEqual(new Uint8Array([1, 2]), new Uint8Array([1, 2, 3]))).toBe(false)
  })
})
