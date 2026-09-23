import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuthStore, selectSessionUser } from '../store/authStore'

export function RequireAdmin({ children }: { children: ReactNode }) {
  const user = useAuthStore(selectSessionUser)

  if (!user) {
    return <Navigate to="/login" replace />
  }
  if (user.role !== 'admin') {
    return <Navigate to="/" replace />
  }

  return children
}
