import { useEffect, useState, type FormEvent } from 'react'
import { ApiError, apiFetch } from '../../../shared/api/client'
import { useAuthStore } from '../../auth/store/authStore'

type PaymentSettings = {
  yooShopId: string
  yooSecretKeyMasked: string | null
  hasSecretKey: boolean
  publicAppUrl: string
  updatedAt: number | null
  configured: boolean
  demoPayments: boolean
  source?: { db: boolean; env: boolean }
}

export function AdminPaymentsPanel() {
  const token = useAuthStore((s) => s.token)
  const [shopId, setShopId] = useState('')
  const [secretKey, setSecretKey] = useState('')
  const [publicAppUrl, setPublicAppUrl] = useState('')
  const [clearSecret, setClearSecret] = useState(false)
  const [settings, setSettings] = useState<PaymentSettings | null>(null)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [ok, setOk] = useState<string | null>(null)

  const load = async () => {
    if (!token) return
    try {
      const data = await apiFetch<{ settings: PaymentSettings }>(
        '/api/admin/payments',
        { token },
      )
      setSettings(data.settings)
      setShopId(data.settings.yooShopId)
      setPublicAppUrl(data.settings.publicAppUrl)
      setSecretKey('')
      setClearSecret(false)
      setError(null)
    } catch (err) {
      const raw =
        err instanceof ApiError
          ? err.message
          : 'Не удалось загрузить настройки'
      setError(
        raw.includes('Cannot GET') || raw.includes('<!DOCTYPE')
          ? 'API ещё без маршрута ЮKassa. Перезапусти сервер (npm run dev:api) или задеплой API на Railway.'
          : raw,
      )
    }
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!token) return
    setPending(true)
    setError(null)
    setOk(null)
    try {
      const body: Record<string, unknown> = {
        yooShopId: shopId.trim(),
        publicAppUrl: publicAppUrl.trim(),
      }
      if (clearSecret) body.clearSecretKey = true
      else if (secretKey.trim()) body.yooSecretKey = secretKey.trim()

      const data = await apiFetch<{ settings: PaymentSettings }>(
        '/api/admin/payments',
        {
          method: 'PUT',
          token,
          body: JSON.stringify(body),
        },
      )
      setSettings(data.settings)
      setShopId(data.settings.yooShopId)
      setPublicAppUrl(data.settings.publicAppUrl)
      setSecretKey('')
      setClearSecret(false)
      setOk(
        data.settings.configured
          ? 'Сохранено. ЮKassa активна.'
          : 'Сохранено. Для оплаты нужны shopId и секретный ключ.',
      )
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : 'Не удалось сохранить',
      )
    } finally {
      setPending(false)
    }
  }

  return (
    <section className="admin-payments">
      <header className="section-head">
        <div>
          <h2>ЮKassa</h2>
          <p className="form-hint">
            shopId и секретный ключ магазина. Ключ в API не показывается
            целиком — только маска. Значения из админки имеют приоритет над
            `.env`.
          </p>
        </div>
        {settings && (
          <span
            className={`admin-pay-status${settings.configured ? ' is-on' : ''}`}
          >
            {settings.configured ? 'Подключено' : 'Не настроено'}
          </span>
        )}
      </header>

      {settings && (
        <ul className="admin-pay-meta">
          <li>
            Источник:{' '}
            {settings.source?.db
              ? 'база (админка)'
              : settings.source?.env
                ? 'переменные окружения'
                : '—'}
          </li>
          <li>
            Демо-оплата: {settings.demoPayments ? 'включена' : 'выключена'}{' '}
            <span className="form-hint">(DEMO_PAYMENTS в .env)</span>
          </li>
          {settings.hasSecretKey && (
            <li>Секрет: {settings.yooSecretKeyMasked}</li>
          )}
        </ul>
      )}

      <form className="admin-payments-form" onSubmit={onSubmit}>
        <label className="auth-field">
          shopId
          <input
            className="text-input"
            value={shopId}
            onChange={(e) => setShopId(e.target.value)}
            placeholder="Например 123456"
            autoComplete="off"
          />
        </label>

        <label className="auth-field">
          Секретный ключ
          <input
            className="text-input"
            type="password"
            value={secretKey}
            onChange={(e) => {
              setSecretKey(e.target.value)
              if (e.target.value) setClearSecret(false)
            }}
            placeholder={
              settings?.hasSecretKey
                ? 'Оставь пустым, чтобы не менять'
                : 'live_… или test_…'
            }
            autoComplete="new-password"
            disabled={clearSecret}
          />
        </label>

        {settings?.hasSecretKey && (
          <label className="admin-pay-clear">
            <input
              type="checkbox"
              checked={clearSecret}
              onChange={(e) => {
                setClearSecret(e.target.checked)
                if (e.target.checked) setSecretKey('')
              }}
            />
            Удалить сохранённый секретный ключ
          </label>
        )}

        <label className="auth-field">
          URL сайта (return после оплаты)
          <input
            className="text-input"
            value={publicAppUrl}
            onChange={(e) => setPublicAppUrl(e.target.value)}
            placeholder="https://your-app.vercel.app"
            autoComplete="off"
          />
        </label>

        {error && <p className="form-error">{error}</p>}
        {ok && <p className="form-ok">{ok}</p>}

        <div className="admin-balance-form__actions">
          <button
            type="submit"
            className="btn btn--primary"
            disabled={pending}
          >
            {pending ? 'Сохранение…' : 'Сохранить'}
          </button>
        </div>
      </form>

      <p className="form-hint">
        В кабинете ЮKassa укажи webhook:{' '}
        <code>/api/payments/webhook</code> на URL твоего API.
      </p>
    </section>
  )
}
