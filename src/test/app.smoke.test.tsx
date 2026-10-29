// @vitest-environment jsdom
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

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

async function renderApp() {
  const { App } = await import('../app/App')
  return render(<App />)
}

describe('KeyNest end-to-end (jsdom)', () => {
  it('rejects a wrong master password and accepts the right one', async () => {
    const user = userEvent.setup()
    await renderApp()
    expect(await screen.findByRole('heading', { name: /welcome back/i })).toBeTruthy()

    await user.type(screen.getByLabelText(/master username/i), 'admin')
    await user.type(screen.getByLabelText(/master password/i), 'wrong-password')
    await user.click(screen.getByRole('button', { name: /sign in/i }))
    expect(await screen.findByText(/don't match/i)).toBeTruthy()

    await user.clear(screen.getByLabelText(/master password/i))
    await user.type(screen.getByLabelText(/master password/i), MASTER_PASSWORD)
    await user.click(screen.getByRole('button', { name: /sign in/i }))
    expect(await screen.findByText('Your digital life, organized.', {}, { timeout: 15_000 })).toBeTruthy()
    expect(screen.getByText(/connect your excel workbook/i)).toBeTruthy()
  }, 30_000)

  it('adds a credential, lists it, reveals it, locks and restores parked changes', async () => {
    const user = userEvent.setup()
    await renderApp()
    await user.type(await screen.findByLabelText(/master username/i), 'admin')
    await user.type(screen.getByLabelText(/master password/i), MASTER_PASSWORD)
    await user.click(screen.getByRole('button', { name: /sign in/i }))
    await screen.findByText('Your digital life, organized.', {}, { timeout: 15_000 })

    // Add a password through the global form.
    await user.click(screen.getAllByRole('button', { name: /add password/i })[0])
    const dialog = await screen.findByRole('dialog')
    await user.type(within(dialog).getByLabelText(/application name/i), 'Example Mail')
    await user.type(within(dialog).getByLabelText(/website url/i), 'mail.example.com')
    await user.type(within(dialog).getByLabelText(/username or email/i), 'me@example.com')
    await user.type(within(dialog).getByLabelText(/^password/i), 'S3cret!Pass123')
    await user.click(within(dialog).getByRole('button', { name: /save password/i }))
    expect(await screen.findByText(/added example mail/i)).toBeTruthy()

    // Without a connected workbook the change is pending, and the user is told so.
    expect(await screen.findByText(/changes are not saved to a file yet/i)).toBeTruthy()

    // The list shows it; the password is masked until revealed.
    await user.click(await screen.findByRole('link', { name: /all passwords/i }))
    const table = await screen.findByRole('table', { name: /credentials/i })
    expect(within(table).getByText('Example Mail')).toBeTruthy()
    expect(within(table).getByText('me@example.com')).toBeTruthy()
    expect(within(table).queryByText('S3cret!Pass123')).toBeNull()
    await user.click(within(table).getByRole('button', { name: /reveal password/i }))
    expect(await within(table).findByText('S3cret!Pass123')).toBeTruthy()

    // Search filters the list.
    await user.type(screen.getByRole('searchbox', { name: /search credentials/i }), 'nothing-matches')
    expect(await screen.findByText(/no matching accounts/i)).toBeTruthy()
    await user.click(screen.getByRole('button', { name: /clear search/i }))
    await within(await screen.findByRole('table', { name: /credentials/i })).findByText('Example Mail')

    // Lock with unsaved changes: they are parked encrypted and restored after unlock.
    await user.click(screen.getAllByText(/lock application/i)[0])
    expect(await screen.findByRole('button', { name: /unlock/i })).toBeTruthy()
    expect(screen.getByText(/held encrypted in memory/i)).toBeTruthy()
    await user.type(screen.getByLabelText(/master password/i), MASTER_PASSWORD)
    await user.click(screen.getByRole('button', { name: /unlock/i }))
    expect(await screen.findByText(/restored/i, {}, { timeout: 15_000 })).toBeTruthy()
    await waitFor(() => expect(screen.getByText('Example Mail')).toBeTruthy())
  }, 60_000)
})
