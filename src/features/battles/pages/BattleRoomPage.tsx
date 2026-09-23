import { useMemo, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { getCaseById } from '../../cases/data/cases'
import { usePlayerStore } from '../../inventory/store/playerStore'
import { canStart, entryFeeFor } from '../services/battleRoom'
import { useBattleStore } from '../store/battleStore'
import type { BotLuck } from '../types'
import { sfx } from '../../../shared/lib/sfx'
import { BattleArena } from '../components/BattleArena'
import { BattleResult } from '../components/BattleResult'

export function BattleRoomPage() {
  const { battleId = '' } = useParams()
  const navigate = useNavigate()
  const room = useBattleStore((s) => s.rooms[battleId])
  const addBot = useBattleStore((s) => s.addBot)
  const addHotseat = useBattleStore((s) => s.addHotseat)
  const toggleReady = useBattleStore((s) => s.toggleReady)
  const startBattle = useBattleStore((s) => s.startBattle)
  const rematch = useBattleStore((s) => s.rematch)
  const balance = usePlayerStore((s) => s.balance)

  const [error, setError] = useState<string | null>(null)

  const fee = useMemo(
    () => (room ? entryFeeFor(room.config.caseIds, (id) => getCaseById(id)?.price ?? 0) : 0),
    [room],
  )

  if (!room) {
    return <Navigate to="/battles" replace />
  }

  if (room.status === 'running') {
    return <BattleArena battleId={room.id} />
  }

  if (room.status === 'finished') {
    return (
      <BattleResult
        battleId={room.id}
        onRematch={() => {
          const id = rematch(room.id)
          if (id) navigate(`/battles/${id}`)
        }}
      />
    )
  }

  const readyOk = canStart(room)
  const you = room.players.find((p) => p.kind === 'local')

  return (
    <div className="page battle-lobby-page">
      <Link to="/battles" className="back-link">
        ← К баттлам
      </Link>

      <section className="battle-lobby">
        <header className="battle-lobby__head">
          <div>
            <h1>Лобби баттла</h1>
            <p>
              Highest · {room.config.maxPlayers} слота · вход {fee} Мора · код{' '}
              <strong className="invite-code">{room.inviteCode}</strong>
            </p>
          </div>
          <button
            type="button"
            className="btn btn--ghost"
            onClick={() => {
              void navigator.clipboard?.writeText(
                `${window.location.origin}/battles/${room.id}`,
              )
            }}
          >
            Копировать ссылку
          </button>
        </header>

        <div className="battle-lobby__cases">
          {room.config.caseIds.map((id, i) => {
            const c = getCaseById(id)
            return (
              <div key={`${id}-${i}`} className="mini-case" style={{ background: c?.theme }}>
                {c?.image && <img className="mini-case__img" src={c.image} alt="" />}
                <span>R{i + 1}</span>
                <strong>{c?.name ?? id}</strong>
                <em>{c?.price ?? 0} Мора</em>
              </div>
            )
          })}
        </div>

        <div className="slot-grid">
          {Array.from({ length: room.config.maxPlayers }).map((_, i) => {
            const player = room.players[i]
            if (!player) {
              return (
                <div key={`empty-${i}`} className="player-slot player-slot--empty">
                  <span>Слот {i + 1}</span>
                  <p>Пусто</p>
                </div>
              )
            }
            return (
              <div
                key={player.id}
                className={`player-slot${player.ready ? ' player-slot--ready' : ''}`}
              >
                <div className="player-slot__top">
                  <strong>{player.name}</strong>
                  <span className="player-slot__kind">
                    {player.kind}
                    {player.luck ? ` · ${player.luck}` : ''}
                  </span>
                </div>
                <p className={player.ready ? 'ready-on' : 'ready-off'}>
                  {player.ready ? 'Ready' : 'Not ready'}
                </p>
                {(player.kind === 'local' || player.kind === 'hotseat') && (
                  <button
                    type="button"
                    className="btn btn--tiny"
                    onClick={() => toggleReady(room.id, player.id)}
                  >
                    {player.ready ? 'Unready' : 'Ready'}
                  </button>
                )}
              </div>
            )
          })}
        </div>

        <div className="battle-lobby__tools">
          <button
            type="button"
            className="btn btn--ghost"
            disabled={room.players.length >= room.config.maxPlayers}
            onClick={() => addBot(room.id)}
          >
            + Бот
          </button>
          <button
            type="button"
            className="btn btn--ghost"
            disabled={room.players.length >= room.config.maxPlayers}
            onClick={() => addBot(room.id, 'hot' as BotLuck)}
          >
            + Hot-бот
          </button>
          <button
            type="button"
            className="btn btn--ghost"
            disabled={room.players.length >= room.config.maxPlayers}
            onClick={() => addHotseat(room.id)}
          >
            + Hot-seat
          </button>
        </div>

        <div className="battle-lobby__cta">
          {you && (
            <button
              type="button"
              className="btn btn--ghost"
              onClick={() => toggleReady(room.id, you.id)}
            >
              {you.ready ? 'Unready' : 'Ready'}
            </button>
          )}
          <button
            type="button"
            className="btn btn--primary btn--xl"
            disabled={!readyOk || balance < fee}
            onClick={() => {
              sfx.unlock()
              const result = startBattle(room.id)
              if (!result.ok) setError(result.reason)
            }}
          >
            Start · {fee} Мора
          </button>
        </div>
        {!readyOk && <p className="form-hint">Нужны ≥2 игрока и все Ready.</p>}
        {balance < fee && <p className="form-error">Не хватает баланса на вход.</p>}
        {error && <p className="form-error">{error}</p>}
        <p className="form-hint">Выход после старта = forfeit. Seed: {room.seed}</p>
      </section>
    </div>
  )
}
