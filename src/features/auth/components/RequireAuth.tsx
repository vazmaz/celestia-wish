import { useEffect, type ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore, selectSessionUser } from '../store/authStore'
import { usePlayerStore } from '../../inventory/store/playerStore'
import { useAuthHydrated } from '../hooks/useAuthHydrated'

export function RequireAuth({ children }: { children: ReactNode }) {
  const hydrated = useAuthHydrated()
  const user = useAuthStore(selectSessionUser)
  const location = useLocation()
  const syncFromAuth = usePlayerStore((s) => s.syncFromAuth)

  useEffect(() => {
    if (hydrated) syncFromAuth()
  }, [hydrated, user?.id, syncFromAuth])

  if (!hydrated) {
    return (
      <div className="auth-boot">
        <p>Загрузка…</p>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  return children
}
