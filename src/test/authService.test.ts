import { afterEach, describe, expect, it, vi } from 'vitest'
import { attemptLogin, getMasterConfig } from '../services/authService'

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('authService', () => {
  it('uses the built-in login when the environment is not configured', async () => {
    vi.stubEnv('VITE_MASTER_USERNAME', '')
    vi.stubEnv('VITE_MASTER_PASSWORD_HASH', '')
    const { config, problem } = getMasterConfig()
    expect(problem).toBeNull()
    expect(config?.username).toBe('ganeshmesta1234@gmail.com')
    expect((await attemptLogin('GaneshMesta1234@gmail.com', '9110428294@Ganesh')).ok).toBe(true)
    expect((await attemptLogin('ganeshmesta1234@gmail.com', 'not-the-password')).ok).toBe(false)
  })

  it('accepts colon-separated pbkdf2 hashes from the environment', async () => {
    vi.stubEnv('VITE_MASTER_USERNAME', 'someone')
    vi.stubEnv('VITE_MASTER_PASSWORD_HASH', 'pbkdf2:310000:R2F2ZXJ6b3VzU2FsdDEyMzQ=:MtBNEjWYuSL8PVJL3/O1whwXHHayQuPMKzLYbng8EF4=')
    expect(getMasterConfig().config?.username).toBe('someone')
    expect((await attemptLogin('someone', 'KeyNest!demo')).ok).toBe(true)
  })

  it('falls back to the built-in login when the env hash is corrupted', () => {
    vi.stubEnv('VITE_MASTER_USERNAME', 'someone')
    vi.stubEnv('VITE_MASTER_PASSWORD_HASH', 'pbkdf2$310000+broken==')
    expect(getMasterConfig().config?.username).toBe('ganeshmesta1234@gmail.com')
  })
})
