import { useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { getCaseById } from '../../cases/data/cases'
import { Roulette } from '../../../shared/components/opening/Roulette'
import { RARITY_META } from '../../cases/data/rarities'
import { dropsForRound } from '../services/battleRoom'
import { sumPlayerTotals } from '../services/roundResolver'
import { useBattleStore } from '../store/battleStore'
import type { CaseItem } from '../../../shared/types'

const BATTLE_SPIN_MS = 3800

interface Props {
  battleId: string
}

export function BattleArena({ battleId }: Props) {
  const room = useBattleStore((s) => s.rooms[battleId])
  const markRoundRevealed = useBattleStore((s) => s.markRoundRevealed)
  const continueBattle = useBattleStore((s) => s.continueBattle)
  const forfeit = useBattleStore((s) => s.forfeit)

  const caseDef = useMemo(() => {
    if (!room) return null
    const caseId =
      room.drops.find((d) => d.roundIndex === room.currentRound)?.caseId ??
      room.config.caseIds[Math.min(room.currentRound, room.config.caseIds.length - 1)]
    return getCaseById(caseId) ?? null
  }, [room])

  const roundDrops = useMemo(
    () => (room ? dropsForRound(room, room.currentRound) : []),
    [room],
  )

  const liveTotals = useMemo(() => {
    if (!room) return {} as Record<string, number>
    const cutoff =
      room.phase === 'revealed' ? room.currentRound : room.currentRound - 1
    const visible = room.drops.filter((d) => d.roundIndex <= cutoff)
    return sumPlayerTotals(visible, room.players)
  }, [room])

  const leaderId = useMemo(() => {
    let best = -1
    let id: string | null = null
    for (const p of room?.players ?? []) {
      if (p.forfeited) continue
      const t = liveTotals[p.id] ?? 0
      if (t > best) {
        best = t
        id = p.id
      }
    }
    return id
  }, [liveTotals, room])

  // One shared clock so all lanes reveal together (sync show).
  useEffect(() => {
    if (!room || room.phase !== 'spinning') return
    const timer = window.setTimeout(() => {
      markRoundRevealed(battleId)
    }, BATTLE_SPIN_MS + 120)
    return () => window.clearTimeout(timer)
  }, [room?.phase, room?.currentRound, battleId, markRoundRevealed, room])

  if (!room || !caseDef) return null

  const log = room.drops
    .filter((d) =>
      room.phase === 'revealed'
        ? d.roundIndex <= room.currentRound
        : d.roundIndex < room.currentRound,
    )
    .slice()
    .reverse()

  const isLastReveal =
    room.phase === 'revealed' && room.currentRound + 1 >= room.totalRounds

  return (
    <div className="page battle-arena-page">
      <div className="arena-top">
        <div>
          <p className="arena-eyebrow">
            {room.suddenDeath ? 'Sudden Death' : 'Case Battle'}
          </p>
          <h1>
            Раунд {Math.min(room.currentRound + 1, room.totalRounds)}/{room.totalRounds}
          </h1>
          <p className="form-hint">
            Кейс: <strong>{caseDef.name}</strong> · seed {room.seed.slice(0, 14)}…
          </p>
        </div>
        <button
          type="button"
          className="btn btn--ghost"
          onClick={() => {
            if (confirm('Выход = forfeit. Продолжить?')) forfeit(battleId)
          }}
        >
          Forfeit
        </button>
      </div>

      <div className="arena-scoreboard">
        {room.players.map((p) => (
          <div
            key={p.id}
            className={`score-pill${leaderId === p.id ? ' score-pill--lead' : ''}${
              p.forfeited ? ' score-pill--out' : ''
            }`}
          >
            <span>{p.name}</span>
            <strong>{(liveTotals[p.id] ?? 0).toLocaleString('ru-RU')} Мора</strong>
          </div>
        ))}
      </div>

      <div className={`arena-lanes arena-lanes--${Math.min(room.players.length, 4)}`}>
        {room.players.map((player) => {
          const drop = roundDrops.find((d) => d.playerId === player.id)
          if (player.forfeited || !drop) {
            return (
              <div key={player.id} className="arena-lane arena-lane--empty">
                <header>
                  <strong>{player.name}</strong>
                  <span>{player.forfeited ? 'Forfeit' : '—'}</span>
                </header>
              </div>
            )
          }
          const winnerItem: CaseItem = {
            id: drop.item.itemId,
            name: drop.item.name,
            rarity: drop.item.rarity,
            chance: 1,
            value: drop.item.value,
            accent: drop.item.accent,
            image: drop.item.image,
          }
          const meta = RARITY_META[drop.item.rarity]
          return (
            <div
              key={`${player.id}-${room.currentRound}`}
              className={`arena-lane${leaderId === player.id ? ' arena-lane--lead' : ''}`}
            >
              <header>
                <strong>{player.name}</strong>
                <span style={{ color: meta.color }}>
                  {room.phase === 'revealed' ? `+${drop.item.value} Мора` : '…'}
                </span>
              </header>
              <Roulette
                pool={caseDef.items}
                winner={winnerItem}
                spinning={room.phase === 'spinning'}
                onDone={() => undefined}
                durationMs={BATTLE_SPIN_MS}
                itemWidth={104}
                compact
              />
              {room.phase === 'revealed' && (
                <p className="arena-lane__reveal" style={{ color: meta.color }}>
                  {drop.item.name}
                </p>
              )}
            </div>
          )
        })}
      </div>

      {room.phase === 'revealed' && (
        <div className="arena-next">
          <button
            type="button"
            className="btn btn--primary btn--xl"
            onClick={() => continueBattle(battleId)}
          >
            {isLastReveal ? 'Итоги / Sudden Death' : 'Следующий раунд'}
          </button>
        </div>
      )}

      <section className="drop-log">
        <h2>Лог дропов</h2>
        {log.length === 0 ? (
          <p className="form-hint">После раунда здесь появится прозрачный лог.</p>
        ) : (
          <ul>
            {log.map((d, i) => {
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
        )}
      </section>

      <Link to="/battles" className="back-link">
        К списку баттлов
      </Link>
    </div>
  )
}
