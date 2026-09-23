import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CASES, getCaseById } from '../../cases/data/cases'
import { usePlayerStore } from '../../inventory/store/playerStore'
import { entryFeeFor } from '../services/battleRoom'
import { useBattleStore } from '../store/battleStore'
import type { BattleFormat, BattlePrivacy } from '../types'
import { formatLabel } from '../types'

export function BattlesPage() {
  const navigate = useNavigate()
  const balance = usePlayerStore((s) => s.balance)
  const lobbies = useBattleStore((s) => s.lobbies)
  const live = useBattleStore((s) => s.live)
  const feedError = useBattleStore((s) => s.feedError)
  const loadingFeed = useBattleStore((s) => s.loadingFeed)
  const refreshFeed = useBattleStore((s) => s.refreshFeed)
  const createBattle = useBattleStore((s) => s.createBattle)
  const joinBattle = useBattleStore((s) => s.joinBattle)
  const findByInvite = useBattleStore((s) => s.findByInvite)

  const [format, setFormat] = useState<BattleFormat>('ffa2')
  const [selected, setSelected] = useState<string[]>([CASES[0].id])
  const [privacy, setPrivacy] = useState<BattlePrivacy>('public')
  const [fillBots, setFillBots] = useState(true)
  const [invite, setInvite] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [busy, setBusy] = useState(false)

  const fee = entryFeeFor(selected)
  const counts = useMemo(() => {
    const map = new Map<string, number>()
    for (const id of selected) map.set(id, (map.get(id) ?? 0) + 1)
    return map
  }, [selected])

  useEffect(() => {
    void refreshFeed()
    const t = window.setInterval(() => void refreshFeed(), 3000)
    return () => window.clearInterval(t)
  }, [refreshFeed])

  const addCase = (id: string) => {
    setSelected((prev) => [...prev, id])
  }

  const removeOneCase = (id: string) => {
    setSelected((prev) => {
      const idx = prev.lastIndexOf(id)
      if (idx < 0) return prev
      if (prev.length === 1) return prev
      return [...prev.slice(0, idx), ...prev.slice(idx + 1)]
    })
  }

  const removeRoundAt = (index: number) => {
    setSelected((prev) => {
      if (prev.length <= 1) return prev
      return prev.filter((_, i) => i !== index)
    })
  }

  const handleCreate = async () => {
    setBusy(true)
    setError(null)
    const result = await createBattle({
      format,
      caseIds: selected,
      privacy,
      fillBots,
    })
    setBusy(false)
    if (!result.ok) {
      setError(result.reason)
      return
    }
    navigate(`/battles/${result.id}`)
  }

  const handleJoinCode = async () => {
    setBusy(true)
    setError(null)
    const room = await findByInvite(invite.trim())
    setBusy(false)
    if (!room) {
      setError('Лобби с таким кодом не найдено')
      return
    }
    if (room.status === 'lobby') {
      const joined = await joinBattle(room.id)
      if (!joined.ok) {
        setError(joined.reason)
        return
      }
    }
    navigate(`/battles/${room.id}`)
  }

  const openSeats = useMemo(
    () => lobbies.filter((r) => r.players.length < r.maxPlayers),
    [lobbies],
  )

  return (
    <div className="page battles-page">
      <header className="section-head section-head--row">
        <div>
          <h1>Case Battle</h1>
          <p>
            Публичные лобби видны всем игрокам. Highest — победитель забирает весь
            пул. Можно смотреть live-матчи.
          </p>
        </div>
        <button
          type="button"
          className="btn btn--primary"
          disabled={busy}
          onClick={() => {
            if (!showCreate) {
              setShowCreate(true)
              setError(null)
              return
            }
            void handleCreate()
          }}
        >
          Создать баттл
        </button>
      </header>

      <div className="battle-join-row">
        <input
          className="text-input"
          placeholder="Код инвайта"
          value={invite}
          onChange={(e) => setInvite(e.target.value)}
        />
        <button
          type="button"
          className="btn btn--ghost"
          disabled={busy}
          onClick={() => void handleJoinCode()}
        >
          Войти по коду
        </button>
      </div>
      {feedError && <p className="form-error">{feedError}</p>}
      {error && <p className="form-error">{error}</p>}

      {showCreate && (
        <section className="battle-create">
          <h2>Новый баттл</h2>
          <div className="battle-create__grid">
            <label>
              Формат
              <select
                value={format}
                onChange={(e) => setFormat(e.target.value as BattleFormat)}
              >
                <option value="ffa2">1v1</option>
                <option value="ffa3">1v1v1</option>
                <option value="ffa4">1v1v1v1</option>
                <option value="2v2">2v2 команды</option>
                <option value="3v3">3v3 команды</option>
              </select>
            </label>
            <label>
              Приватность
              <select
                value={privacy}
                onChange={(e) => setPrivacy(e.target.value as BattlePrivacy)}
              >
                <option value="public">Public</option>
                <option value="private">Private</option>
              </select>
            </label>
            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={fillBots}
                onChange={(e) => setFillBots(e.target.checked)}
              />
              Добить ботами при старте
            </label>
          </div>

          <p className="form-hint">
            Кейсы (от 1, без лимита раундов). Один кейс можно добавить несколько
            раз. Режим: Highest.
          </p>
          <div className="battle-case-picker">
            {CASES.map((c) => {
              const count = counts.get(c.id) ?? 0
              return (
                <div
                  key={c.id}
                  className={`battle-case-chip${count > 0 ? ' is-on' : ''}`}
                >
                  <img src={c.image} alt="" className="battle-case-chip__img" />
                  {count > 0 && (
                    <em className="battle-case-chip__count">×{count}</em>
                  )}
                  <div className="battle-case-chip__body">
                    <strong>{c.name}</strong>
                    <span>{c.price} Мора</span>
                  </div>
                  <div className="battle-case-chip__actions">
                    <button
                      type="button"
                      className="btn"
                      disabled={count === 0 || selected.length <= 1}
                      onClick={() => removeOneCase(c.id)}
                      aria-label={`Убрать ${c.name}`}
                    >
                      −
                    </button>
                    <button
                      type="button"
                      className="btn"
                      onClick={() => addCase(c.id)}
                      aria-label={`Добавить ${c.name}`}
                    >
                      +
                    </button>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="battle-round-queue">
            <p className="form-hint">Очередь раундов ({selected.length})</p>
            <ol className="battle-round-queue__list">
              {selected.map((id, index) => {
                const c = getCaseById(id)
                return (
                  <li key={`${id}-${index}`}>
                    <span className="battle-round-queue__n">R{index + 1}</span>
                    {c?.image && (
                      <img src={c.image} alt="" className="battle-round-queue__img" />
                    )}
                    <strong>{c?.name ?? id}</strong>
                    <em>{c?.price ?? 0} Мора</em>
                    <button
                      type="button"
                      className="btn btn--tiny"
                      disabled={selected.length <= 1}
                      onClick={() => removeRoundAt(index)}
                      aria-label={`Убрать раунд ${index + 1}`}
                    >
                      ×
                    </button>
                  </li>
                )
              })}
            </ol>
          </div>

          <div className="battle-create__footer">
            <div>
              <span className="form-hint">Вход (сумма кейсов)</span>
              <strong className="fee-value">{fee} Мора</strong>
              <span className="form-hint">
                Баланс: {balance.toLocaleString('ru-RU')} Мора
              </span>
            </div>
            <div className="battle-create__actions">
              <button
                type="button"
                className="btn btn--ghost"
                onClick={() => setShowCreate(false)}
              >
                Отмена
              </button>
              <button
                type="button"
                className="btn btn--primary"
                disabled={busy}
                onClick={() => void handleCreate()}
              >
                Создать баттл
              </button>
            </div>
          </div>
        </section>
      )}

      <section>
        <h2 className="subhead">
          Публичные лобби
          {loadingFeed ? ' · обновление…' : ''}
        </h2>
        {openSeats.length === 0 ? (
          <p className="form-hint">Пока пусто — создай баттл или зайди по коду.</p>
        ) : (
          <div className="lobby-list">
            {openSeats.map((room) => {
              const feeRoom = entryFeeFor(room.caseIds)
              return (
                <button
                  key={room.id}
                  type="button"
                  className="lobby-card"
                  onClick={() => {
                    void (async () => {
                      const joined = await joinBattle(room.id)
                      if (!joined.ok) {
                        setError(joined.reason)
                        return
                      }
                      navigate(`/battles/${room.id}`)
                    })()
                  }}
                >
                  <div>
                    <strong>
                      {room.players.length}/{room.maxPlayers} игроков
                    </strong>
                    <p>
                      {formatLabel(room)} · {room.caseIds.length} кейс(ов) ·{' '}
                      {feeRoom} Мора · Highest
                      {' · '}
                      {room.players.map((p) => p.name).join(', ')}
                    </p>
                  </div>
                  <span className="lobby-card__code">{room.inviteCode}</span>
                </button>
              )
            })}
          </div>
        )}
      </section>

      <section>
        <h2 className="subhead">Идут сейчас</h2>
        {live.length === 0 ? (
          <p className="form-hint">Нет активных публичных матчей.</p>
        ) : (
          <div className="lobby-list">
            {live.map((room) => (
              <Link
                key={room.id}
                to={`/battles/${room.id}`}
                className="lobby-card lobby-card--live"
              >
                <div>
                  <strong>
                    Live · раунд {room.currentRound + 1}/{room.totalRounds}
                  </strong>
                  <p>
                    {formatLabel(room)} ·{' '}
                    {room.players.map((p) => p.name).join(' vs ')} ·{' '}
                    {entryFeeFor(room.caseIds)} Мора
                  </p>
                </div>
                <span className="lobby-card__code">Смотреть</span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
