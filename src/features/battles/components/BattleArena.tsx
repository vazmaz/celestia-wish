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
  const useVertical = isTeamMode || room.players.length >= 3

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

  const itemHeight = isTeamMode
    ? room.teamSize >= 3
      ? 64
      : 72
    : 80

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
    const total = liveTotals[player.id] ?? 0
    if (player.forfeited || !drop) {
      return (
        <div
          key={player.id}
          className={`arena-lane arena-lane--empty arena-lane--${side}${
            isYou ? ' arena-lane--you' : ''
          }${useVertical ? ' arena-lane--v' : ''}`}
        >
          <header>
            <strong>
              {isYou ? 'Ты · ' : ''}
              {player.name}
            </strong>
            <span>{player.forfeited ? 'Forfeit' : `${total} Мора`}</span>
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
        }${useVertical ? ' arena-lane--v' : ''}`}
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
          itemWidth={useVertical ? undefined : isTeamMode ? 108 : 120}
          itemHeight={itemHeight}
          compact
          audible={player.id === audiblePlayerId}
          spinVariant="battle"
          orientation={useVertical ? 'vertical' : 'horizontal'}
        />
        {room.phase === 'revealed' && (
          <p className="arena-lane__reveal" style={{ color: meta.color }}>
            {drop.item.name}
          </p>
        )}
      </div>
    )
  }

  const leftTeam = yourTeam === 'B' ? teamB : teamA
  const rightTeam = yourTeam === 'B' ? teamA : teamB
  const leftTeamId: TeamId = leftTeam[0]?.teamId ?? (yourTeam === 'B' ? 'B' : 'A')
  const rightTeamId: TeamId = rightTeam[0]?.teamId ?? (yourTeam === 'B' ? 'A' : 'B')
  const leftLabel =
    yourTeam != null
      ? leftTeamId === yourTeam
        ? 'Твоя команда'
        : 'Соперники'
      : `Команда ${leftTeamId}`
  const rightLabel =
    yourTeam != null
      ? rightTeamId === yourTeam
        ? 'Твоя команда'
        : 'Соперники'
      : `Команда ${rightTeamId}`

  return (
    <div
      className={`page battle-arena-page${isTeamMode ? ' battle-arena-page--team' : ''}`}
    >
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

      {teamTotals && (
        <div className="arena-team-score">
          <div
            className={`team-score-pill${
              leadTeam === leftTeamId ? ' team-score-pill--lead' : ''
            }`}
          >
            <span>{leftLabel}</span>
            <strong>
              {teamTotals[leftTeamId].toLocaleString('ru-RU')} Мора
            </strong>
          </div>
          <span className="team-score-vs">vs</span>
          <div
            className={`team-score-pill${
              leadTeam === rightTeamId ? ' team-score-pill--lead' : ''
            }`}
          >
            <span>{rightLabel}</span>
            <strong>
              {teamTotals[rightTeamId].toLocaleString('ru-RU')} Мора
            </strong>
          </div>
        </div>
      )}

      {!isTeamMode && (
        <div className="arena-scoreboard">
          {(allyPlayers.length > 0
            ? [...allyPlayers, ...enemyPlayers]
            : spectatorPlayers
          ).map((p) => (
            <div
              key={p.id}
              className={`score-pill${
                leaderId === p.id ? ' score-pill--lead' : ''
              }${p.forfeited ? ' score-pill--out' : ''}${
                p.userId === youId ? ' score-pill--you' : ''
              }`}
            >
              <span>{p.userId === youId ? 'Ты' : p.name}</span>
              <strong>
                {(liveTotals[p.id] ?? 0).toLocaleString('ru-RU')} Мора
              </strong>
            </div>
          ))}
        </div>
      )}

      {isTeamMode ? (
        <div className="arena-vs">
          <section className="arena-vs__col arena-vs__col--left">
            <p className="arena-stack__label">{leftLabel}</p>
            <div className="arena-vs__lanes">
              {leftTeam.map((player) =>
                renderLane(
                  player,
                  player.teamId === yourTeam ? 'ally' : 'enemy',
                ),
              )}
            </div>
          </section>
          <section className="arena-vs__col arena-vs__col--right">
            <p className="arena-stack__label">{rightLabel}</p>
            <div className="arena-vs__lanes">
              {rightTeam.map((player) =>
                renderLane(
                  player,
                  player.teamId === yourTeam ? 'ally' : 'enemy',
                ),
              )}
            </div>
          </section>
        </div>
      ) : (
        <div className="arena-stack">
          {allyPlayers.length > 0 && (
            <section className="arena-stack__you">
              <div
                className={`arena-lanes arena-lanes--${Math.min(allyPlayers.length, 3)}${
                  useVertical ? ' arena-lanes--vertical' : ''
                }`}
              >
                {allyPlayers.map((player) => renderLane(player, 'ally'))}
              </div>
            </section>
          )}

          {enemyPlayers.length > 0 && (
            <section className="arena-stack__opponents">
              <p className="arena-stack__label">Оппоненты</p>
              <div
                className={`arena-lanes arena-lanes--${Math.min(enemyPlayers.length, 3)}${
                  useVertical ? ' arena-lanes--vertical' : ''
                }`}
              >
                {enemyPlayers.map((player) => renderLane(player, 'enemy'))}
              </div>
            </section>
          )}

          {spectatorPlayers.length > 0 && (
            <div
              className={`arena-lanes arena-lanes--${Math.min(spectatorPlayers.length, 4)}${
                useVertical ? ' arena-lanes--vertical' : ''
              }`}
            >
              {spectatorPlayers.map((player) =>
                renderLane(player, player.teamId === 'A' ? 'ally' : 'enemy'),
              )}
            </div>
          )}
        </div>
      )}

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
