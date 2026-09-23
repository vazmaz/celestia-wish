import { useEffect, useState } from 'react'
import { useAuthStore } from '../store/authStore'

/** Waits for persist rehydration, then validates JWT against the API. */
export function useAuthHydrated(): boolean {
  const ready = useAuthStore((s) => s.ready)
  const [started, setStarted] = useState(false)

  useEffect(() => {
    let cancelled = false

    const run = async () => {
      if (useAuthStore.persist.hasHydrated()) {
        await useAuthStore.getState().bootstrap()
        if (!cancelled) setStarted(true)
        return
      }

      await new Promise<void>((resolve) => {
        const unsub = useAuthStore.persist.onFinishHydration(() => {
          unsub()
          resolve()
        })
      })
      await useAuthStore.getState().bootstrap()
      if (!cancelled) setStarted(true)
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [])

  return started && ready
}
