import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { RARITY_META } from '../../cases/data/rarities'
import { sfx } from '../../../shared/lib/sfx'
import { selectSessionUser, useAuthStore } from '../../auth/store/authStore'
import { sumPlayerTotals, sumTeamTotals } from '../services/roundResolver'
import { useBattleStore } from '../store/battleStore'

interface Props {
  battleId: string
  onRematch: () => void
}

export function BattleResult({ battleId, onRematch }: Props) {
  const me = useAuthStore(selectSessionUser)
  const room = useBattleStore((s) => s.rooms[battleId])
  const refreshRoom = useBattleStore((s) => s.refreshRoom)

  const isTeamMode = Boolean(room && (room.teamSize ?? 1) > 1)
  const yourPlayer = room?.players.find((p) => p.userId === me?.id)
  const youWon = Boolean(
    room &&
      me &&
      (isTeamMode
        ? room.winnerTeamId && yourPlayer?.teamId === room.winnerTeamId
        : room.winnerId === me.id),
  )
  const playedOutcome = useRef<string | null>(null)

  useEffect(() => {
    void refreshRoom(battleId)
    void useAuthStore.getState().refreshMe()
  }, [battleId, refreshRoom])

  useEffect(() => {
    if (!room || room.status !== 'finished') return
    if (playedOutcome.current === battleId) return
    playedOutcome.current = battleId
    sfx.battleOutcome(youWon)
  }, [battleId, room, youWon])

  if (!room) return null

  const totals = sumPlayerTotals(room.drops, room.players)
  const teamTotals = isTeamMode ? sumTeamTotals(room.drops, room.players) : null
  const ranked = [...room.players].sort(
    (a, b) => (totals[b.id] ?? 0) - (totals[a.id] ?? 0),
  )
  const winner = ranked.find((p) => p.id === room.winnerId) ?? ranked[0]
  const winningTeam = room.winnerTeamId
  const humanWinners =
    isTeamMode && winningTeam
      ? room.players.filter(
          (p) =>
            p.teamId === winningTeam &&
            p.kind === 'user' &&
            !p.forfeited,
        )
      : []
  const poolValue = room.drops.reduce((s, d) => s + d.item.value, 0)
  const participated = room.players.some((p) => p.userId === me?.id)

  const headline = isTeamMode
    ? winningTeam
      ? `Команда ${winningTeam}`
      : 'Ничья'
    : (winner?.name ?? '—')

  const sub = (() => {
    if (isTeamMode) {
      if (youWon) {
        const split =
          humanWinners.length > 1
            ? ` Пул разделён между ${humanWinners.length} игроками команды.`
            : ''
        return `Победа команды ${winningTeam}. Пул ${poolValue} Мора.${split}`
      }
      if (participated) {
        return `Победа команды ${winningTeam}. Пул ${poolValue} Мора уходит соперникам.`
      }
      return `Команда ${winningTeam} · пул ${poolValue} Мора · вход ${room.entryFee} Мора.`
    }
    if (youWon) {
      return `Все ${room.drops.length} предметов из пула (${poolValue} Мора) добавлены в инвентарь.`
    }
    if (participated) {
      return `Пул ${poolValue} Мора уходит победителю. Вход списан.`
    }
    return `Пул ${poolValue} Мора · вход ${room.entryFee} Мора.`
  })()

  return (
    <div className="page battle-result-page">
      <motion.section
        className={`result-hero${youWon ? ' result-hero--win' : ''}`}
        initial={{ opacity: 0, scale: 0.94 }}
        animate={{ opacity: 1, scale: 1 }}
      >
        <p className="arena-eyebrow">
          {youWon
            ? isTeamMode
              ? 'Team victory'
              : 'Winner takes all'
            : participated
              ? 'Battle over'
              : 'Match finished'}
        </p>
        <h1>{headline}</h1>
        {teamTotals && winningTeam && (
          <p className="result-hero__teams">
            A {teamTotals.A.toLocaleString('ru-RU')} · B{' '}
            {teamTotals.B.toLocaleString('ru-RU')} Мора
          </p>
        )}
        <p className="result-hero__sub">{sub}</p>
      </motion.section>

      <div className="result-compare">
        {ranked.map((p, index) => {
          const isWinner = isTeamMode
            ? p.teamId === winningTeam && !p.forfeited
            : p.id === room.winnerId
          return (
            <div
              key={p.id}
              className={`result-row${isWinner ? ' result-row--winner' : ''}`}
            >
              <span className="result-row__place">#{index + 1}</span>
              <div>
                <strong>
                  {p.name}
                  {p.teamId ? ` · ${p.teamId}` : ''}
                </strong>
                <p>
                  {p.kind}
                  {p.forfeited ? ' · forfeit' : ''}
                </p>
              </div>
              <strong className="result-row__total">
                {(totals[p.id] ?? 0).toLocaleString('ru-RU')} Мора
              </strong>
            </div>
          )
        })}
      </div>

      <section className="drop-log">
        <h2>Полный лог</h2>
        <ul>
          {room.drops.map((d, i) => {
            const player = room.players.find((p) => p.id === d.playerId)
            return (
              <li key={`${d.roundIndex}-${d.playerId}-${i}`}>
                <span>
                  R{d.roundIndex + 1}
                  {d.isSuddenDeath ? ' SD' : ''}
                </span>
                <span>
                  {player?.name}
                  {player?.teamId ? ` · ${player.teamId}` : ''}
                </span>
                <span style={{ color: RARITY_META[d.item.rarity].color }}>
                  {d.item.name}
                </span>
                <strong>{d.item.value} Мора</strong>
              </li>
            )
          })}
        </ul>
      </section>

      <div className="result-actions">
        <button type="button" className="btn btn--primary btn--xl" onClick={onRematch}>
          Rematch
        </button>
        <Link to="/battles" className="btn btn--ghost">
          К баттлам
        </Link>
        <Link to="/inventory" className="btn btn--ghost">
          Инвентарь
        </Link>
      </div>
    </div>
  )
}
