import { useEffect, useState, type FormEvent } from 'react'
import { useAuthStore } from '../store/authStore'
import { usePlayerStore } from '../../inventory/store/playerStore'

const PRESETS = [500, 1000, 5000, 10_000] as const

interface TopupModalProps {
  open: boolean
  onClose: () => void
}

export function TopupModal({ open, onClose }: TopupModalProps) {
  const createTopup = useAuthStore((s) => s.createTopup)
  const confirmTopupDemo = useAuthStore((s) => s.confirmTopupDemo)
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
    setOk(null)
    void listTopups().then((res) => {
      if (res.ok) setHistory(res.topups)
    })
  }, [open, listTopups])

  if (!open) return null

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

    // Demo: instantly "pay" — replace with YooKassa redirect later.
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

  return (
    <div className="topup-overlay" role="dialog" aria-modal="true">
      <div className="topup-modal">
        <header className="topup-modal__head">
          <h2>Пополнение</h2>
          <button type="button" className="btn btn--tiny" onClick={onClose}>
            Закрыть
          </button>
        </header>

        <p className="form-hint">
          Запись создаётся на сервере. Сейчас включена демо-оплата (без
          платёжки) — баланс сразу увеличивается в Postgres.
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
            Сумма (Мора)
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
            {pending ? 'Обработка…' : 'Пополнить (демо)'}
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
    </div>
  )
}
