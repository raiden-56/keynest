import { useEffect, useRef } from 'react'

const ACTIVITY_EVENTS: (keyof WindowEventMap)[] = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'wheel']

/**
 * Calls `onIdle` after `minutes` without user activity. A value of 0 disables the lock.
 * Also locks when the tab was hidden for longer than the timeout (background timers are throttled).
 */
export function useIdleLock(minutes: number, enabled: boolean, onIdle: () => void) {
  const callback = useRef(onIdle)
  useEffect(() => {
    callback.current = onIdle
  }, [onIdle])

  useEffect(() => {
    if (!enabled || minutes <= 0) return
    const timeoutMs = minutes * 60_000
    let lastActivity = Date.now()
    let timer: ReturnType<typeof setTimeout> | null = null
    let throttle = 0

    const arm = () => {
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => callback.current(), timeoutMs)
    }
    const onActivity = () => {
      const now = Date.now()
      if (now - throttle < 1000) return
      throttle = now
      lastActivity = now
      arm()
    }
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        if (Date.now() - lastActivity >= timeoutMs) callback.current()
        else arm()
      }
    }

    ACTIVITY_EVENTS.forEach((event) => window.addEventListener(event, onActivity, { passive: true }))
    document.addEventListener('visibilitychange', onVisibility)
    arm()
    return () => {
      if (timer) clearTimeout(timer)
      ACTIVITY_EVENTS.forEach((event) => window.removeEventListener(event, onActivity))
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [minutes, enabled])
}
