import { useEffect, useMemo, useRef } from 'react'
import { Link } from 'react-router-dom'
import { getCaseById } from '../../cases/data/cases'
import { Roulette } from '../../../shared/components/opening/Roulette'
import { RARITY_META, RARITY_ORDER } from '../../cases/data/rarities'
import { sfx } from '../../../shared/lib/sfx'
import { selectSessionUser, useAuthStore } from '../../auth/store/authStore'
import { dropsForRound, isParticipant } from '../services/battleRoom'
import { sumPlayerTotals, sumTeamTotals } from '../services/roundResolver'
import { useBattleStore } from '../store/battleStore'
import type { CaseItem, Rarity } from '../../../shared/types'
import type { TeamId } from '../types'

const BATTLE_SPIN_MS = 3800
const noop = () => undefined

interface Props {
  battleId: string
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
  const yourTeam = useMemo((): TeamId | null => {
    if (!room) return null
    return room.players.find((p) => p.userId === youId)?.teamId ?? null
  }, [room, youId])

  const allyPlayers = useMemo(() => {
    if (!room) return []
    if ((room.teamSize ?? 1) > 1 && yourTeam) {
      return room.players.filter((p) => p.teamId === yourTeam)
    }
    const you = room.players.find((p) => p.userId === youId)
    return you ? [you] : []
  }, [room, youId, yourTeam])

  const enemyPlayers = useMemo(() => {
    if (!room) return []
    if ((room.teamSize ?? 1) > 1 && yourTeam) {
      return room.players.filter((p) => p.teamId && p.teamId !== yourTeam)
    }
    return room.players.filter((p) => p.userId !== youId)
  }, [room, youId, yourTeam])

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
  const isTeamMode = (room.teamSize ?? 1) > 1

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

  const renderLane = (
    player: (typeof room.players)[number],
    side: 'ally' | 'enemy',
  ) => {
    const drop = roundDrops.find((d) => d.playerId === player.id)
    const isYou = player.userId === youId
    const lead =
      isTeamMode && player.teamId
        ? leadTeam === player.teamId
        : leaderId === player.id
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
              {player.teamId ? ` · ${player.teamId}` : ''}
            </strong>
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
        className={`arena-lane arena-lane--${side}${lead ? ' arena-lane--lead' : ''}${
          isYou ? ' arena-lane--you' : ''
        }`}
      >
        <header>
          <strong>
            {isYou ? 'Ты · ' : ''}
            {player.name}
            {player.teamId ? ` · ${player.teamId}` : ''}
          </strong>
          <span style={{ color: meta.color }}>
            {room.phase === 'revealed' ? `+${drop.item.value} Мора` : '…'}
          </span>
        </header>
        <Roulette
          pool={caseDef.items}
          winner={winnerItem}
          spinning={room.phase === 'spinning'}
          onDone={noop}
          durationMs={BATTLE_SPIN_MS}
          itemWidth={isTeamMode ? 108 : 120}
          compact
          audible={player.id === audiblePlayerId}
          spinVariant="battle"
        />
        {room.phase === 'revealed' && (
          <p className="arena-lane__reveal" style={{ color: meta.color }}>
            {drop.item.name}
          </p>
        )}
      </div>
    )
  }

  const scorePlayers =
    allyPlayers.length > 0
      ? [...allyPlayers, ...enemyPlayers]
      : spectatorPlayers

  return (
    <div className="page battle-arena-page">
      <div className="arena-top">
        <div>
          <p className="arena-eyebrow">
            {room.suddenDeath
              ? 'Sudden Death'
              : participating
                ? isTeamMode
                  ? `Team Battle · ${room.teamSize}v${room.teamSize}`
                  : 'Case Battle'
                : 'Spectating'}
          </p>
          <h1>
            Раунд {Math.min(room.currentRound + 1, room.totalRounds)}/
            {room.totalRounds}
          </h1>
          <p className="form-hint">
            Кейс: <strong>{caseDef.name}</strong>
            {room.phaseEndsInMs != null && (
              <>
                {' '}
                · {room.phase === 'spinning' ? 'открытие' : 'пауза'} ~
                {Math.ceil(room.phaseEndsInMs / 1000)}с
              </>
            )}
          </p>
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

      {teamTotals && (
        <div className="arena-team-score">
          <div
            className={`team-score-pill${leadTeam === 'A' ? ' team-score-pill--lead' : ''}`}
          >
            <span>Команда A</span>
            <strong>{teamTotals.A.toLocaleString('ru-RU')} Мора</strong>
          </div>
          <span className="team-score-vs">vs</span>
          <div
            className={`team-score-pill${leadTeam === 'B' ? ' team-score-pill--lead' : ''}`}
          >
            <span>Команда B</span>
            <strong>{teamTotals.B.toLocaleString('ru-RU')} Мора</strong>
          </div>
        </div>
      )}

      <div className="arena-scoreboard">
        {scorePlayers.map((p) => (
          <div
            key={p.id}
            className={`score-pill${
              isTeamMode
                ? p.teamId === leadTeam
                  ? ' score-pill--lead'
                  : ''
                : leaderId === p.id
                  ? ' score-pill--lead'
                  : ''
            }${p.forfeited ? ' score-pill--out' : ''}${
              p.userId === youId ? ' score-pill--you' : ''
            }`}
          >
            <span>
              {p.userId === youId ? 'Ты' : p.name}
              {p.teamId ? ` · ${p.teamId}` : ''}
            </span>
            <strong>{(liveTotals[p.id] ?? 0).toLocaleString('ru-RU')} Мора</strong>
          </div>
        ))}
      </div>

      <div className="arena-stack">
        {allyPlayers.length > 0 && (
          <section className="arena-stack__you">
            {isTeamMode && (
              <p className="arena-stack__label">
                Твоя команда {yourTeam ? `(${yourTeam})` : ''}
              </p>
            )}
            <div
              className={`arena-lanes arena-lanes--${Math.min(allyPlayers.length, 3)}`}
            >
              {allyPlayers.map((player) => renderLane(player, 'ally'))}
            </div>
          </section>
        )}

        {enemyPlayers.length > 0 && (
          <section className="arena-stack__opponents">
            <p className="arena-stack__label">
              {isTeamMode ? 'Команда соперников' : 'Оппоненты'}
            </p>
            <div
              className={`arena-lanes arena-lanes--${Math.min(enemyPlayers.length, 3)}`}
            >
              {enemyPlayers.map((player) => renderLane(player, 'enemy'))}
            </div>
          </section>
        )}

        {spectatorPlayers.length > 0 && (
          <div
            className={`arena-lanes arena-lanes--${Math.min(spectatorPlayers.length, 4)}`}
          >
            {spectatorPlayers.map((player) =>
              renderLane(player, player.teamId === 'A' ? 'ally' : 'enemy'),
            )}
          </div>
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
