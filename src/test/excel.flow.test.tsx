// @vitest-environment jsdom
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { buildTemplateWorkbook, decodeRows, parseWorkbook } from '../services/excelService'

const MASTER_PASSWORD = 'demo-pass'

async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('')
}

beforeAll(async () => {
  vi.stubEnv('VITE_MASTER_USERNAME', 'admin')
  vi.stubEnv('VITE_MASTER_PASSWORD_HASH', `sha256$${await sha256Hex(MASTER_PASSWORD)}`)
})

afterEach(() => {
  cleanup()
  localStorage.clear()
  sessionStorage.clear()
})

describe('Excel workbook flow (upload fallback in jsdom)', () => {
  it('loads a plaintext template, shows its rows, and writes an encrypted workbook after an edit', async () => {
    // Capture what the app "downloads" when it writes in upload-fallback mode.
    const written: Blob[] = []
    URL.createObjectURL = (blob: Blob | MediaSource) => {
      written.push(blob as Blob)
      return 'blob:mock'
    }
    HTMLAnchorElement.prototype.click = function () {}

    const user = userEvent.setup()
    const { App } = await import('../app/App')
    render(<App />)
    await user.type(await screen.findByLabelText(/master username/i), 'admin')
    await user.type(screen.getByLabelText(/master password/i), MASTER_PASSWORD)
    await user.click(screen.getByRole('button', { name: /sign in/i }))
    await screen.findByText('Your digital life, organized.', {}, { timeout: 15_000 })

    // Open the source dialog and upload the template through the fallback input.
    await user.click(screen.getByRole('button', { name: /choose workbook/i }))
    const dialog = await screen.findByRole('dialog')
    const input = dialog.querySelector('input[type="file"]') as HTMLInputElement
    expect(input).toBeTruthy()
    const file = new File([await buildTemplateWorkbook()], 'vault.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })
    await user.upload(input, file)

    // Records from the file appear and the stats reflect them.
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull(), { timeout: 10_000 })
    expect(await screen.findByText(/3 saved accounts/i, {}, { timeout: 10_000 })).toBeTruthy()
    expect(screen.getAllByText('Example Bank').length).toBeGreaterThan(0)
    expect(screen.getAllByText(/vault\.xlsx/).length).toBeGreaterThan(0)

    // A plaintext source is flagged and can be encrypted immediately.
    expect(await screen.findByText(/stores plaintext passwords/i)).toBeTruthy()
    await user.click(screen.getByRole('button', { name: /encrypt now/i }))
    await waitFor(() => expect(written.length).toBeGreaterThan(0), { timeout: 10_000 })

    // Edit a record; the write-back produces another encrypted workbook that round-trips.
    await user.click(await screen.findByRole('link', { name: /all passwords/i }))
    const table = await screen.findByRole('table', { name: /credentials/i })
    const row = within(table).getByText('Example Bank').closest('tr') as HTMLTableRowElement
    await user.click(within(row).getByRole('button', { name: /more actions/i }))
    await user.click(await screen.findByRole('menuitem', { name: /edit/i }))
    const form = await screen.findByRole('dialog')
    const nameField = within(form).getByLabelText(/application name/i)
    await user.clear(nameField)
    await user.type(nameField, 'Example Bank Renamed')
    await user.click(within(form).getByRole('button', { name: /save changes/i }))
    expect(await screen.findByText(/updated example bank renamed/i)).toBeTruthy()
    await waitFor(() => expect(written.length).toBeGreaterThan(1), { timeout: 10_000 })

    const bytes = await written[written.length - 1].arrayBuffer()
    const parsed = parseWorkbook(bytes)
    expect(parsed.format).toBe('encrypted')
    expect(parsed.rows.map((r) => r.appName)).toContain('Example Bank Renamed')
    expect(parsed.rows.every((r) => r.encPassword?.startsWith('KN1:'))).toBe(true)
    expect(JSON.stringify(parsed.rows)).not.toContain('replace-me-2')
    await expect(decodeRows(parsed, null)).rejects.toMatchObject({ code: 'key-unavailable' })

    // Status reflects a successful write.
    expect((await screen.findAllByText(/^synced$/i)).length).toBeGreaterThan(0)
  }, 60_000)
})
