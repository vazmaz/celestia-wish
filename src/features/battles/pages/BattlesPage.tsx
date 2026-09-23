import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CASES, getCaseById } from '../../cases/data/cases'
import { CrystalAmount } from '../../../shared/components/brand/CrystalAmount'
import { usePlayerStore } from '../../inventory/store/playerStore'
import { entryFeeFor } from '../services/battleRoom'
import { useBattleStore } from '../store/battleStore'
import type { BattleFormat, BattlePrivacy, BattleRoomState } from '../types'
import { formatLabel } from '../types'

const THUMB_LIMIT = 5

function caseGroups(caseIds: string[]) {
  const groups: { id: string; count: number; name: string; image?: string }[] = []
  for (const id of caseIds) {
    const last = groups[groups.length - 1]
    if (last?.id === id) {
      last.count += 1
      continue
    }
    const c = getCaseById(id)
    groups.push({
      id,
      count: 1,
      name: c?.name ?? id,
      image: c?.image,
    })
  }
  return groups
}

function CaseThumbs({ caseIds }: { caseIds: string[] }) {
  const groups = caseGroups(caseIds)
  const shown = groups.slice(0, THUMB_LIMIT)
  const extra = groups.length - shown.length
  return (
    <div className="lobby-card__thumbs" aria-hidden>
      {shown.map((group, index) => (
        <span
          key={`${group.id}-${index}`}
          className="lobby-thumb"
          title={
            group.count > 1 ? `${group.name} ×${group.count}` : group.name
          }
        >
          {group.image && <img src={group.image} alt="" />}
          {group.count > 1 && <em>×{group.count}</em>}
        </span>
      ))}
      {extra > 0 && <span className="lobby-thumb lobby-thumb--more">+{extra}</span>}
    </div>
  )
}

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
                    <span>{c.price} кристаллов</span>
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
            <p className="form-hint">Очередь раундов · {selected.length}</p>
            <ol className="battle-round-queue__list">
              {selected.map((id, index) => {
                const c = getCaseById(id)
                return (
                  <li key={`${id}-${index}`}>
                    {c?.image && (
                      <img src={c.image} alt="" className="battle-round-queue__img" />
                    )}
                    <span className="battle-round-queue__n">{index + 1}</span>
                    <button
                      type="button"
                      className="battle-round-queue__remove"
                      disabled={selected.length <= 1}
                      onClick={() => removeRoundAt(index)}
                      aria-label={`Убрать раунд ${index + 1}, ${c?.name ?? id}`}
                      title={`${c?.name ?? id} · ${c?.price ?? 0} кристаллов`}
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
              <strong className="fee-value">{fee} кристаллов</strong>
              <span className="form-hint">
                Баланс: {balance.toLocaleString('ru-RU')} кристаллов
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
            {openSeats.map((room) => (
              <BattleFeedCard
                key={room.id}
                room={room}
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
              />
            ))}
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
              <BattleFeedCard key={room.id} room={room} live />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function BattleFeedCard({
  room,
  live = false,
  onClick,
}: {
  room: BattleRoomState
  live?: boolean
  onClick?: () => void
}) {
  const names = room.players.map((p) => p.name).join(live ? ' vs ' : ', ')
  const title = live
    ? `Раунд ${room.currentRound + 1}/${room.totalRounds}`
    : `${room.players.length}/${room.maxPlayers}`
  const body = (
    <>
      <CaseThumbs caseIds={room.caseIds} />
      <div className="lobby-card__body">
        <strong>
          {formatLabel(room)} · {title}
        </strong>
        <span>{names || 'Ожидание'}</span>
      </div>
      <div className="lobby-card__aside">
        <CrystalAmount value={entryFeeFor(room.caseIds)} />
        <span className="lobby-card__code">
          {live ? 'Смотреть' : room.inviteCode}
        </span>
      </div>
    </>
  )

  if (live) {
    return (
      <Link to={`/battles/${room.id}`} className="lobby-card lobby-card--live">
        {body}
      </Link>
    )
  }

  return (
    <button type="button" className="lobby-card" onClick={onClick}>
      {body}
    </button>
  )
}
