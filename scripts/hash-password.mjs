#!/usr/bin/env node
// Generates a VITE_MASTER_PASSWORD_HASH value for KeyNest.
// Usage: npm run hash -- "your master password"
// Output format: pbkdf2:<iterations>:<salt base64>:<hash base64>
// Colons are used instead of "$" because Vite expands "$name" inside .env files.
import { pbkdf2Sync, randomBytes } from 'node:crypto'

const password = process.argv.slice(2).join(' ')
if (!password) {
  console.error('Usage: npm run hash -- "your master password"')
  process.exit(1)
}
const iterations = 310000
const salt = randomBytes(16)
const hash = pbkdf2Sync(password, salt, iterations, 32, 'sha256')
const value = `pbkdf2:${iterations}:${salt.toString('base64')}:${hash.toString('base64')}`
console.log('\nAdd this line to your .env.local file:\n')
console.log(`VITE_MASTER_PASSWORD_HASH=${value}\n`)
