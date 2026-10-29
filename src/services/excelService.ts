import * as XLSX from 'xlsx'
import type { Credential } from '../types/credential'
import { SyncFailure, type ValidationIssue } from '../types/sync'
import { ENCRYPTION_VERSION } from '../utils/constants'
import { generateId } from '../utils/ids'
import { isValidUrl } from '../utils/validators'
import { DecryptionError, decryptString, encryptString, isEncryptedPayload } from './encryptionService'

export const SHEET_CREDENTIALS = 'Credentials'
export const SHEET_META = 'KeyNest Meta'
export const SHEET_README = 'Read Me'
export const VERIFIER_PLAINTEXT = 'keynest-verifier-ok'

export type WorkbookFormat = 'plain' | 'encrypted'

export interface WorkbookMeta {
  format: 'encrypted'
  version: string
  kdf: string
  iterations: number
  /** base64 */
  salt: string
  /** Encrypted VERIFIER_PLAINTEXT; proves a key matches this workbook. */
  verifier: string
}

export interface ParsedRow {
  rowNumber: number
  id: string
  appName: string
  url: string
  category: string
  createdAt: string
  updatedAt: string
  favorite: boolean
  username: string | null
  password: string | null
  notes: string | null
  encUsername: string | null
  encPassword: string | null
  encNotes: string | null
}

export interface ParsedWorkbook {
  format: WorkbookFormat
  meta: WorkbookMeta | null
  rows: ParsedRow[]
  issues: ValidationIssue[]
  sheetName: string
}

type CanonicalKey =
  | 'id'
  | 'appName'
  | 'url'
  | 'username'
  | 'password'
  | 'category'
  | 'notes'
  | 'createdAt'
  | 'updatedAt'
  | 'favorite'
  | 'encUsername'
  | 'encPassword'
  | 'encNotes'
  | 'encVersion'

export const COLUMN_LABELS: Record<CanonicalKey, string> = {
  id: 'ID',
  appName: 'Application Name',
  url: 'URL',
  username: 'Username',
  password: 'Password',
  category: 'Category',
  notes: 'Notes',
  createdAt: 'Created At',
  updatedAt: 'Updated At',
  favorite: 'Favorite',
  encUsername: 'Encrypted Username',
  encPassword: 'Encrypted Password',
  encNotes: 'Encrypted Notes',
  encVersion: 'Encryption Version',
}

const COLUMN_ALIASES: Record<CanonicalKey, string[]> = {
  id: ['id', 'uid', 'recordid'],
  appName: ['applicationname', 'application', 'appname', 'app', 'name', 'title', 'site', 'service', 'account'],
  url: ['url', 'website', 'websiteurl', 'link', 'loginurl', 'address', 'web'],
  username: ['username', 'user', 'login', 'email', 'usernameoremail', 'useremail', 'loginname'],
  password: ['password', 'pass', 'pwd', 'secret'],
  category: ['category', 'group', 'folder', 'type', 'tag'],
  notes: ['notes', 'note', 'comment', 'comments', 'description', 'remarks'],
  createdAt: ['createdat', 'created', 'createddate', 'datecreated', 'createdon'],
  updatedAt: ['updatedat', 'updated', 'modified', 'lastmodified', 'lastupdated', 'updateddate', 'modifiedon'],
  favorite: ['favorite', 'favourite', 'fav', 'starred', 'isfavorite', 'star'],
  encUsername: ['encryptedusername', 'encusername', 'usernameencrypted'],
  encPassword: ['encryptedpassword', 'encpassword', 'passwordencrypted'],
  encNotes: ['encryptednotes', 'encnotes', 'notesencrypted'],
  encVersion: ['encryptionversion', 'encversion'],
}

