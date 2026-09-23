import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { getCaseById } from '../../cases/data/cases'
import { usePlayerStore } from '../../inventory/store/playerStore'
import {
  advanceAfterReveal,
  canStart,
  cloneForRematch,
  createRoom,
  entryFeeFor,
  forfeitPlayer,
  makeBot,
  makeHotseat,
  startRoom,
} from '../services/battleRoom'
import { sumPlayerTotals } from '../services/roundResolver'
import {
  BattleMode,
  type BattleHistoryEntry,
  type BattlePrivacy,
  type BattleRoomState,
  type BotLuck,
} from '../types'

interface BattleStore {
  rooms: Record<string, BattleRoomState>
  history: BattleHistoryEntry[]
  createBattle: (input: {
    maxPlayers: 2 | 3 | 4
    caseIds: string[]
    privacy: BattlePrivacy
    fillBots: boolean
  }) => { ok: true; id: string } | { ok: false; reason: string }
  addBot: (battleId: string, luck?: BotLuck) => void
  addHotseat: (battleId: string) => void
  toggleReady: (battleId: string, playerId: string) => void
  startBattle: (battleId: string) => { ok: true } | { ok: false; reason: string }
  markRoundRevealed: (battleId: string) => void
  continueBattle: (battleId: string) => void
  forfeit: (battleId: string, playerId?: string) => void
  settlePayout: (battleId: string) => void
  rematch: (battleId: string) => string | null
  getPublicLobbies: () => BattleRoomState[]
  getRoom: (id: string) => BattleRoomState | undefined
  findByInvite: (code: string) => BattleRoomState | undefined
}

function casePrice(id: string): number {
  return getCaseById(id)?.price ?? 0
}

function upsert(rooms: Record<string, BattleRoomState>, room: BattleRoomState) {
  return { ...rooms, [room.id]: room }
}

function toHistory(room: BattleRoomState): BattleHistoryEntry {
  const totals = sumPlayerTotals(room.drops, room.players)
  const winner = room.players.find((p) => p.id === room.winnerId)
  const poolValue = room.drops.reduce((s, d) => s + d.item.value, 0)
  const entry = entryFeeFor(room.config.caseIds, casePrice)
  return {
    id: room.id,
    finishedAt: room.finishedAt ?? Date.now(),
    mode: room.config.mode,
    caseIds: room.config.caseIds,
    players: room.players.map((p) => ({
      id: p.id,
      name: p.name,
      kind: p.kind,
      total: totals[p.id] ?? 0,
    })),
    winnerId: room.winnerId ?? '',
    winnerName: winner?.name ?? '—',
    youWon: room.winnerId === 'local-you',
    poolValue,
    entryFee: entry,
  }
}

