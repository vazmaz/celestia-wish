import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CASES, getCaseById } from '../../cases/data/cases'
import { usePlayerStore } from '../../inventory/store/playerStore'
import { entryFeeFor } from '../services/battleRoom'
import { useBattleStore } from '../store/battleStore'
import type { BattlePrivacy } from '../types'

export function BattlesPage() {
  const navigate = useNavigate()
  const balance = usePlayerStore((s) => s.balance)
  const rooms = useBattleStore((s) => s.rooms)
  const history = useBattleStore((s) => s.history)
  const createBattle = useBattleStore((s) => s.createBattle)
  const findByInvite = useBattleStore((s) => s.findByInvite)

  const publicLobbies = useMemo(
    () =>
      Object.values(rooms).filter(
        (r) => r.status === 'lobby' && r.config.privacy === 'public',
      ),
    [rooms],
  )

  const [maxPlayers, setMaxPlayers] = useState<2 | 3 | 4>(2)
  const [selected, setSelected] = useState<string[]>([CASES[0].id])
  const [privacy, setPrivacy] = useState<BattlePrivacy>('public')
  const [fillBots, setFillBots] = useState(true)
  const [invite, setInvite] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)

  const fee = entryFeeFor(selected, (id) => getCaseById(id)?.price ?? 0)

  const toggleCase = (id: string) => {
    setSelected((prev) => {
      if (prev.includes(id)) {
        return prev.length === 1 ? prev : prev.filter((x) => x !== id)
      }
      if (prev.length >= 8) return prev
      return [...prev, id]
    })
  }

  const handleCreate = () => {
    const result = createBattle({ maxPlayers, caseIds: selected, privacy, fillBots })
    if (!result.ok) {
      setError(result.reason)
      return
    }
    navigate(`/battles/${result.id}`)
  }

  const handleJoinCode = () => {
    const room = findByInvite(invite.trim())
    if (!room) {
      setError('Лобби с таким кодом не найдено')
      return
    }
    navigate(`/battles/${room.id}`)
  }

  return (
    <div className="page battles-page">
      <header className="section-head section-head--row">
        <div>
          <h1>Case Battle</h1>
          <p>
            Все открывают одинаковые баннеры. Highest — победитель забирает весь пул предметов
            (фан-режим в духе Genshin).
          </p>
        </div>
        <button
          type="button"
          className="btn btn--primary"
          onClick={() => {
            setShowCreate(true)
            setError(null)
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
        <button type="button" className="btn btn--ghost" onClick={handleJoinCode}>
          Войти по ссылке
        </button>
      </div>

      {showCreate && (
        <section className="battle-create">
          <h2>Новый баттл</h2>
          <div className="battle-create__grid">
            <label>
              Игроки
              <select
                value={maxPlayers}
                onChange={(e) => setMaxPlayers(Number(e.target.value) as 2 | 3 | 4)}
              >
                <option value={2}>1v1</option>
                <option value={3}>1v1v1</option>
                <option value={4}>1v1v1v1</option>
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
              Заполнить ботами
            </label>
          </div>

          <p className="form-hint">Кейсы (1–8). Режим победы: Highest.</p>
          <div className="battle-case-picker">
            {CASES.map((c) => {
              const on = selected.includes(c.id)
              return (
                <button
                  key={c.id}
                  type="button"
                  className={`battle-case-chip${on ? ' is-on' : ''}`}
                  onClick={() => toggleCase(c.id)}
                >
                  <img src={c.image} alt="" className="battle-case-chip__img" />
                  <strong>{c.name}</strong>
                  <span>{c.price} Мора</span>
                </button>
              )
            })}
          </div>

          <div className="battle-create__footer">
            <div>
              <span className="form-hint">Вход (сумма кейсов)</span>
              <strong className="fee-value">{fee} Мора</strong>
              <span className="form-hint">Баланс: {balance.toLocaleString('ru-RU')} Мора</span>
            </div>
            <div className="battle-create__actions">
              <button type="button" className="btn btn--ghost" onClick={() => setShowCreate(false)}>
                Отмена
              </button>
              <button type="button" className="btn btn--primary" onClick={handleCreate}>
                Создать баттл
              </button>
            </div>
          </div>
          {error && <p className="form-error">{error}</p>}
        </section>
      )}

      <section>
        <h2 className="subhead">Публичные лобби</h2>
        {publicLobbies.length === 0 ? (
          <p className="form-hint">Пока пусто — создай баттл.</p>
        ) : (
          <div className="lobby-list">
            {publicLobbies.map((room) => {
              const feeRoom = entryFeeFor(room.config.caseIds, (id) => getCaseById(id)?.price ?? 0)
              return (
                <Link key={room.id} to={`/battles/${room.id}`} className="lobby-card">
                  <div>
                    <strong>
                      {room.players.length}/{room.config.maxPlayers} игроков
                    </strong>
                    <p>
                      {room.config.caseIds.length} кейс(ов) · {feeRoom} Мора · Highest
                    </p>
                  </div>
                  <span className="lobby-card__code">{room.inviteCode}</span>
                </Link>
              )
            })}
          </div>
        )}
      </section>

      <section>
        <h2 className="subhead">История баттлов</h2>
        {history.length === 0 ? (
          <p className="form-hint">После первого матча история появится здесь.</p>
        ) : (
          <div className="history-list">
            {history.map((h) => (
              <div key={h.id} className={`history-card${h.youWon ? ' history-card--win' : ''}`}>
                <div>
                  <strong>{h.youWon ? 'Победа' : 'Поражение'} · {h.winnerName}</strong>
                  <p>
                    Пул {h.poolValue} Мора · вход {h.entryFee} Мора ·{' '}
                    {new Date(h.finishedAt).toLocaleString('ru-RU')}
                  </p>
                </div>
                <div className="history-card__scores">
                  {h.players.map((p) => (
                    <span key={p.id}>
                      {p.name}: {p.total}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
