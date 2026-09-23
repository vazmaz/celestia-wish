import { useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore, selectSessionUser } from '../store/authStore'
import { useAuthHydrated } from '../hooks/useAuthHydrated'

export function LoginPage() {
  const hydrated = useAuthHydrated()
  const login = useAuthStore((s) => s.login)
  const user = useAuthStore(selectSessionUser)
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from ?? '/'

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  if (!hydrated) {
    return (
      <div className="auth-boot">
        <p>Загрузка…</p>
      </div>
    )
  }

  if (user) {
    return <Navigate to={from} replace />
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setPending(true)
    setError(null)
    const result = await login(username, password)
    setPending(false)
    if (!result.ok) {
      setError(result.reason)
      return
    }
    navigate(from, { replace: true })
  }

  return (
    <div className="auth-page">
      <form className="auth-card" onSubmit={onSubmit}>
        <p className="auth-card__brand">Celestia Wish</p>
        <h1>Вход</h1>
        <p className="form-hint">Логин и пароль для твоего аккаунта.</p>

        <label className="auth-field">
          Логин
          <input
            className="text-input"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            required
          />
        </label>
        <label className="auth-field">
          Пароль
          <input
            className="text-input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </label>

        {error && <p className="form-error">{error}</p>}

        <button type="submit" className="btn btn--primary btn--xl" disabled={pending}>
          {pending ? 'Вход…' : 'Войти'}
        </button>

        <p className="auth-card__foot">
          Нет аккаунта? <Link to="/register">Регистрация</Link>
        </p>
      </form>
    </div>
  )
}
