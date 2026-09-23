import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { getCaseById } from '../../cases/data/cases'
import { useAuthStore, selectSessionUser } from '../../auth/store/authStore'
import { usePlayerStore } from '../../inventory/store/playerStore'
import { canStart, entryFeeFor, youPlayer } from '../services/battleRoom'
import { useBattleStore } from '../store/battleStore'
import { formatLabel, type BotLuck, type TeamId } from '../types'
import { sfx } from '../../../shared/lib/sfx'
import { BattleArena } from '../components/BattleArena'
import { BattleResult } from '../components/BattleResult'

export function BattleRoomPage() {
  const { battleId = '' } = useParams()
  const navigate = useNavigate()
  const me = useAuthStore(selectSessionUser)
  const room = useBattleStore((s) => s.rooms[battleId])
  const refreshRoom = useBattleStore((s) => s.refreshRoom)
  const joinBattle = useBattleStore((s) => s.joinBattle)
  const leaveBattle = useBattleStore((s) => s.leaveBattle)
  const addBot = useBattleStore((s) => s.addBot)
  const toggleReady = useBattleStore((s) => s.toggleReady)
  const startBattle = useBattleStore((s) => s.startBattle)
  const rematch = useBattleStore((s) => s.rematch)
  const balance = usePlayerStore((s) => s.balance)

  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(!room)
  const [missing, setMissing] = useState(false)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const r = await refreshRoom(battleId)
      if (cancelled) return
      if (!r) {
        setMissing(true)
        setLoading(false)
        return
      }
      const uid = useAuthStore.getState().user?.id
      const alreadyIn = uid
        ? r.players.some((p) => p.userId === uid)
        : false
      if (
        r.status === 'lobby' &&
        !alreadyIn &&
        r.players.length < r.maxPlayers
      ) {
        await joinBattle(battleId)
      }
      setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [battleId, refreshRoom, joinBattle])

  useEffect(() => {
    if (!battleId) return
    const ms = room?.status === 'running' ? 1500 : 2000
    // Arena owns the running poll; keep a slower backup here for lobby/result.
    if (room?.status === 'running') return
    const t = window.setInterval(() => void refreshRoom(battleId), ms)
    return () => window.clearInterval(t)
  }, [battleId, refreshRoom, room?.status])

  const fee = useMemo(
    () => (room ? entryFeeFor(room.caseIds) : 0),
    [room],
  )

  if (missing) {
    return <Navigate to="/battles" replace />
  }

  if (loading || !room) {
    return (
      <div className="page">
        <p className="form-hint">Загрузка лобби…</p>
      </div>
    )
  }

  if (room.status === 'running') {
    return <BattleArena battleId={room.id} />
  }

  if (room.status === 'finished') {
    return (
      <BattleResult
        battleId={room.id}
        onRematch={() => {
          void (async () => {
            const id = await rematch(room.id)
            if (id) navigate(`/battles/${id}`)
          })()
        }}
      />
    )
  }

  if (room.status === 'cancelled') {
    return <Navigate to="/battles" replace />
  }

  const readyOk = canStart(room)
  const you = youPlayer(room, me?.id)
  const isHost = room.hostUserId === me?.id
  const isSpectator = !you

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
              {formatLabel(room)} · Highest · вход {fee} Мора · код{' '}
              <strong className="invite-code">{room.inviteCode}</strong>
              {isSpectator ? ' · просмотр' : ''}
            </p>
          </div>
          <button
            type="button"
            className="btn btn--ghost"
            onClick={() => {
              void navigator.clipboard?.writeText(room.inviteCode)
            }}
          >
            Копировать код
          </button>
        </header>

        <div className="battle-lobby__cases">
          {room.caseIds.map((id, i) => {
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

        {(room.teamSize ?? 1) > 1 ? (
          <div className="team-lobby">
            {(['A', 'B'] as TeamId[]).map((teamId) => {
              const teamPlayers = room.players.filter((p) => p.teamId === teamId)
              return (
                <div key={teamId} className={`team-column team-column--${teamId}`}>
                  <h3>Команда {teamId}</h3>
                  <div className="slot-grid slot-grid--team">
                    {Array.from({ length: room.teamSize }).map((_, i) => {
                      const player = teamPlayers[i]
                      if (!player) {
                        return (
                          <div
                            key={`empty-${teamId}-${i}`}
                            className="player-slot player-slot--empty"
                          >
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
                              {player.userId === room.hostUserId ? ' · host' : ''}
                            </span>
                          </div>
                          <p className={player.ready ? 'ready-on' : 'ready-off'}>
                            {player.ready ? 'Ready' : 'Not ready'}
                          </p>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="slot-grid">
            {Array.from({ length: room.maxPlayers }).map((_, i) => {
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
                      {player.userId === room.hostUserId ? ' · host' : ''}
                    </span>
                  </div>
                  <p className={player.ready ? 'ready-on' : 'ready-off'}>
                    {player.ready ? 'Ready' : 'Not ready'}
                  </p>
                </div>
              )
            })}
          </div>
        )}

        {isHost && (
          <div className="battle-lobby__tools">
            <button
              type="button"
              className="btn btn--ghost"
              disabled={room.players.length >= room.maxPlayers}
              onClick={() => void addBot(room.id)}
            >
              + Бот
            </button>
            <button
              type="button"
              className="btn btn--ghost"
              disabled={room.players.length >= room.maxPlayers}
              onClick={() => void addBot(room.id, 'hot' as BotLuck)}
            >
              + Hot-бот
            </button>
          </div>
        )}

        <div className="battle-lobby__cta">
          {you && (
            <button
              type="button"
              className="btn btn--ghost"
              onClick={() => void toggleReady(room.id)}
            >
              {you.ready ? 'Unready' : 'Ready'}
            </button>
          )}
          {you && (
            <button
              type="button"
              className="btn btn--ghost"
              onClick={() => {
                void (async () => {
                  const result = await leaveBattle(room.id)
                  if (result.ok) navigate('/battles')
                  else setError(result.reason)
                })()
              }}
            >
              Выйти
            </button>
          )}
          {isSpectator && room.players.length < room.maxPlayers && (
            <button
              type="button"
              className="btn btn--primary"
              onClick={() => {
                void (async () => {
                  const result = await joinBattle(room.id)
                  if (!result.ok) setError(result.reason)
                })()
              }}
            >
              Присоединиться · {fee} Мора
            </button>
          )}
          {isHost && (
            <button
              type="button"
              className="btn btn--primary btn--xl"
              disabled={!readyOk || balance < fee}
              onClick={() => {
                sfx.unlock()
                void (async () => {
                  const result = await startBattle(room.id)
                  if (!result.ok) setError(result.reason)
                })()
              }}
            >
              Start · {fee} Мора с каждого
            </button>
          )}
        </div>
        {!readyOk && !isSpectator && (
          <p className="form-hint">Нужны ≥2 игрока и все Ready.</p>
        )}
        {isHost && balance < fee && (
          <p className="form-error">Не хватает баланса на вход.</p>
        )}
        {error && <p className="form-error">{error}</p>}
        <p className="form-hint">
          Раунды идут автоматически у всех зрителей. Seed: {room.seed}
        </p>
      </section>
    </div>
  )
}