function normalizeHeader(header: unknown): string {
  return String(header ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
}

function mapHeaders(headers: unknown[]): Partial<Record<CanonicalKey, number>> {
  const map: Partial<Record<CanonicalKey, number>> = {}
  headers.forEach((header, index) => {
    const norm = normalizeHeader(header)
    if (!norm) return
    for (const key of Object.keys(COLUMN_ALIASES) as CanonicalKey[]) {
      if (map[key] !== undefined) continue
      if (COLUMN_ALIASES[key].includes(norm)) {
        map[key] = index
        return
      }
    }
  })
  return map
}

function cellString(value: unknown): string {
  if (value === null || value === undefined) return ''
  if (value instanceof Date) return value.toISOString()
  return String(value).trim()
}

function parseBoolean(value: unknown): boolean {
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return value !== 0
  const text = String(value ?? '')
    .trim()
    .toLowerCase()
  return ['yes', 'y', 'true', '1', 'x', '★', '*', 'fav', 'favorite'].includes(text)
}

function parseDate(value: unknown): string | null {
  if (value === null || value === undefined || value === '') return null
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value.toISOString()
  if (typeof value === 'number') {
    const parsed = XLSX.SSF.parse_date_code(value)
    if (!parsed) return null
    const d = new Date(Date.UTC(parsed.y, parsed.m - 1, parsed.d, parsed.H, parsed.M, Math.floor(parsed.S)))
    return Number.isNaN(d.getTime()) ? null : d.toISOString()
  }
  const d = new Date(String(value))
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}

function readMetaSheet(workbook: XLSX.WorkBook): WorkbookMeta | null {
  const sheet = workbook.Sheets[SHEET_META]
  if (!sheet) return null
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: '' })
  const entries: Record<string, string> = {}
  for (const row of rows) {
    if (!Array.isArray(row) || row.length < 2) continue
    const key = normalizeHeader(row[0])
    if (key) entries[key] = cellString(row[1])
  }
  if (!entries.salt || !entries.verifier) return null
  return {
    format: 'encrypted',
    version: entries.encryptionversion || ENCRYPTION_VERSION,
    kdf: entries.kdf || 'PBKDF2-SHA256',
    iterations: Number(entries.iterations) || 600_000,
    salt: entries.salt,
    verifier: entries.verifier,
  }
}

function pickCredentialSheet(workbook: XLSX.WorkBook): { sheet: XLSX.WorkSheet; name: string } | null {
  if (workbook.Sheets[SHEET_CREDENTIALS]) return { sheet: workbook.Sheets[SHEET_CREDENTIALS], name: SHEET_CREDENTIALS }
  for (const name of workbook.SheetNames) {
    if (name === SHEET_META || name === SHEET_README) continue
    const sheet = workbook.Sheets[name]
    if (sheet && sheet['!ref']) return { sheet, name }
  }
  return null
}

