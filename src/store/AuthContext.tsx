import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import {
  attemptLogin,
  clearSessionMarker,
  getMasterConfig,
  readSessionMarker,
  saveSessionMarker,
  type ConfigProblem,
} from '../services/authService'
import { keyring, unlockKeyring } from '../services/keyring'
import type { AuthState, LoginResult } from '../types/auth'

interface AuthContextValue {
  state: AuthState
  configProblem: ConfigProblem | null
  login: (username: string, password: string, remember: boolean) => Promise<LoginResult>
  unlock: (password: string) => Promise<LoginResult>
  /** Drops the encryption key and returns to the lock screen. */
  lock: () => void
  /** Ends the session entirely. */
  signOut: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

function initialState(): AuthState {
  const marker = readSessionMarker()
  if (marker) return { status: 'locked', username: marker.username, signedInAt: marker.signedInAt }
  return { status: 'unauthenticated', username: null, signedInAt: null }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(initialState)
  const configProblem = useMemo(() => getMasterConfig().problem, [])

  const login = useCallback(async (username: string, password: string, remember: boolean): Promise<LoginResult> => {
    const result = await attemptLogin(username, password)
    if (!result.ok) return result
    await unlockKeyring(password)
    saveSessionMarker(username.trim(), remember)
    setState({ status: 'authenticated', username: username.trim(), signedInAt: Date.now() })
    return result
  }, [])

  const unlock = useCallback(
    async (password: string): Promise<LoginResult> => {
      const username = state.username
      if (!username) return { ok: false, message: 'No session to unlock. Please sign in.' }
      const result = await attemptLogin(username, password)
      if (!result.ok) return result
      await unlockKeyring(password)
      setState((prev) => ({ ...prev, status: 'authenticated', signedInAt: Date.now() }))
      return result
    },
    [state.username],
  )

  const lock = useCallback(() => {
    keyring.clear()
    setState((prev) => (prev.username ? { ...prev, status: 'locked' } : { status: 'unauthenticated', username: null, signedInAt: null }))
  }, [])

  const signOut = useCallback(() => {
    keyring.clear()
    clearSessionMarker()
    setState({ status: 'unauthenticated', username: null, signedInAt: null })
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({ state, configProblem, login, unlock, lock, signOut }),
    [state, configProblem, login, unlock, lock, signOut],
  )
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
