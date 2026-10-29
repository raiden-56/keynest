import * as XLSX from 'xlsx'
import { describe, expect, it } from 'vitest'
import { deriveVaultKey, randomBytes, toBase64 } from '../services/encryptionService'
import {
  buildTemplateWorkbook,
  buildWorkbook,
  createWorkbookMeta,
  decodeRows,
  parseWorkbook,
  verifyWorkbookKey,
} from '../services/excelService'
import type { Credential } from '../types/credential'
import { SyncFailure } from '../types/sync'

function sheetBytes(rows: unknown[][], sheetName = 'Credentials'): ArrayBuffer {
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), sheetName)
  return XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer
}

const now = new Date().toISOString()
const sample: Credential[] = [
  { id: 'a1', appName: 'Mail', url: 'https://mail.example.com', username: 'me@example.com', password: 'hunter2!', category: 'Personal', notes: 'primary', createdAt: now, updatedAt: now, favorite: true },
  { id: 'b2', appName: 'Bank', url: 'https://bank.example.com', username: 'cust', password: 'S3cure#pass', category: 'Finance', notes: '', createdAt: now, updatedAt: now, favorite: false },
]

describe('excelService: plaintext workbooks', () => {
  it('parses the documented column layout', async () => {
    const bytes = sheetBytes([
      ['ID', 'Application Name', 'URL', 'Username', 'Password', 'Category', 'Notes', 'Created At', 'Updated At', 'Favorite'],
      ['1', 'Mail', 'https://mail.example.com', 'me', 'pw', 'Personal', 'n', '2024-01-01T00:00:00Z', '2024-02-01T00:00:00Z', 'Yes'],
    ])
    const parsed = parseWorkbook(bytes)
    expect(parsed.format).toBe('plain')
    const { credentials } = await decodeRows(parsed, null)
    expect(credentials).toHaveLength(1)
    expect(credentials[0]).toMatchObject({ id: '1', appName: 'Mail', username: 'me', password: 'pw', favorite: true })
    expect(credentials[0].updatedAt.startsWith('2024-02-01')).toBe(true)
  })

  it('accepts header aliases and tolerates missing optional columns', async () => {
    const bytes = sheetBytes([
      ['Name', 'Website', 'Login', 'Pass'],
      ['Shop', 'shop.example.com', 'me', 'pw'],
    ])
    const parsed = parseWorkbook(bytes)
    expect(parsed.issues.some((i) => i.message.includes('Optional columns'))).toBe(true)
    const { credentials } = await decodeRows(parsed, null)
    expect(credentials[0].appName).toBe('Shop')
    expect(credentials[0].id).toBeTruthy()
    expect(credentials[0].category).toBe('Other')
  })

  it('reports missing required columns', () => {
    const bytes = sheetBytes([
      ['Application Name', 'URL'],
      ['Mail', 'https://x.example.com'],
    ])
    expect(() => parseWorkbook(bytes)).toThrowError(SyncFailure)
    try {
      parseWorkbook(bytes)
    } catch (error) {
      expect((error as SyncFailure).code).toBe('missing-columns')
      expect((error as SyncFailure).details?.join(' ')).toContain('Password')
    }
  })

  it('handles empty files and duplicate ids', async () => {
    expect(() => parseWorkbook(new ArrayBuffer(0))).toThrowError(/empty/)
    const dup = sheetBytes([
      ['ID', 'Application Name', 'Username', 'Password'],
      ['x', 'One', 'a', 'b'],
      ['x', 'Two', 'c', 'd'],
      ['', '', '', ''],
      ['', '', 'orphan-user', 'orphan-pw'],
    ])
    const parsed = parseWorkbook(dup)
    const ids = parsed.rows.map((r) => r.id)
    expect(new Set(ids).size).toBe(2)
    expect(parsed.issues.some((i) => i.message.includes('duplicate ID'))).toBe(true)
  })

  it('round-trips a plaintext export', async () => {
    const bytes = await buildWorkbook(sample, { format: 'plain' })
    const { credentials } = await decodeRows(parseWorkbook(bytes), null)
    expect(credentials.map((c) => c.id)).toEqual(['a1', 'b2'])
    expect(credentials[0].password).toBe('hunter2!')
    expect(credentials[0].favorite).toBe(true)
  })

  it('creates a usable template', async () => {
    const parsed = parseWorkbook(await buildTemplateWorkbook())
    expect(parsed.format).toBe('plain')
    expect(parsed.rows.length).toBe(3)
  })
})

describe('excelService: encrypted workbooks', () => {
  it('round-trips an encrypted vault and refuses the wrong key', async () => {
    const salt = randomBytes(16)
    const key = await deriveVaultKey('master', salt, 1_000)
    const meta = await createWorkbookMeta(key, toBase64(salt), 1_000)
    const bytes = await buildWorkbook(sample, { format: 'encrypted', key, meta })

    const parsed = parseWorkbook(bytes)
    expect(parsed.format).toBe('encrypted')
    expect(parsed.meta?.salt).toBe(toBase64(salt))
    expect(parsed.rows[0].encPassword?.startsWith('KN1:')).toBe(true)
    expect(JSON.stringify(parsed.rows)).not.toContain('hunter2!')

    const decoded = await decodeRows(parsed, key)
    expect(decoded.credentials[0].password).toBe('hunter2!')
    expect(decoded.credentials[0].notes).toBe('primary')

    const wrong = await deriveVaultKey('other', salt, 1_000)
    expect(await verifyWorkbookKey(parsed.meta, wrong)).toBe(false)
    await expect(decodeRows(parsed, wrong)).rejects.toMatchObject({ code: 'key-unavailable' })
    await expect(decodeRows(parsed, null)).rejects.toMatchObject({ code: 'key-unavailable' })
  })

  it('adopts plaintext cells added by hand inside an encrypted workbook', async () => {
    const salt = randomBytes(16)
    const key = await deriveVaultKey('master', salt, 1_000)
    const meta = await createWorkbookMeta(key, toBase64(salt), 1_000)
    const bytes = await buildWorkbook(sample, { format: 'encrypted', key, meta })
    const wb = XLSX.read(bytes, { type: 'array' })
    const ws = wb.Sheets.Credentials
    // Add plaintext Username/Password columns and a hand-written row.
    XLSX.utils.sheet_add_aoa(ws, [['Username', 'Password']], { origin: 'L1' })
    XLSX.utils.sheet_add_aoa(ws, [['new-id', 'Manual', 'https://m.example.com', '', '', 'Work', '', '', '', '', 'No', 'manual-user', 'manual-pw']], { origin: -1 })
    const edited = XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer
    const decoded = await decodeRows(parseWorkbook(edited), key)
    expect(decoded.needsReencryption).toBe(true)
    const manual = decoded.credentials.find((c) => c.appName === 'Manual')
    expect(manual?.username).toBe('manual-user')
    expect(manual?.password).toBe('manual-pw')
  })
})