/** Parses workbook bytes into typed rows. Throws SyncFailure for unrecoverable structure problems. */
export function parseWorkbook(bytes: ArrayBuffer): ParsedWorkbook {
  if (!bytes || bytes.byteLength === 0) {
    throw new SyncFailure('empty-file', 'The selected file is empty. Choose a workbook with a header row, or create a new one.')
  }
  let workbook: XLSX.WorkBook
  try {
    workbook = XLSX.read(bytes, { type: 'array', cellDates: true })
  } catch {
    throw new SyncFailure('invalid-format', 'The file could not be read as an Excel workbook (.xlsx). Check that it is not corrupted or password-protected.')
  }
  if (!workbook.SheetNames.length) {
    throw new SyncFailure('invalid-format', 'The workbook contains no sheets.')
  }
  const picked = pickCredentialSheet(workbook)
  if (!picked) {
    throw new SyncFailure('empty-file', 'The workbook has no credential sheet with a header row. Add the required columns or use the template.')
  }
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(picked.sheet, { header: 1, defval: '', blankrows: false })
  const headerRowIndex = matrix.findIndex((row) => Array.isArray(row) && row.some((c) => cellString(c) !== ''))
  if (headerRowIndex === -1) {
    throw new SyncFailure('empty-file', 'The credential sheet is empty. Add a header row with the required columns or use the template.')
  }
  const headers = matrix[headerRowIndex]
  const columns = mapHeaders(headers)
  const issues: ValidationIssue[] = []

  let format: WorkbookFormat
  if (columns.encPassword !== undefined) format = 'encrypted'
  else if (columns.password !== undefined) format = 'plain'
  else {
    const missing = [COLUMN_LABELS.password, `(or ${COLUMN_LABELS.encPassword})`]
    throw new SyncFailure(
      'missing-columns',
      'Required columns are missing from the credential sheet.',
      [
        `Missing: ${missing.join(' ')}`,
        `Found headers: ${headers.map(cellString).filter(Boolean).join(', ') || 'none'}`,
        'Expected columns: ID, Application Name, URL, Username, Password, Category, Notes, Created At, Updated At, Favorite.',
      ],
    )
  }

  const required: CanonicalKey[] = format === 'plain' ? ['appName', 'username', 'password'] : ['appName', 'encUsername', 'encPassword']
  const missingRequired = required.filter((key) => columns[key] === undefined)
  if (missingRequired.length) {
    throw new SyncFailure(
      'missing-columns',
      'Required columns are missing from the credential sheet.',
      [
        `Missing: ${missingRequired.map((k) => COLUMN_LABELS[k]).join(', ')}`,
        `Found headers: ${headers.map(cellString).filter(Boolean).join(', ')}`,
      ],
    )
  }

  const optional: CanonicalKey[] = ['id', 'url', 'category', 'createdAt', 'updatedAt', 'favorite']
  const missingOptional = optional.filter((key) => columns[key] === undefined)
  if (missingOptional.length) {
    issues.push({
      level: 'warning',
      message: `Optional columns not found and defaults will be used: ${missingOptional.map((k) => COLUMN_LABELS[k]).join(', ')}. They will be added on the next save.`,
    })
  }

  const rows: ParsedRow[] = []
  const seenIds = new Set<string>()
  let generatedIds = 0
  let duplicateIds = 0
  let invalidUrls = 0
  let badDates = 0
  let skipped = 0

  const get = (row: unknown[], key: CanonicalKey): unknown => {
    const idx = columns[key]
    return idx === undefined ? '' : row[idx]
  }

  for (let i = headerRowIndex + 1; i < matrix.length; i++) {
    const raw = matrix[i]
    if (!Array.isArray(raw)) continue
    const rowNumber = i + 1
    const appName = cellString(get(raw, 'appName'))
    const username = format === 'plain' ? cellString(get(raw, 'username')) : columns.username !== undefined ? cellString(get(raw, 'username')) : null
    const password = format === 'plain' ? cellString(get(raw, 'password')) : columns.password !== undefined ? cellString(get(raw, 'password')) : null
    const notes = columns.notes !== undefined ? cellString(get(raw, 'notes')) : null
    const encUsername = format === 'encrypted' ? cellString(get(raw, 'encUsername')) : null
    const encPassword = format === 'encrypted' ? cellString(get(raw, 'encPassword')) : null
    const encNotes = format === 'encrypted' && columns.encNotes !== undefined ? cellString(get(raw, 'encNotes')) : null

    const hasAnyContent = Boolean(appName || username || password || encUsername || encPassword)
    if (!hasAnyContent) continue
    if (!appName) {
      skipped += 1
      issues.push({ level: 'warning', message: `Row ${rowNumber} was skipped because it has no application name.` })
      continue
    }

    let id = cellString(get(raw, 'id'))
    if (!id) {
      id = generateId()
      generatedIds += 1
    } else if (seenIds.has(id)) {
      id = generateId()
      duplicateIds += 1
    }
    seenIds.add(id)

    const url = cellString(get(raw, 'url'))
    if (url && !isValidUrl(url)) invalidUrls += 1

    const createdRaw = get(raw, 'createdAt')
    const updatedRaw = get(raw, 'updatedAt')
    const createdAt = parseDate(createdRaw)
    const updatedAt = parseDate(updatedRaw)
    if ((cellString(createdRaw) && !createdAt) || (cellString(updatedRaw) && !updatedAt)) badDates += 1
    const nowIso = new Date().toISOString()

    rows.push({
      rowNumber,
      id,
      appName,
      url,
      category: cellString(get(raw, 'category')) || 'Other',
      createdAt: createdAt ?? updatedAt ?? nowIso,
      updatedAt: updatedAt ?? createdAt ?? nowIso,
      favorite: parseBoolean(get(raw, 'favorite')),
      username,
      password,
      notes,
      encUsername,
      encPassword,
      encNotes,
    })
  }

  if (generatedIds) issues.push({ level: 'warning', message: `${generatedIds} row${generatedIds === 1 ? '' : 's'} had no ID; new IDs were generated and will be written on the next save.` })
  if (duplicateIds) issues.push({ level: 'warning', message: `${duplicateIds} duplicate ID${duplicateIds === 1 ? ' was' : 's were'} found; the later rows received new IDs.` })
  if (invalidUrls) issues.push({ level: 'warning', message: `${invalidUrls} record${invalidUrls === 1 ? ' has' : 's have'} a URL that does not look valid. They were kept but cannot be opened.` })
  if (badDates) issues.push({ level: 'warning', message: `${badDates} row${badDates === 1 ? ' has' : 's have'} an unreadable date; the current time was used instead.` })
  if (skipped === 0 && rows.length === 0) issues.push({ level: 'warning', message: 'The workbook has headers but no credential rows yet.' })

  const meta = format === 'encrypted' ? readMetaSheet(workbook) : null
  if (format === 'encrypted' && !meta) {
    issues.push({ level: 'warning', message: `The "${SHEET_META}" sheet is missing, so the workbook cannot verify its encryption key up front.` })
  }

  return { format, meta, rows, issues, sheetName: picked.name }
}

