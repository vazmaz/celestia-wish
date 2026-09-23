import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { RARITY_META } from '../../cases/data/rarities'
import { sumPlayerTotals } from '../services/roundResolver'
import { useBattleStore } from '../store/battleStore'

interface Props {
  battleId: string
  onRematch: () => void
}

export function BattleResult({ battleId, onRematch }: Props) {
  const room = useBattleStore((s) => s.rooms[battleId])
  if (!room) return null

  const totals = sumPlayerTotals(room.drops, room.players)
  const ranked = [...room.players].sort(
    (a, b) => (totals[b.id] ?? 0) - (totals[a.id] ?? 0),
  )
  const winner = ranked.find((p) => p.id === room.winnerId) ?? ranked[0]
  const poolValue = room.drops.reduce((s, d) => s + d.item.value, 0)
  const youWon = room.winnerId === 'local-you'

  return (
    <div className="page battle-result-page">
      <motion.section
        className={`result-hero${youWon ? ' result-hero--win' : ''}`}
        initial={{ opacity: 0, scale: 0.94 }}
        animate={{ opacity: 1, scale: 1 }}
      >
        <p className="arena-eyebrow">{youWon ? 'Winner takes all' : 'Battle over'}</p>
        <h1>{winner?.name ?? '—'}</h1>
        <p className="result-hero__sub">
          {youWon
            ? `Все ${room.drops.length} предметов из пула (${poolValue} Мора) добавлены в инвентарь.`
            : `Пул ${poolValue} Мора уходит победителю. Вход списан.`}
        </p>
      </motion.section>

      <div className="result-compare">
        {ranked.map((p, index) => (
          <div
            key={p.id}
            className={`result-row${p.id === room.winnerId ? ' result-row--winner' : ''}`}
          >
            <span className="result-row__place">#{index + 1}</span>
            <div>
              <strong>{p.name}</strong>
              <p>
                {p.kind}
                {p.forfeited ? ' · forfeit' : ''}
              </p>
            </div>
            <strong className="result-row__total">
              {(totals[p.id] ?? 0).toLocaleString('ru-RU')} Мора
            </strong>
          </div>
        ))}
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
                <span>{player?.name}</span>
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
