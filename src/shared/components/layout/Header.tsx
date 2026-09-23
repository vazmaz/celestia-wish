import { useState, useSyncExternalStore } from 'react'
import { NavLink } from 'react-router-dom'
import { usePlayerStore } from '../../../features/inventory/store/playerStore'
import {
  selectSessionUser,
  useAuthStore,
} from '../../../features/auth/store/authStore'
import { TopupModal } from '../../../features/auth/components/TopupModal'
import { getSfxMuted, setSfxMuted, sfx, subscribeSfx } from '../../lib/sfx'
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
  const muted = useSyncExternalStore(subscribeSfx, getSfxMuted, getSfxMuted)

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

      <div className="header-tools">
        <button
          type="button"
          className={`sfx-toggle${muted ? ' is-muted' : ''}`}
          aria-pressed={!muted}
          aria-label={muted ? 'Включить звук' : 'Выключить звук'}
          title={muted ? 'Включить звук' : 'Выключить звук'}
          onClick={() => {
            const next = !muted
            setSfxMuted(next)
            if (!next) sfx.blip()
          }}
        >
          {muted ? <SpeakerOffIcon /> : <SpeakerIcon />}
        </button>
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
      </div>

      <TopupModal open={topupOpen} onClose={() => setTopupOpen(false)} />
    </header>
  )
}

function SpeakerIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M4 9h3.2L12 5.2v13.6L7.2 15H4V9zm11.1 3a3.2 3.2 0 0 0-1.6-2.77v5.54A3.2 3.2 0 0 0 15.1 12zm0-6.4v1.7a6 6 0 0 1 0 9.4v1.7a7.7 7.7 0 0 0 0-12.8z"
      />
    </svg>
  )
}

function SpeakerOffIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M4 9h3.2L12 5.2v13.6L7.2 15H4V9zm14.1 3 2.2-2.2-1.2-1.2L16.9 10.8 14.7 8.6l-1.2 1.2 2.2 2.2-2.2 2.2 1.2 1.2 2.2-2.2 2.2 2.2 1.2-1.2-2.2-2.2z"
      />
    </svg>
  )
}
