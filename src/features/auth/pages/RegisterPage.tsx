import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useAuthStore, selectSessionUser } from '../store/authStore'
import { useAuthHydrated } from '../hooks/useAuthHydrated'

export function RegisterPage() {
  const hydrated = useAuthHydrated()
  const register = useAuthStore((s) => s.register)
  const user = useAuthStore(selectSessionUser)
  const navigate = useNavigate()

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [password2, setPassword2] = useState('')
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
    return <Navigate to="/" replace />
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (password !== password2) {
      setError('Пароли не совпадают')
      return
    }
    setPending(true)
    setError(null)
    const result = await register(username, password)
    setPending(false)
    if (!result.ok) {
      setError(result.reason)
      return
    }
    navigate('/', { replace: true })
  }

  return (
    <div className="auth-page">
      <form className="auth-card" onSubmit={onSubmit}>
        <p className="auth-card__brand">Celestia Wish</p>
        <h1>Регистрация</h1>
        <p className="form-hint">
          Стартовый баланс: 10 000 Мора. Пополнить можно кнопкой «+» в шапке —
          запись сохраняется на сервере.
        </p>

        <label className="auth-field">
          Логин
          <input
            className="text-input"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            minLength={3}
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
            autoComplete="new-password"
            minLength={4}
            required
          />
        </label>
        <label className="auth-field">
          Повтор пароля
          <input
            className="text-input"
            type="password"
            value={password2}
            onChange={(e) => setPassword2(e.target.value)}
            autoComplete="new-password"
            minLength={4}
            required
          />
        </label>

        {error && <p className="form-error">{error}</p>}

        <button type="submit" className="btn btn--primary btn--xl" disabled={pending}>
          {pending ? 'Создание…' : 'Создать аккаунт'}
        </button>

        <p className="auth-card__foot">
          Уже есть аккаунт? <Link to="/login">Войти</Link>
        </p>
      </form>
    </div>
  )
}
