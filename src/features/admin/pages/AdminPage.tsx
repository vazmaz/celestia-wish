import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { RARITY_META, RARITY_ORDER } from '../../cases/data/rarities'
import { useAuthStore, selectSessionUser } from '../../auth/store/authStore'
import { STARTING_BALANCE, type UserAccount } from '../../auth/types'
import { AdminSupportPanel } from '../../support/components/AdminSupportPanel'
import {
  selectOpenTicketCount,
  useSupportStore,
} from '../../support/store/supportStore'
import type { Rarity } from '../../../shared/types'

type AdminTab = 'users' | 'support'

function inventoryStats(user: UserAccount) {
  const byRarity = RARITY_ORDER.reduce(
    (acc, rarity) => {
      acc[rarity] = user.inventory.filter((i) => i.rarity === rarity).length
      return acc
    },
    {} as Record<Rarity, number>,
  )
  const totalValue = user.inventory.reduce((s, i) => s + i.value, 0)
  return { byRarity, totalValue, count: user.inventory.length }
}

export function AdminPage() {
  const users = useAuthStore((s) => s.users)
  const adminSetBalance = useAuthStore((s) => s.adminSetBalance)
  const adminCreateUser = useAuthStore((s) => s.adminCreateUser)
  const loadUsers = useAuthStore((s) => s.loadUsers)
  const me = useAuthStore(selectSessionUser)
  const openTickets = useSupportStore(selectOpenTicketCount)
  const ticketTotal = useSupportStore((s) => s.tickets.length)

  const [tab, setTab] = useState<AdminTab>(
    openTickets > 0 ? 'support' : 'users',
  )
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [balanceDraft, setBalanceDraft] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [newLogin, setNewLogin] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newBalance, setNewBalance] = useState(String(STARTING_BALANCE))
  const [createPending, setCreatePending] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [createOk, setCreateOk] = useState<string | null>(null)

  useEffect(() => {
    void loadUsers()
  }, [loadUsers])

  const sorted = useMemo(
    () =>
      [...users].sort((a, b) => {
        if (a.role !== b.role) return a.role === 'admin' ? -1 : 1
        return a.username.localeCompare(b.username)
      }),
    [users],
  )

  const selected = sorted.find((u) => u.id === selectedId) ?? sorted[0] ?? null
  const stats = selected ? inventoryStats(selected) : null

  const openUser = (user: UserAccount) => {
    setSelectedId(user.id)
    setBalanceDraft(String(user.balance))
    setMessage(null)
    setError(null)
  }

  const onSaveBalance = async (e: FormEvent) => {
    e.preventDefault()
    if (!selected) return
    const value = Number(balanceDraft)
    const result = await adminSetBalance(selected.id, value)
    if (!result.ok) {
      setError(result.reason)
      setMessage(null)
      return
    }
    setMessage(`Баланс ${selected.username} обновлён: ${Math.floor(value)} Мора`)
    setError(null)
  }

  const onCreateUser = async (e: FormEvent) => {
    e.preventDefault()
    setCreatePending(true)
    setCreateError(null)
    setCreateOk(null)
    const result = await adminCreateUser(
      newLogin,
      newPassword,
      Number(newBalance),
    )
    setCreatePending(false)
    if (!result.ok) {
      setCreateError(result.reason)
      return
    }
    const name = newLogin.trim().toLowerCase()
    setCreateOk(`Создан @${name}`)
    setSelectedId(result.userId)
    setBalanceDraft(String(Math.floor(Number(newBalance)) || STARTING_BALANCE))
    setNewLogin('')
    setNewPassword('')
    setNewBalance(String(STARTING_BALANCE))
  }

  return (
    <div className="page admin-page">
      <header className="section-head section-head--row">
        <div>
          <h1>Админка</h1>
          <p>
            Пользователи, балансы, инвентарь и поддержка. Вы вошли как{' '}
            <strong>{me?.username}</strong>.
          </p>
          <p className="form-hint admin-local-hint">
            Аккаунты и балансы хранятся на сервере (Railway + Postgres).
            Обращения поддержки пока в localStorage браузера.
          </p>
        </div>
        <Link to="/" className="btn btn--ghost">
          К сайту
        </Link>
      </header>

      <div className="admin-tabs" role="tablist" aria-label="Разделы админки">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'users'}
          className={`admin-tab${tab === 'users' ? ' is-active' : ''}`}
          onClick={() => setTab('users')}
        >
          Пользователи
          <span className="admin-tab__count">{sorted.length}</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'support'}
          className={`admin-tab${tab === 'support' ? ' is-active' : ''}`}
          onClick={() => setTab('support')}
        >
          Поддержка
          <span
            className={`admin-tab__count${openTickets > 0 ? ' is-alert' : ''}`}
          >
            {openTickets > 0 ? openTickets : ticketTotal}
          </span>
        </button>
      </div>

      {tab === 'support' && <AdminSupportPanel />}

      {tab === 'users' && (
        <>
          <form className="admin-create-user" onSubmit={onCreateUser}>
            <h2>Создать пользователя</h2>
            <p className="form-hint">
              Аккаунт сразу появляется в общей базе на сервере. Клиент сможет
              войти с любого устройства.
            </p>
            <div className="admin-create-user__row">
              <label className="auth-field">
                Логин
                <input
                  className="text-input"
                  value={newLogin}
                  onChange={(e) => setNewLogin(e.target.value)}
                  minLength={3}
                  required
                  autoComplete="off"
                />
              </label>
              <label className="auth-field">
                Пароль
                <input
                  className="text-input"
                  type="text"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  minLength={4}
                  required
                  autoComplete="off"
                />
              </label>
              <label className="auth-field">
                Баланс
                <input
                  className="text-input"
                  type="number"
                  min={0}
                  step={1}
                  value={newBalance}
                  onChange={(e) => setNewBalance(e.target.value)}
                  required
                />
              </label>
              <button
                type="submit"
                className="btn btn--primary"
                disabled={createPending}
              >
                {createPending ? 'Создание…' : 'Создать'}
              </button>
            </div>
            {createError && <p className="form-error">{createError}</p>}
            {createOk && <p className="form-ok">{createOk}</p>}
          </form>

          <div className="admin-layout">
            <section className="admin-users">
              <h2>Пользователи ({sorted.length})</h2>
              <div className="admin-user-list">
                {sorted.map((user) => {
                  const st = inventoryStats(user)
                  const active = selected?.id === user.id
                  return (
                    <button
                      key={user.id}
                      type="button"
                      className={`admin-user-row${active ? ' is-active' : ''}`}
                      onClick={() => openUser(user)}
                    >
                      <div>
                        <strong>
                          {user.username}
                          {user.role === 'admin' && (
                            <span className="admin-badge">admin</span>
                          )}
                        </strong>
                        <p>
                          {user.balance.toLocaleString('ru-RU')} Мора ·{' '}
                          {st.count} предм.
                        </p>
                      </div>
                    </button>
                  )
                })}
              </div>
            </section>

            {selected && stats && (
              <section className="admin-detail">
                <h2>@{selected.username}</h2>
                <p className="form-hint">
                  Роль: {selected.role} · создан{' '}
                  {new Date(selected.createdAt).toLocaleString('ru-RU')}
                </p>

                <form className="admin-balance-form" onSubmit={onSaveBalance}>
                  <label className="auth-field">
                    Баланс (Мора)
                    <input
                      className="text-input"
                      type="number"
                      min={0}
                      step={1}
                      value={balanceDraft}
                      onChange={(e) => setBalanceDraft(e.target.value)}
                    />
                  </label>
                  <div className="admin-balance-form__actions">
                    <button type="submit" className="btn btn--primary">
                      Сохранить баланс
                    </button>
                    <button
                      type="button"
                      className="btn btn--ghost"
                      onClick={() =>
                        setBalanceDraft(String(selected.balance + 1000))
                      }
                    >
                      +1000 в поле
                    </button>
                  </div>
                </form>

                {message && <p className="form-ok">{message}</p>}
                {error && <p className="form-error">{error}</p>}

                <div className="admin-inv-summary">
                  <h3>Инвентарь</h3>
                  <p>
                    {stats.count} предметов · суммарная стоимость{' '}
                    {stats.totalValue.toLocaleString('ru-RU')} Мора
                  </p>
                  <div className="inventory-stats">
                    {RARITY_ORDER.map((rarity) =>
                      stats.byRarity[rarity] > 0 ? (
                        <span
                          key={rarity}
                          className={`inventory-stats__chip rarity-${rarity}`}
                        >
                          {RARITY_META[rarity].label}: {stats.byRarity[rarity]}
                        </span>
                      ) : null,
                    )}
                  </div>
                </div>

                {selected.inventory.length === 0 ? (
                  <p className="form-hint">Инвентарь пуст.</p>
                ) : (
                  <div className="admin-inv-table-wrap">
                    <table className="admin-inv-table">
                      <thead>
                        <tr>
                          <th>Предмет</th>
                          <th>Редкость</th>
                          <th>Цена</th>
                          <th>Источник</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selected.inventory.map((item) => (
                          <tr key={item.uid}>
                            <td>
                              <div className="admin-inv-item">
                                <img src={item.image} alt="" />
                                {item.name}
                              </div>
                            </td>
                            <td
                              style={{ color: RARITY_META[item.rarity].color }}
                            >
                              {RARITY_META[item.rarity].label}
                            </td>
                            <td>{item.value}</td>
                            <td>{item.source ?? '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            )}
          </div>
        </>
      )}
    </div>
  )
}
