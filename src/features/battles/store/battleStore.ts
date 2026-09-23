import { create } from 'zustand'
import { useAuthStore } from '../../auth/store/authStore'
import { usePlayerStore } from '../../inventory/store/playerStore'
import type {
  BattlePrivacy,
  BattleRoomState,
  BotLuck,
  BattleFormat,
} from '../types'
import {
  addBotApi,
  battleApiReason,
  createBattleApi,
  fetchBattle,
  fetchBattleByInvite,
  fetchBattleFeed,
  forfeitBattleApi,
  joinBattleApi,
  leaveBattleApi,
  readyBattleApi,
  rematchBattleApi,
  startBattleApi,
} from '../services/battleApi'

type OkId = { ok: true; id: string } | { ok: false; reason: string }
type Ok = { ok: true } | { ok: false; reason: string }

interface BattleStore {
  rooms: Record<string, BattleRoomState>
  lobbies: BattleRoomState[]
  live: BattleRoomState[]
  feedError: string | null
  loadingFeed: boolean

  upsertRoom: (room: BattleRoomState) => void
  applyUserSync: (user?: { balance: number; inventory: unknown }) => void

  refreshFeed: () => Promise<void>
  refreshRoom: (id: string) => Promise<BattleRoomState | null>
  createBattle: (input: {
    format: BattleFormat
    caseIds: string[]
    privacy: BattlePrivacy
    fillBots: boolean
  }) => Promise<OkId>
  joinBattle: (id: string) => Promise<Ok>
  leaveBattle: (id: string) => Promise<Ok>
  toggleReady: (battleId: string) => Promise<Ok>
  addBot: (battleId: string, luck?: BotLuck) => Promise<Ok>
  startBattle: (battleId: string) => Promise<Ok>
  forfeit: (battleId: string) => Promise<Ok>
  rematch: (battleId: string) => Promise<string | null>
  findByInvite: (code: string) => Promise<BattleRoomState | null>
}

function tokenOrNull(): string | null {
  return useAuthStore.getState().token
}

function syncEconomyFromUser(user?: {
  balance: number
  inventory: unknown
}): void {
  if (!user) {
    void useAuthStore.getState().refreshMe()
    return
  }
  const current = useAuthStore.getState().user
  if (!current) {
    void useAuthStore.getState().refreshMe()
    return
  }
  useAuthStore.getState().patchUserLocal(current.id, {
    balance: user.balance,
    inventory: Array.isArray(user.inventory)
      ? (user.inventory as never)
      : current.inventory,
  })
  usePlayerStore.getState().syncFromAuth()
}

export const useBattleStore = create<BattleStore>((set, get) => ({
  rooms: {},
  lobbies: [],
  live: [],
  feedError: null,
  loadingFeed: false,

  upsertRoom: (room) => {
    set((s) => ({ rooms: { ...s.rooms, [room.id]: room } }))
  },

  applyUserSync: (user) => {
    syncEconomyFromUser(user)
  },

  refreshFeed: async () => {
    const token = tokenOrNull()
    if (!token) return
    set({ loadingFeed: true, feedError: null })
    try {
      const feed = await fetchBattleFeed(token)
      set((s) => {
        const rooms = { ...s.rooms }
        for (const r of [...feed.lobbies, ...feed.live]) rooms[r.id] = r
        return {
          lobbies: feed.lobbies,
          live: feed.live,
          rooms,
          loadingFeed: false,
        }
      })
    } catch (err) {
      set({
        loadingFeed: false,
        feedError: battleApiReason(err, 'Не удалось загрузить лобби'),
      })
    }
  },

  refreshRoom: async (id) => {
    const token = tokenOrNull()
    if (!token) return null
    try {
      const room = await fetchBattle(token, id)
      get().upsertRoom(room)
      return room
    } catch {
      return null
    }
  },

  createBattle: async (input) => {
    const token = tokenOrNull()
    if (!token) return { ok: false, reason: 'Войди в аккаунт' }
    try {
      const room = await createBattleApi(token, input)
      get().upsertRoom(room)
      void get().refreshFeed()
      return { ok: true, id: room.id }
    } catch (err) {
      return { ok: false, reason: battleApiReason(err, 'Не удалось создать') }
    }
  },

  joinBattle: async (id) => {
    const token = tokenOrNull()
    if (!token) return { ok: false, reason: 'Войди в аккаунт' }
    try {
      const { room } = await joinBattleApi(token, id)
      get().upsertRoom(room)
      void get().refreshFeed()
      return { ok: true }
    } catch (err) {
      return { ok: false, reason: battleApiReason(err, 'Не удалось войти') }
    }
  },

  leaveBattle: async (id) => {
    const token = tokenOrNull()
    if (!token) return { ok: false, reason: 'Войди в аккаунт' }
    try {
      const result = await leaveBattleApi(token, id)
      if (result.cancelled || !result.room) {
        set((s) => {
          const { [id]: _, ...rest } = s.rooms
          return { rooms: rest }
        })
      } else {
        get().upsertRoom(result.room)
      }
      void get().refreshFeed()
      return { ok: true }
    } catch (err) {
      return { ok: false, reason: battleApiReason(err, 'Не удалось выйти') }
    }
  },

  toggleReady: async (battleId) => {
    const token = tokenOrNull()
    if (!token) return { ok: false, reason: 'Войди в аккаунт' }
    try {
      const room = await readyBattleApi(token, battleId)
      get().upsertRoom(room)
      return { ok: true }
    } catch (err) {
      return { ok: false, reason: battleApiReason(err, 'Ошибка Ready') }
    }
  },

  addBot: async (battleId, luck) => {
    const token = tokenOrNull()
    if (!token) return { ok: false, reason: 'Войди в аккаунт' }
    try {
      const room = await addBotApi(token, battleId, luck)
      get().upsertRoom(room)
      return { ok: true }
    } catch (err) {
      return { ok: false, reason: battleApiReason(err, 'Не удалось добавить бота') }
    }
  },

  startBattle: async (battleId) => {
    const token = tokenOrNull()
    if (!token) return { ok: false, reason: 'Войди в аккаунт' }
    try {
      const { room, user } = await startBattleApi(token, battleId)
      get().upsertRoom(room)
      syncEconomyFromUser(user)
      void get().refreshFeed()
      return { ok: true }
    } catch (err) {
      return { ok: false, reason: battleApiReason(err, 'Не удалось стартовать') }
    }
  },

  forfeit: async (battleId) => {
    const token = tokenOrNull()
    if (!token) return { ok: false, reason: 'Войди в аккаунт' }
    try {
      const { room, user } = await forfeitBattleApi(token, battleId)
      get().upsertRoom(room)
      syncEconomyFromUser(user)
      return { ok: true }
    } catch (err) {
      return { ok: false, reason: battleApiReason(err, 'Forfeit не удался') }
    }
  },

  rematch: async (battleId) => {
    const token = tokenOrNull()
    if (!token) return null
    try {
      const room = await rematchBattleApi(token, battleId)
      get().upsertRoom(room)
      void get().refreshFeed()
      return room.id
    } catch {
      return null
    }
  },

  findByInvite: async (code) => {
    const token = tokenOrNull()
    if (!token) return null
    try {
      const room = await fetchBattleByInvite(token, code.trim())
      get().upsertRoom(room)
      return room
    } catch {
      return null
    }
  },
}))