export const useBattleStore = create<BattleStore>()(
  persist(
    (set, get) => ({
      rooms: {},
      history: [],

      createBattle: ({ maxPlayers, caseIds, privacy, fillBots }) => {
        if (caseIds.length < 1 || caseIds.length > 8) {
          return { ok: false, reason: 'Выбери от 1 до 8 кейсов' }
        }
        if (!caseIds.every((id) => getCaseById(id))) {
          return { ok: false, reason: 'Неизвестный кейс' }
        }
        const fee = entryFeeFor(caseIds, casePrice)
        if (usePlayerStore.getState().balance < fee) {
          return { ok: false, reason: 'Недостаточно средств на вход' }
        }

        const room = createRoom({
          hostName: 'You',
          config: {
            maxPlayers,
            caseIds,
            privacy,
            mode: BattleMode.Highest,
          },
          fillBots,
        })

        set((s) => ({ rooms: upsert(s.rooms, room) }))
        return { ok: true, id: room.id }
      },

      addBot: (battleId, luck) => {
        set((s) => {
          const room = s.rooms[battleId]
          if (!room || room.status !== 'lobby') return s
          if (room.players.length >= room.config.maxPlayers) return s
          const bot = makeBot(room.players.length, luck)
          return {
            rooms: upsert(s.rooms, {
              ...room,
              players: [...room.players, bot],
            }),
          }
        })
      },

      addHotseat: (battleId) => {
        set((s) => {
          const room = s.rooms[battleId]
          if (!room || room.status !== 'lobby') return s
          if (room.players.length >= room.config.maxPlayers) return s
          const seat = makeHotseat(room.players.filter((p) => p.kind === 'hotseat').length)
          return {
            rooms: upsert(s.rooms, {
              ...room,
              players: [...room.players, seat],
            }),
          }
        })
      },

      toggleReady: (battleId, playerId) => {
        set((s) => {
          const room = s.rooms[battleId]
          if (!room || room.status !== 'lobby') return s
          const players = room.players.map((p) => {
            if (p.id !== playerId) return p
            if (p.kind === 'bot') return p
            return { ...p, ready: !p.ready }
          })
          return { rooms: upsert(s.rooms, { ...room, players }) }
        })
      },

      startBattle: (battleId) => {
        const room = get().rooms[battleId]
        if (!room) return { ok: false, reason: 'Лобби не найдено' }
        if (room.hostId !== 'local-you') return { ok: false, reason: 'Только хост' }
        if (!canStart(room)) return { ok: false, reason: 'Не все Ready' }

        const fee = entryFeeFor(room.config.caseIds, casePrice)
        if (!room.entryCharged) {
          const paid = usePlayerStore.getState().chargeEntry(fee)
          if (!paid) return { ok: false, reason: 'Недостаточно средств' }
        }

        const started = {
          ...startRoom(room),
          entryCharged: true,
        }
        set((s) => ({ rooms: upsert(s.rooms, started) }))
        return { ok: true }
      },

      markRoundRevealed: (battleId) => {
        set((s) => {
          const room = s.rooms[battleId]
          if (!room || room.status !== 'running') return s
          return {
            rooms: upsert(s.rooms, { ...room, phase: 'revealed' }),
          }
        })
      },

      continueBattle: (battleId) => {
        set((s) => {
          const room = s.rooms[battleId]
          if (!room) return s
          const next = advanceAfterReveal(room)
          let history = s.history
          if (next.status === 'finished' && room.status !== 'finished') {
            history = [toHistory(next), ...s.history].slice(0, 40)
          }
          return { rooms: upsert(s.rooms, next), history }
        })
        // payout after finish
        const finished = get().rooms[battleId]
        if (finished?.status === 'finished') {
          get().settlePayout(battleId)
        }
      },

      forfeit: (battleId, playerId = 'local-you') => {
        set((s) => {
          const room = s.rooms[battleId]
          if (!room) return s
          if (room.status === 'lobby') {
            const { [battleId]: _, ...rest } = s.rooms
            return { rooms: rest }
          }
          const next = forfeitPlayer(room, playerId)
          let history = s.history
          if (next.status === 'finished' && room.status !== 'finished') {
            history = [toHistory(next), ...s.history].slice(0, 40)
          }
          return { rooms: upsert(s.rooms, next), history }
        })
        const finished = get().rooms[battleId]
        if (finished?.status === 'finished') {
          get().settlePayout(battleId)
        }
      },

      settlePayout: (battleId) => {
        const room = get().rooms[battleId]
        if (!room || room.status !== 'finished' || room.payoutDone) return
        if (room.winnerId === 'local-you') {
          const pool = room.drops.map((d) => d.item)
          usePlayerStore.getState().grantBattlePool(pool, room.id)
        }
        set((s) => ({
          rooms: upsert(s.rooms, { ...room, payoutDone: true }),
        }))
      },

      rematch: (battleId) => {
        const room = get().rooms[battleId]
        if (!room) return null
        const next = cloneForRematch(room)
        // Keep similar bot/hotseat composition
        const extras = room.players.filter((p) => p.kind !== 'local')
        let players = next.players
        for (const extra of extras) {
          if (players.length >= next.config.maxPlayers) break
          if (extra.kind === 'bot') {
            players = [...players, makeBot(players.length, extra.luck)]
          } else if (extra.kind === 'hotseat') {
            players = [...players, makeHotseat(players.filter((p) => p.kind === 'hotseat').length)]
          }
        }
        const patched = { ...next, players }
        set((s) => ({ rooms: upsert(s.rooms, patched) }))
        return patched.id
      },

      getPublicLobbies: () =>
        Object.values(get().rooms).filter(
          (r) => r.status === 'lobby' && r.config.privacy === 'public',
        ),

      getRoom: (id) => get().rooms[id],

      findByInvite: (code) =>
        Object.values(get().rooms).find(
          (r) => r.inviteCode.toUpperCase() === code.toUpperCase(),
        ),
    }),
    {
      name: 'a34-battles',
      partialize: (state) => ({
        rooms: state.rooms,
        history: state.history,
      }),
    },
  ),
)
