import { Outlet } from 'react-router-dom'
import { SupportWidget } from '../../../features/support/components/SupportWidget'
import { Header } from './Header'

export function Layout() {
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
