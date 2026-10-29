export interface GeneratorOptions {
  length: number
  uppercase: boolean
  lowercase: boolean
  numbers: boolean
  symbols: boolean
  excludeAmbiguous: boolean
}

export const MIN_LENGTH = 12
export const MAX_LENGTH = 64

export const DEFAULT_GENERATOR_OPTIONS: GeneratorOptions = {
  length: 20,
  uppercase: true,
  lowercase: true,
  numbers: true,
  symbols: true,
  excludeAmbiguous: false,
}

const SETS = {
  uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  lowercase: 'abcdefghijklmnopqrstuvwxyz',
  numbers: '0123456789',
  symbols: '!@#$%^&*()-_=+[]{};:,.?/~',
}
const AMBIGUOUS = new Set('Il1O0o|`\'"{}[]();:,.'.split(''))

function charset(set: string, excludeAmbiguous: boolean): string {
  return excludeAmbiguous ? set.split('').filter((c) => !AMBIGUOUS.has(c)).join('') : set
}

/** Uniform random integer in [0, max) using rejection sampling (no modulo bias). */
function randomInt(max: number): number {
  if (max <= 0) throw new Error('max must be positive')
  const limit = Math.floor(0x1_0000_0000 / max) * max
  const buf = new Uint32Array(1)
  for (;;) {
    crypto.getRandomValues(buf)
    if (buf[0] < limit) return buf[0] % max
  }
}

function shuffle(chars: string[]): string[] {
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomInt(i + 1)
    ;[chars[i], chars[j]] = [chars[j], chars[i]]
  }
  return chars
}

export function activeSets(options: GeneratorOptions): string[] {
  const sets: string[] = []
  if (options.uppercase) sets.push(charset(SETS.uppercase, options.excludeAmbiguous))
  if (options.lowercase) sets.push(charset(SETS.lowercase, options.excludeAmbiguous))
  if (options.numbers) sets.push(charset(SETS.numbers, options.excludeAmbiguous))
  if (options.symbols) sets.push(charset(SETS.symbols, options.excludeAmbiguous))
  return sets.filter((s) => s.length > 0)
}

/** Generates a password with a cryptographically secure source. Guarantees one char from each enabled set. */
export function generatePassword(options: GeneratorOptions): string {
  const length = Math.min(MAX_LENGTH, Math.max(MIN_LENGTH, Math.floor(options.length)))
  const sets = activeSets(options)
  if (sets.length === 0) throw new Error('Select at least one character type')
  const all = sets.join('')
  const chars: string[] = sets.map((set) => set[randomInt(set.length)])
  while (chars.length < length) chars.push(all[randomInt(all.length)])
  return shuffle(chars).join('')
}

export interface StrengthResult {
  /** 0 (very weak) … 4 (very strong) */
  score: 0 | 1 | 2 | 3 | 4
  label: string
  entropyBits: number
  meetsPolicy: boolean
  feedback: string[]
}

export function evaluateStrength(password: string, policy?: GeneratorOptions): StrengthResult {
  if (!password) return { score: 0, label: 'Empty', entropyBits: 0, meetsPolicy: false, feedback: ['Enter or generate a password.'] }

  const hasUpper = /[A-Z]/.test(password)
  const hasLower = /[a-z]/.test(password)
  const hasNumber = /\d/.test(password)
  const hasSymbol = /[^A-Za-z0-9]/.test(password)

  let poolSize = 0
  if (hasUpper) poolSize += 26
  if (hasLower) poolSize += 26
  if (hasNumber) poolSize += 10
  if (hasSymbol) poolSize += 24

  const uniqueRatio = new Set(password).size / password.length
  const repeated = /(.)\1{2,}/.test(password)
  const sequential = /(?:abc|bcd|cde|def|123|234|345|456|567|678|789|qwe|wer|ert|asd|sdf|zxc)/i.test(password)

  let entropy = password.length * Math.log2(Math.max(poolSize, 2))
  if (uniqueRatio < 0.6) entropy *= 0.8
  if (repeated) entropy *= 0.85
  if (sequential) entropy *= 0.85
  entropy = Math.round(entropy)

  const feedback: string[] = []
  if (password.length < 12) feedback.push('Use at least 12 characters.')
  if (!hasUpper) feedback.push('Add uppercase letters.')
  if (!hasLower) feedback.push('Add lowercase letters.')
  if (!hasNumber) feedback.push('Add numbers.')
  if (!hasSymbol) feedback.push('Add symbols.')
  if (repeated) feedback.push('Avoid repeated characters.')
  if (sequential) feedback.push('Avoid common sequences.')

  let meetsPolicy = true
  if (policy) {
    if (password.length < policy.length) meetsPolicy = false
    if (policy.uppercase && !hasUpper) meetsPolicy = false
    if (policy.lowercase && !hasLower) meetsPolicy = false
    if (policy.numbers && !hasNumber) meetsPolicy = false
    if (policy.symbols && !hasSymbol) meetsPolicy = false
  }

  let score: StrengthResult['score']
  if (entropy < 40 || password.length < 8) score = 0
  else if (entropy < 56) score = 1
  else if (entropy < 76) score = 2
  else if (entropy < 100) score = 3
  else score = 4
  const label = ['Very weak', 'Weak', 'Fair', 'Strong', 'Very strong'][score]

  return { score, label, entropyBits: entropy, meetsPolicy, feedback }
}
