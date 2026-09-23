import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { usePlayerStore } from '../../../features/inventory/store/playerStore'
import {
  selectSessionUser,
  useAuthStore,
} from '../../../features/auth/store/authStore'
import { TopupModal } from '../../../features/auth/components/TopupModal'
import {
  selectOpenTicketCount,
  useSupportStore,
} from '../../../features/support/store/supportStore'

const NAV = [
  { to: '/', label: 'Баннеры', end: true },
  { to: '/battles', label: 'Баттлы' },
  { to: '/upgrade', label: 'Апгрейд' },
  { to: '/inventory', label: 'Инвентарь' },
] as const

export function Header() {
  const balance = usePlayerStore((s) => s.balance)
  const inventoryCount = usePlayerStore((s) => s.inventory.length)
  const user = useAuthStore(selectSessionUser)
  const logout = useAuthStore((s) => s.logout)
  const openTickets = useSupportStore(selectOpenTicketCount)
  const [topupOpen, setTopupOpen] = useState(false)

  return (
    <header className="site-header">
      <NavLink to="/" end className="brand">
        <span className="brand__mark">Celestia</span>
        <span className="brand__sub">Wish</span>
      </NavLink>

      <nav className="site-nav" aria-label="Основная навигация">
        {NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={'end' in item ? item.end : undefined}
            className={({ isActive }) =>
              isActive ? 'site-nav__link is-active' : 'site-nav__link'
            }
          >
            {item.label}
            {item.to === '/inventory' && inventoryCount > 0 && (
              <span className="nav-count">{inventoryCount}</span>
            )}
          </NavLink>
        ))}
        {user?.role === 'admin' && (
          <NavLink
            to="/admin"
            className={({ isActive }) =>
              isActive ? 'site-nav__link is-active' : 'site-nav__link'
            }
          >
            Админ
            {openTickets > 0 && (
              <span className="nav-count nav-count--alert">{openTickets}</span>
            )}
          </NavLink>
        )}
      </nav>

      <div className="balance-chip">
        <div>
          <span className="balance-chip__label">
            {user ? `@${user.username}` : 'Мора'}
          </span>
          <strong>{balance.toLocaleString('ru-RU')}</strong>
        </div>
        <button
          type="button"
          className="btn btn--tiny"
          onClick={() => setTopupOpen(true)}
          title="Пополнить"
        >
          +
        </button>
        <button
          type="button"
          className="btn btn--tiny"
          onClick={() => logout()}
          title="Выйти"
        >
          Выйти
        </button>
      </div>

      <TopupModal open={topupOpen} onClose={() => setTopupOpen(false)} />
    </header>
  )
}
