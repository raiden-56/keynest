#!/usr/bin/env node
// Generates public/keynest-template.xlsx — a plaintext starter workbook with the documented columns.
// Usage: npm run template
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import * as XLSX from 'xlsx'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const out = join(root, 'public', 'keynest-template.xlsx')

const now = new Date()
const headers = ['ID', 'Application Name', 'URL', 'Username', 'Password', 'Category', 'Notes', 'Created At', 'Updated At', 'Favorite']
const rows = [
  ['', 'Example Mail', 'https://mail.example.com', 'you@example.com', 'replace-me-1', 'Personal', 'Sample row — replace or delete.', now, now, 'Yes'],
  ['', 'Example Bank', 'https://bank.example.com', 'customer123', 'replace-me-2', 'Finance', '', now, now, 'No'],
  ['', 'Example Shop', 'https://shop.example.com', 'you@example.com', 'replace-me-3', 'Shopping', '', now, now, 'No'],
]

const wb = XLSX.utils.book_new()
const ws = XLSX.utils.aoa_to_sheet([headers, ...rows], { cellDates: true })
ws['!cols'] = [38, 28, 36, 28, 24, 16, 40, 20, 20, 10].map((wch) => ({ wch }))
ws['!freeze'] = { xSplit: 0, ySplit: 1 }
XLSX.utils.book_append_sheet(wb, ws, 'Credentials')

const readme = XLSX.utils.aoa_to_sheet([
  ['KeyNest template'],
  [''],
  ['Fill the "Credentials" sheet and open this file in KeyNest.'],
  ['ID may be left blank — KeyNest generates one. Favorite accepts Yes/No. Dates may be Excel dates or ISO-8601 text.'],
  ['Category is free text; the built-in ones are Work, Personal, Finance, Shopping, Social Media, Entertainment, Developer Tools, Other.'],
  ['WARNING: this template stores passwords in plain text. KeyNest converts it to its encrypted format on the first save.'],
])
readme['!cols'] = [{ wch: 110 }]
XLSX.utils.book_append_sheet(wb, readme, 'Read Me')

mkdirSync(dirname(out), { recursive: true })
writeFileSync(out, XLSX.write(wb, { type: 'buffer', bookType: 'xlsx', cellDates: true }))
console.log(`Template written to ${out}`)