/** Checks whether a key matches the workbook's verifier. Returns null when no verifier is available. */
export async function verifyWorkbookKey(meta: WorkbookMeta | null, key: CryptoKey): Promise<boolean | null> {
  if (!meta?.verifier) return null
  try {
    return (await decryptString(key, meta.verifier)) === VERIFIER_PLAINTEXT
  } catch {
    return false
  }
}

export interface DecodedWorkbook {
  credentials: Credential[]
  issues: ValidationIssue[]
  /** True when some rows were stored in plaintext inside an encrypted workbook. */
  needsReencryption: boolean
}

/** Converts parsed rows into credentials, decrypting with `key` when the workbook is encrypted. */
export async function decodeRows(parsed: ParsedWorkbook, key: CryptoKey | null): Promise<DecodedWorkbook> {
  const issues: ValidationIssue[] = [...parsed.issues]
  const credentials: Credential[] = []

  if (parsed.format === 'plain') {
    for (const row of parsed.rows) {
      credentials.push({
        id: row.id,
        appName: row.appName,
        url: row.url,
        username: row.username ?? '',
        password: row.password ?? '',
        category: row.category,
        notes: row.notes ?? '',
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        favorite: row.favorite,
      })
    }
    return { credentials, issues, needsReencryption: false }
  }

  if (!key) {
    throw new SyncFailure('key-unavailable', 'The workbook is encrypted and no encryption key is available in this session.')
  }
  const verified = await verifyWorkbookKey(parsed.meta, key)
  if (verified === false) {
    throw new SyncFailure(
      'key-unavailable',
      'This workbook was encrypted with a different passphrase or salt than the current session key.',
    )
  }

  let plaintextRows = 0
  const decryptField = async (enc: string | null, plain: string | null): Promise<string> => {
    if (enc && isEncryptedPayload(enc)) return decryptString(key, enc)
    if (enc) throw new DecryptionError('Malformed encrypted cell')
    if (plain) {
      plaintextRows += 1
      return plain
    }
    return ''
  }

  for (const row of parsed.rows) {
    try {
      const [username, password, notes] = await Promise.all([
        decryptField(row.encUsername, row.username),
        decryptField(row.encPassword, row.password),
        decryptField(row.encNotes, row.notes),
      ])
      credentials.push({
        id: row.id,
        appName: row.appName,
        url: row.url,
        username,
        password,
        category: row.category,
        notes,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        favorite: row.favorite,
      })
    } catch (error) {
      if (error instanceof DecryptionError && verified === null) {
        throw new SyncFailure('key-unavailable', 'The encrypted values could not be decrypted with the current session key.')
      }
      issues.push({ level: 'error', message: `Row ${row.rowNumber} ("${row.appName}") could not be decrypted and was skipped.` })
    }
  }

  const needsReencryption = plaintextRows > 0
  if (needsReencryption) {
    issues.push({ level: 'warning', message: 'Some cells contained plaintext values inside an encrypted workbook. They will be encrypted on the next save.' })
  }
  return { credentials, issues, needsReencryption }
}

