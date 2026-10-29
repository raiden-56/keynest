import { describe, expect, it } from 'vitest'
import { hostnameOf, initialsOf, isValidUrl, normalizeUrl } from '../utils/validators'

describe('validators', () => {
  it('validates URLs leniently but sensibly', () => {
    expect(isValidUrl('https://example.com')).toBe(true)
    expect(isValidUrl('example.com/login')).toBe(true)
    expect(isValidUrl('http://localhost:3000')).toBe(true)
    expect(isValidUrl('not a url')).toBe(false)
    expect(isValidUrl('ftp://example.com')).toBe(false)
    expect(isValidUrl('')).toBe(false)
  })

  it('normalises and extracts hostnames', () => {
    expect(normalizeUrl('example.com')).toBe('https://example.com')
    expect(normalizeUrl('https://a.b')).toBe('https://a.b')
    expect(hostnameOf('https://www.example.com/path')).toBe('example.com')
  })

  it('builds initials', () => {
    expect(initialsOf('Google Drive')).toBe('GD')
    expect(initialsOf('Netflix')).toBe('NE')
    expect(initialsOf('')).toBe('?')
  })
})
