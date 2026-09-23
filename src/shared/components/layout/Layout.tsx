import { useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { useAuthStore } from '../../../features/auth/store/authStore'
import { LiveChat } from '../../../features/chat/components/LiveChat'
import { useChatStore } from '../../../features/chat/store/chatStore'
import { useSupportStore } from '../../../features/support/store/supportStore'
import { SupportWidget } from '../../../features/support/components/SupportWidget'
import { Header } from './Header'
import { ScenicBackground } from './ScenicBackground'

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

function useChatSync() {
  const userId = useAuthStore((s) => s.user?.id)
  const token = useAuthStore((s) => s.token)
  const clear = useChatStore((s) => s.clear)

  useEffect(() => {
    if (!userId || !token) {
      clear()
    }
  }, [userId, token, clear])
}

export function Layout() {
  useSupportSync()
  useChatSync()
  return (
    <div className="app-shell app-shell--with-chat">
      <ScenicBackground />
      <div className="app-shell__glow" aria-hidden />
      <Header />
      <main className="app-main">
        <Outlet />
      </main>
      <footer className="site-footer">
        <p>
          Celestia Wish — неофициальный фан-проект в тематике Genshin Impact · не аффилирован с
          Hoyoverse · виртуальные кристаллы, без реальных платежей
        </p>
      </footer>
      <LiveChat />
      <SupportWidget />
    </div>
  )
}