// ---------------------------------------------------------------------------
// Writing
// ---------------------------------------------------------------------------

export async function createWorkbookMeta(key: CryptoKey, salt: string, iterations: number): Promise<WorkbookMeta> {
  return {
    format: 'encrypted',
    version: ENCRYPTION_VERSION,
    kdf: 'PBKDF2-SHA256',
    iterations,
    salt,
    verifier: await encryptString(key, VERIFIER_PLAINTEXT),
  }
}

export type BuildOptions = { format: 'plain' } | { format: 'encrypted'; key: CryptoKey; meta: WorkbookMeta }

function toExcelDate(iso: string): Date | string {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? iso : d
}

function readmeSheet(format: WorkbookFormat): XLSX.WorkSheet {
  const lines =
    format === 'encrypted'
      ? [
          ['KeyNest encrypted vault'],
          [''],
          ['Usernames, passwords and notes are encrypted with AES-256-GCM.'],
          ['The key is derived from your KeyNest master password; it is NOT stored in this file.'],
          ['Losing the master password makes the encrypted values unrecoverable.'],
          [''],
          ['You may edit Application Name, URL, Category and Favorite directly in Excel.'],
          ['To add a row by hand, add "Username", "Password" and "Notes" columns and fill those cells;'],
          ['KeyNest will encrypt them on the next sync. Do not edit the "KeyNest Meta" sheet.'],
        ]
      : [
          ['KeyNest plaintext export'],
          [''],
          ['WARNING: this workbook contains readable passwords. Store it carefully and delete it when no longer needed.'],
          ['Columns: ID, Application Name, URL, Username, Password, Category, Notes, Created At, Updated At, Favorite.'],
          ['Favorite accepts Yes/No. Dates may be Excel dates or ISO-8601 text. IDs are generated if left blank.'],
        ]
  const ws = XLSX.utils.aoa_to_sheet(lines)
  ws['!cols'] = [{ wch: 110 }]
  return ws
}

