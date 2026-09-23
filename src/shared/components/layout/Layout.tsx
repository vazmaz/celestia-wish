import { useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { useAuthStore } from '../../../features/auth/store/authStore'
import { useSupportStore } from '../../../features/support/store/supportStore'
import { SupportWidget } from '../../../features/support/components/SupportWidget'
import { Header } from './Header'

function useSupportSync() {
  const userId = useAuthStore((s) => s.user?.id)
  const token = useAuthStore((s) => s.token)
  const loadTickets = useSupportStore((s) => s.loadTickets)
  const clear = useSupportStore((s) => s.clear)

  useEffect(() => {
    if (!userId || !token) {
      clear()
      return
    }
    void loadTickets()
    const id = window.setInterval(() => {
      void loadTickets()
    }, 12000)
    return () => window.clearInterval(id)
  }, [userId, token, loadTickets, clear])
}

export function Layout() {
  useSupportSync()
  return (
    <div className="app-shell">
      <div className="app-shell__glow" aria-hidden />
      <Header />
      <main className="app-main">
        <Outlet />
      </main>
      <footer className="site-footer">
        <p>
          Celestia Wish — неофициальный фан-проект в тематике Genshin Impact · не аффилирован с
          Hoyoverse · виртуальная Мора, без реальных платежей
        </p>
      </footer>
      <SupportWidget />
    </div>
  )
}
