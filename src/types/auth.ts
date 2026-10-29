export type AuthStatus = 'unauthenticated' | 'locked' | 'authenticated'

export interface AuthState {
  status: AuthStatus
  username: string | null
  /** Milliseconds timestamp of the last successful sign-in. */
  signedInAt: number | null
}

export interface LoginResult {
  ok: boolean
  message?: string
  lockedUntil?: number
}
