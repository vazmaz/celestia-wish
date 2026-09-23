import { useEffect, useState, type FormEvent, type MouseEvent } from 'react'
import { createPortal } from 'react-dom'
import { useAuthStore } from '../store/authStore'
import { usePlayerStore } from '../../inventory/store/playerStore'

const PRESETS = [500, 1000, 5000, 10_000] as const

interface TopupModalProps {
  open: boolean
  onClose: () => void
  /** After return from YooKassa (`?topup=<id>`). */
  pendingTopupId?: string | null
  onPendingHandled?: () => void
}

export function TopupModal({
  open,
  onClose,
  pendingTopupId = null,
  onPendingHandled,
}: TopupModalProps) {
  const createTopup = useAuthStore((s) => s.createTopup)
  const confirmTopupDemo = useAuthStore((s) => s.confirmTopupDemo)
  const syncTopup = useAuthStore((s) => s.syncTopup)
  const listTopups = useAuthStore((s) => s.listTopups)
  const syncFromAuth = usePlayerStore((s) => s.syncFromAuth)

  const [amount, setAmount] = useState(1000)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [ok, setOk] = useState<string | null>(null)
  const [history, setHistory] = useState<
    Array<{
      id: string
      amount: number
      status: string
      createdAt: number
    }>
  >([])

  useEffect(() => {
    if (!open) return
    setError(null)
    void listTopups().then((res) => {
      if (res.ok) setHistory(res.topups)
    })
  }, [open, listTopups])

  useEffect(() => {
    if (!open || !pendingTopupId) return
    let cancelled = false

    const run = async () => {
      setPending(true)
      setError(null)
      setOk('Проверяем оплату…')

      // Webhook may lag a few seconds after redirect.
      for (let i = 0; i < 8; i++) {
        const res = await syncTopup(pendingTopupId)
        if (cancelled) return
        if (!res.ok) {
          setPending(false)
          setOk(null)
          setError(res.reason)
          onPendingHandled?.()
          return
        }
        if (res.status === 'paid') {
          syncFromAuth()
          setPending(false)
          setOk(`Зачислено ${res.amount.toLocaleString('ru-RU')} Мора`)
          const refreshed = await listTopups()
          if (refreshed.ok) setHistory(refreshed.topups)
          onPendingHandled?.()
          return
        }
        if (res.status === 'failed') {
          setPending(false)
          setOk(null)
          setError('Оплата не прошла')
          onPendingHandled?.()
          return
        }
        await new Promise((r) => setTimeout(r, 1500))
      }

      if (cancelled) return
      setPending(false)
      setOk(
        'Платёж ещё обрабатывается. Баланс обновится после подтверждения ЮKassa — обнови страницу через минуту.',
      )
      onPendingHandled?.()
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [
    open,
    pendingTopupId,
    syncTopup,
    syncFromAuth,
    listTopups,
    onPendingHandled,
  ])

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const onOverlayClick = (event: MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) onClose()
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setPending(true)
    setError(null)
    setOk(null)

    const created = await createTopup(amount)
    if (!created.ok) {
      setPending(false)
      setError(created.reason)
      return
    }

    if (created.mode === 'yookassa' && created.confirmationUrl) {
      window.location.href = created.confirmationUrl
      return
    }

    const paid = await confirmTopupDemo(created.topupId)
    setPending(false)
    if (!paid.ok) {
      setError(paid.reason)
      return
    }

    syncFromAuth()
    setOk(`Зачислено ${created.amount.toLocaleString('ru-RU')} Мора`)
    const refreshed = await listTopups()
    if (refreshed.ok) setHistory(refreshed.topups)
  }

  return createPortal(
    <div className="topup-overlay" onClick={onOverlayClick}>
      <div
        className="topup-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="topup-title"
      >
        <header className="topup-modal__head">
          <h2 id="topup-title">Пополнение</h2>
          <button type="button" className="btn btn--tiny" onClick={onClose}>
            Закрыть
          </button>
        </header>

        <p className="form-hint">
          1 Мора = 1 ₽. Оплата через ЮKassa (карта, СБП и др.). После оплаты
          баланс зачисляется автоматически.
        </p>

        <form className="topup-form" onSubmit={onSubmit}>
          <div className="topup-presets">
            {PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                className={`btn btn--ghost${amount === preset ? ' is-active' : ''}`}
                onClick={() => setAmount(preset)}
              >
                {preset.toLocaleString('ru-RU')}
              </button>
            ))}
          </div>

          <label className="auth-field">
            Сумма (Мора / ₽)
            <input
              className="text-input"
              type="number"
              min={100}
              max={1_000_000}
              step={100}
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              required
            />
          </label>

          {error && <p className="form-error">{error}</p>}
          {ok && <p className="form-ok">{ok}</p>}

          <button
            type="submit"
            className="btn btn--primary btn--xl"
            disabled={pending}
          >
            {pending ? 'Обработка…' : 'Оплатить'}
          </button>
        </form>

        {history.length > 0 && (
          <div className="topup-history">
            <h3>История</h3>
            <ul>
              {history.slice(0, 8).map((t) => (
                <li key={t.id}>
                  <span>
                    {t.amount.toLocaleString('ru-RU')} · {t.status}
                  </span>
                  <time>
                    {new Date(t.createdAt).toLocaleString('ru-RU')}
                  </time>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}
