import { useEffect, useMemo, useRef } from 'react'
import { Link } from 'react-router-dom'
import { getCaseById } from '../../cases/data/cases'
import { Roulette } from '../../../shared/components/opening/Roulette'
import { RARITY_META, RARITY_ORDER } from '../../cases/data/rarities'
import { sfx } from '../../../shared/lib/sfx'
import { CrystalAmount } from '../../../shared/components/brand/CrystalAmount'
import { selectSessionUser, useAuthStore } from '../../auth/store/authStore'
import { dropsForRound, isParticipant } from '../services/battleRoom'
import { sumPlayerTotals, sumTeamTotals } from '../services/roundResolver'
import { useBattleStore } from '../store/battleStore'
import type { CaseItem, Rarity } from '../../../shared/types'
import type { BattlePlayer, TeamId } from '../types'

const BATTLE_SPIN_MS = 3800
const noop = () => undefined

interface Props {
  battleId: string
}

function playerInitial(name: string) {
  return (name.trim().slice(0, 1) || '?').toUpperCase()
}

export function BattleArena({ battleId }: Props) {
  const me = useAuthStore(selectSessionUser)
  const room = useBattleStore((s) => s.rooms[battleId])
  const refreshRoom = useBattleStore((s) => s.refreshRoom)
  const forfeit = useBattleStore((s) => s.forfeit)

  const caseDef = useMemo(() => {
    if (!room) return null
    const caseId =
      room.drops.find((d) => d.roundIndex === room.currentRound)?.caseId ??
      room.caseIds[Math.min(room.currentRound, room.caseIds.length - 1)]
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

  const teamTotals = useMemo(() => {
    if (!room || (room.teamSize ?? 1) <= 1) return null
    const cutoff =
      room.phase === 'revealed' ? room.currentRound : room.currentRound - 1
    const visible = room.drops.filter((d) => d.roundIndex <= cutoff)
    return sumTeamTotals(visible, room.players)
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

  const leadTeam = useMemo(() => {
    if (!teamTotals) return null
    if (teamTotals.A === teamTotals.B) return null
    return teamTotals.A > teamTotals.B ? 'A' : 'B'
  }, [teamTotals])

  const heardSpin = useRef(false)
  useEffect(() => {
    if (!room) return
    if (room.phase === 'spinning') {
      heardSpin.current = true
      return
    }
    if (room.phase !== 'revealed' || !heardSpin.current) return
    heardSpin.current = false
    const drops = dropsForRound(room, room.currentRound)
    const you = room.players.find((p) => p.userId === me?.id && !p.forfeited)
    const yours = you ? drops.find((d) => d.playerId === you.id) : undefined
    const rarity =
      yours?.item.rarity ??
      drops.reduce<Rarity | null>((best, drop) => {
        if (!best) return drop.item.rarity
        return RARITY_ORDER.indexOf(drop.item.rarity) > RARITY_ORDER.indexOf(best)
          ? drop.item.rarity
          : best
      }, null)
    if (rarity) sfx.reveal(rarity)
  }, [room, me?.id])

  const roomStatus = room?.status
  const youId = me?.id

  const teamA = useMemo(
    () => (room ? room.players.filter((p) => p.teamId === 'A') : []),
    [room],
  )
  const teamB = useMemo(
    () => (room ? room.players.filter((p) => p.teamId === 'B') : []),
    [room],
  )

  const allyPlayers = useMemo(() => {
    if (!room) return []
    const yourTeam = room.players.find((p) => p.userId === youId)?.teamId
    if ((room.teamSize ?? 1) > 1 && yourTeam) {
      return room.players.filter((p) => p.teamId === yourTeam)
    }
    const you = room.players.find((p) => p.userId === youId)
    return you ? [you] : []
  }, [room, youId])

  const enemyPlayers = useMemo(() => {
    if (!room) return []
    const yourTeam = room.players.find((p) => p.userId === youId)?.teamId
    if ((room.teamSize ?? 1) > 1 && yourTeam) {
      return room.players.filter((p) => p.teamId && p.teamId !== yourTeam)
    }
    return room.players.filter((p) => p.userId !== youId)
  }, [room, youId])

  const spectatorPlayers = useMemo(() => {
    if (!room) return []
    if (allyPlayers.length > 0) return []
    return room.players
  }, [room, allyPlayers.length])

  useEffect(() => {
    if (roomStatus !== 'running') return
    const t = window.setInterval(() => void refreshRoom(battleId), 1000)
    return () => window.clearInterval(t)
  }, [roomStatus, battleId, refreshRoom])

  if (!room || !caseDef) return null

  const participating = isParticipant(room, me?.id)
  const isTeamMode =
    (room.teamSize ?? 1) > 1 ||
    room.players.some((p) => p.teamId === 'A' || p.teamId === 'B')

  const audiblePlayerId =
    allyPlayers.find((p) => p.userId === youId && !p.forfeited)?.id ??
    allyPlayers.find((p) => !p.forfeited)?.id ??
    room.players.find((p) => !p.forfeited)?.id

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

  const ffaOrdered =
    allyPlayers.length > 0
      ? [...allyPlayers, ...enemyPlayers]
      : spectatorPlayers

  const renderCinemaColumn = (player: BattlePlayer, team: TeamId) => {
    const drop = roundDrops.find((d) => d.playerId === player.id)
    const isYou = player.userId === youId
    const total = liveTotals[player.id] ?? 0
    const history = room.drops
      .filter(
        (d) =>
          d.playerId === player.id &&
          d.roundIndex < room.currentRound + (room.phase === 'revealed' ? 1 : 0),
      )
      .slice(-6)
    const winnerItem: CaseItem | null = drop
      ? {
          id: drop.item.itemId,
          name: drop.item.name,
          rarity: drop.item.rarity,
          chance: 1,
          value: drop.item.value,
          accent: drop.item.accent,
          image: drop.item.image,
        }
      : null
    const meta = drop ? RARITY_META[drop.item.rarity] : null

    return (
      <div
        key={`${player.id}-${room.currentRound}`}
        className={`battle-cinema__col battle-cinema__col--${team}${
          isYou ? ' battle-cinema__col--you' : ''
        }${leadTeam === team ? ' battle-cinema__col--lead' : ''}`}
      >
        <div className="battle-cinema__reel">
          {player.forfeited || !winnerItem ? (
            <div className="battle-cinema__reel-empty">
              {player.forfeited ? 'Forfeit' : '—'}
            </div>
          ) : (
            <Roulette
              pool={caseDef.items}
              winner={winnerItem}
              spinning={room.phase === 'spinning'}
              onDone={noop}
              durationMs={BATTLE_SPIN_MS}
              itemWidth={110}
              itemHeight={96}
              compact
              audible={player.id === audiblePlayerId}
              spinVariant="battle"
              orientation="vertical"
            />
          )}
        </div>

        <div className="battle-cinema__pull">
          {room.phase === 'revealed' && drop && meta ? (
            <>
              <p className="battle-cinema__pull-name" style={{ color: meta.color }}>
                {drop.item.name}
              </p>
              <CrystalAmount value={drop.item.value} className="battle-cinema__pull-value" />
            </>
          ) : (
            <p className="battle-cinema__pull-wait">
              {room.phase === 'spinning' ? 'Открытие…' : '—'}
            </p>
          )}
        </div>

        <div className="battle-cinema__player">
          <div className="battle-cinema__avatar" aria-hidden>
            {playerInitial(player.name)}
          </div>
          <div className="battle-cinema__player-meta">
            <strong>
              {isYou ? 'Ты · ' : ''}
              {player.name}
            </strong>
            <CrystalAmount value={total} className="battle-cinema__player-total" />
          </div>
        </div>

        <div className="battle-cinema__history" aria-label="История дропов">
          {Array.from({ length: 6 }).map((_, i) => {
            const h = history[i]
            return (
              <div
                key={`${player.id}-hist-${i}`}
                className={`battle-cinema__hist${h ? ' battle-cinema__hist--filled' : ''}`}
                style={
                  h
                    ? {
                        borderColor: RARITY_META[h.item.rarity].color,
                        background: `radial-gradient(circle, ${RARITY_META[h.item.rarity].glow}, transparent 70%)`,
                      }
                    : undefined
                }
                title={h ? `${h.item.name} · ${h.item.value}` : undefined}
              >
                {h?.item.image ? (
                  <img
                    className={`item-art--${h.item.rarity}`}
                    src={h.item.image}
                    alt=""
                  />
                ) : null}
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  const renderFfaLane = (player: BattlePlayer, side: 'ally' | 'enemy') => {
    const drop = roundDrops.find((d) => d.playerId === player.id)
    const isYou = player.userId === youId
    const total = liveTotals[player.id] ?? 0
    if (player.forfeited || !drop) {
      return (
        <div
          key={player.id}
          className={`arena-lane arena-lane--empty arena-lane--${side}${
            isYou ? ' arena-lane--you' : ''
          }`}
        >
          <header>
            <strong>
              {isYou ? 'Ты · ' : ''}
              {player.name}
            </strong>
            <span>{player.forfeited ? 'Forfeit' : `${total} кристаллов`}</span>
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
        className={`arena-lane arena-lane--${side}${
          leaderId === player.id ? ' arena-lane--lead' : ''
        }${isYou ? ' arena-lane--you' : ''}`}
      >
        <header>
          <strong>
            {isYou ? 'Ты · ' : ''}
            {player.name}
          </strong>
          <span>
            {room.phase === 'revealed' ? (
              <em style={{ color: meta.color }}>+{drop.item.value}</em>
            ) : (
              '…'
            )}{' '}
            · {total.toLocaleString('ru-RU')}
          </span>
        </header>
        <Roulette
          pool={caseDef.items}
          winner={winnerItem}
          spinning={room.phase === 'spinning'}
          onDone={noop}
          durationMs={BATTLE_SPIN_MS}
          itemWidth={112}
          compact
          audible={player.id === audiblePlayerId}
          spinVariant="battle"
          orientation="horizontal"
        />
        {room.phase === 'revealed' && (
          <p className="arena-lane__reveal" style={{ color: meta.color }}>
            {drop.item.name}
          </p>
        )}
      </div>
    )
  }

  if (isTeamMode) {
    const size = Math.max(teamA.length, teamB.length, room.teamSize || 3)
    const padTeam = (list: BattlePlayer[]) =>
      Array.from({ length: size }, (_, i) => list[i] ?? null)

    return (
      <div
        className={`page battle-arena-page battle-arena-page--cinema${
          room.phase === 'spinning' ? ' battle-arena-page--spinning' : ''
        }`}
      >
        <div className="battle-cinema__bar">
          <div className="battle-cinema__bar-cost">
            <span>Общая стоимость</span>
            <CrystalAmount value={room.entryFee} />
          </div>
          <div className="battle-cinema__bar-round">
            Раунд {Math.min(room.currentRound + 1, room.totalRounds)} из{' '}
            {room.totalRounds}
            <em> · {caseDef.name}</em>
          </div>
          <div className="battle-cinema__bar-actions">
            {room.phaseEndsInMs != null && (
              <span className="form-hint">
                {room.phase === 'spinning' ? 'открытие' : 'пауза'} ~
                {Math.ceil(room.phaseEndsInMs / 1000)}с
              </span>
            )}
            {participating && (
              <button
                type="button"
                className="btn btn--ghost"
                onClick={() => {
                  if (confirm('Выход = forfeit. Продолжить?')) {
                    void forfeit(battleId)
                  }
                }}
              >
                Forfeit
              </button>
            )}
          </div>
        </div>

        <div className="battle-cinema__scores">
          <div
            className={`battle-cinema__score battle-cinema__score--A${
              leadTeam === 'A' ? ' is-lead' : ''
            }`}
          >
            <span>Team 1</span>
            <CrystalAmount value={teamTotals?.A ?? 0} />
          </div>
          <div className="battle-cinema__swords" aria-hidden>
            ✦
          </div>
          <div
            className={`battle-cinema__score battle-cinema__score--B${
              leadTeam === 'B' ? ' is-lead' : ''
            }`}
          >
            <span>Team 2</span>
            <CrystalAmount value={teamTotals?.B ?? 0} />
          </div>
        </div>

        <div
          className={`battle-cinema${
            room.phase === 'spinning' ? ' battle-cinema--spinning' : ''
          }`}
        >
          <div className="battle-cinema__stage">
            <div className="battle-cinema__team battle-cinema__team--A">
              {padTeam(teamA).map((player, i) =>
                player ? (
                  renderCinemaColumn(player, 'A')
                ) : (
                  <div
                    key={`empty-A-${i}`}
                    className="battle-cinema__col battle-cinema__col--empty battle-cinema__col--A"
                  />
                ),
              )}
            </div>

            <div className="battle-cinema__vs" aria-hidden>
              <span>VS</span>
            </div>

            <div className="battle-cinema__team battle-cinema__team--B">
              {padTeam(teamB).map((player, i) =>
                player ? (
                  renderCinemaColumn(player, 'B')
                ) : (
                  <div
                    key={`empty-B-${i}`}
                    className="battle-cinema__col battle-cinema__col--empty battle-cinema__col--B"
                  />
                ),
              )}
            </div>
          </div>
        </div>

        {room.phase === 'revealed' && (
          <div className="arena-next">
            <p className="form-hint">
              {isLastReveal
                ? 'Итоги / Sudden Death подтянутся автоматически…'
                : 'Следующий раунд автоматически…'}
            </p>
          </div>
        )}

        <Link to="/battles" className="back-link">
          К списку баттлов
        </Link>
      </div>
    )
  }

  return (
    <div
      className={`page battle-arena-page${
        room.phase === 'spinning' ? ' battle-arena-page--spinning' : ''
      }`}
    >
      <div className="arena-top">
        <div>
          <p className="arena-eyebrow">
            {room.suddenDeath
              ? 'Sudden Death'
              : participating
                ? 'Case Battle'
                : 'Spectating'}
          </p>
          <h1>
            Раунд {Math.min(room.currentRound + 1, room.totalRounds)}/
            {room.totalRounds}
            <span className="arena-top__case"> · {caseDef.name}</span>
          </h1>
          {room.phaseEndsInMs != null && (
            <p className="form-hint">
              {room.phase === 'spinning' ? 'открытие' : 'пауза'} ~
              {Math.ceil(room.phaseEndsInMs / 1000)}с
            </p>
          )}
        </div>
        {participating && (
          <button
            type="button"
            className="btn btn--ghost"
            onClick={() => {
              if (confirm('Выход = forfeit. Продолжить?')) {
                void forfeit(battleId)
              }
            }}
          >
            Forfeit
          </button>
        )}
      </div>

      <div className="arena-scoreboard">
        {ffaOrdered.map((p) => (
          <div
            key={p.id}
            className={`score-pill${leaderId === p.id ? ' score-pill--lead' : ''}${
              p.forfeited ? ' score-pill--out' : ''
            }${p.userId === youId ? ' score-pill--you' : ''}`}
          >
            <span>{p.userId === youId ? 'Ты' : p.name}</span>
            <strong>
              {(liveTotals[p.id] ?? 0).toLocaleString('ru-RU')} кристаллов
            </strong>
          </div>
        ))}
      </div>

      <div
        className={`arena-board arena-board--ffa arena-board--count-${Math.min(
          ffaOrdered.length,
          4,
        )}`}
      >
        {ffaOrdered.map((player) =>
          renderFfaLane(
            player,
            player.userId === youId || allyPlayers.some((a) => a.id === player.id)
              ? 'ally'
              : 'enemy',
          ),
        )}
      </div>

      {room.phase === 'revealed' && (
        <div className="arena-next">
          <p className="form-hint">
            {isLastReveal
              ? 'Итоги / Sudden Death подтянутся автоматически…'
              : 'Следующий раунд автоматически…'}
          </p>
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
                  <span>
                    {player?.name}
                    {player?.teamId ? ` · ${player.teamId}` : ''}
                  </span>
                  <span style={{ color: RARITY_META[d.item.rarity].color }}>
                    {d.item.name}
                  </span>
                  <strong>{d.item.value} кристаллов</strong>
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