export async function buildWorkbook(credentials: Credential[], options: BuildOptions): Promise<ArrayBuffer> {
  const wb = XLSX.utils.book_new()
  let rows: Record<string, unknown>[]
  let widths: number[]

  if (options.format === 'plain') {
    rows = credentials.map((c) => ({
      [COLUMN_LABELS.id]: c.id,
      [COLUMN_LABELS.appName]: c.appName,
      [COLUMN_LABELS.url]: c.url,
      [COLUMN_LABELS.username]: c.username,
      [COLUMN_LABELS.password]: c.password,
      [COLUMN_LABELS.category]: c.category,
      [COLUMN_LABELS.notes]: c.notes,
      [COLUMN_LABELS.createdAt]: toExcelDate(c.createdAt),
      [COLUMN_LABELS.updatedAt]: toExcelDate(c.updatedAt),
      [COLUMN_LABELS.favorite]: c.favorite ? 'Yes' : 'No',
    }))
    widths = [38, 28, 36, 28, 24, 16, 40, 20, 20, 10]
  } else {
    rows = await Promise.all(
      credentials.map(async (c) => ({
        [COLUMN_LABELS.id]: c.id,
        [COLUMN_LABELS.appName]: c.appName,
        [COLUMN_LABELS.url]: c.url,
        [COLUMN_LABELS.encUsername]: await encryptString(options.key, c.username),
        [COLUMN_LABELS.encPassword]: await encryptString(options.key, c.password),
        [COLUMN_LABELS.category]: c.category,
        [COLUMN_LABELS.encNotes]: await encryptString(options.key, c.notes),
        [COLUMN_LABELS.encVersion]: ENCRYPTION_VERSION,
        [COLUMN_LABELS.createdAt]: toExcelDate(c.createdAt),
        [COLUMN_LABELS.updatedAt]: toExcelDate(c.updatedAt),
        [COLUMN_LABELS.favorite]: c.favorite ? 'Yes' : 'No',
      })),
    )
    widths = [38, 28, 36, 44, 44, 16, 44, 10, 20, 20, 10]
  }

  const header = options.format === 'plain'
    ? [COLUMN_LABELS.id, COLUMN_LABELS.appName, COLUMN_LABELS.url, COLUMN_LABELS.username, COLUMN_LABELS.password, COLUMN_LABELS.category, COLUMN_LABELS.notes, COLUMN_LABELS.createdAt, COLUMN_LABELS.updatedAt, COLUMN_LABELS.favorite]
    : [COLUMN_LABELS.id, COLUMN_LABELS.appName, COLUMN_LABELS.url, COLUMN_LABELS.encUsername, COLUMN_LABELS.encPassword, COLUMN_LABELS.category, COLUMN_LABELS.encNotes, COLUMN_LABELS.encVersion, COLUMN_LABELS.createdAt, COLUMN_LABELS.updatedAt, COLUMN_LABELS.favorite]

  const ws = XLSX.utils.json_to_sheet(rows, { header, cellDates: true })
  ws['!cols'] = widths.map((wch) => ({ wch }))
  ws['!freeze'] = { xSplit: 0, ySplit: 1 }
  XLSX.utils.book_append_sheet(wb, ws, SHEET_CREDENTIALS)

  if (options.format === 'encrypted') {
    const m = options.meta
    const metaRows = [
      ['Key', 'Value'],
      ['Format', 'encrypted'],
      ['Encryption Version', m.version],
      ['KDF', m.kdf],
      ['Iterations', m.iterations],
      ['Salt', m.salt],
      ['Verifier', m.verifier],
      ['Generated By', 'KeyNest'],
      ['Record Count', credentials.length],
      ['Exported At', new Date().toISOString()],
    ]
    const metaSheet = XLSX.utils.aoa_to_sheet(metaRows)
    metaSheet['!cols'] = [{ wch: 20 }, { wch: 60 }]
    XLSX.utils.book_append_sheet(wb, metaSheet, SHEET_META)
  }
  XLSX.utils.book_append_sheet(wb, readmeSheet(options.format), SHEET_README)

  const out = XLSX.write(wb, { type: 'array', bookType: 'xlsx', cellDates: true }) as ArrayBuffer
  return out
}

/** A plaintext template workbook with example rows. */
export async function buildTemplateWorkbook(): Promise<ArrayBuffer> {
  const now = new Date().toISOString()
  const samples: Credential[] = [
    { id: generateId(), appName: 'Example Mail', url: 'https://mail.example.com', username: 'you@example.com', password: 'replace-me-1', category: 'Personal', notes: 'Sample row — replace or delete.', createdAt: now, updatedAt: now, favorite: true },
    { id: generateId(), appName: 'Example Bank', url: 'https://bank.example.com', username: 'customer123', password: 'replace-me-2', category: 'Finance', notes: '', createdAt: now, updatedAt: now, favorite: false },
    { id: generateId(), appName: 'Example Shop', url: 'https://shop.example.com', username: 'you@example.com', password: 'replace-me-3', category: 'Shopping', notes: '', createdAt: now, updatedAt: now, favorite: false },
  ]
  return buildWorkbook(samples, { format: 'plain' })
}

export function readFileBytes(file: File): Promise<ArrayBuffer> {
  return file.arrayBuffer()
}
