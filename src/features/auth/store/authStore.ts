import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { syncPersistAcrossTabs } from '../../../shared/lib/persistSync'
import { ApiError, apiFetch } from '../../../shared/api/client'
import type { InventoryItem } from '../../../shared/types'
import { STARTING_BALANCE, type UserAccount } from '../types'

type AuthResult = { ok: true } | { ok: false; reason: string }

interface AuthState {
  token: string | null
  user: UserAccount | null
  users: UserAccount[]
  ready: boolean
  bootstrap: () => Promise<void>
  register: (username: string, password: string) => Promise<AuthResult>
  login: (username: string, password: string) => Promise<AuthResult>
  logout: () => void
  getSessionUser: () => UserAccount | null
  refreshMe: () => Promise<void>
  loadUsers: () => Promise<AuthResult>
  patchUserLocal: (
    userId: string,
    patch: Partial<Pick<UserAccount, 'balance' | 'inventory' | 'role'>>,
  ) => void
  /** @deprecated use patchUserLocal — kept name for call sites during migration */
  patchUser: (
    userId: string,
    patch: Partial<Pick<UserAccount, 'balance' | 'inventory' | 'role'>>,
  ) => void
  adminSetBalance: (
    userId: string,
    balance: number,
  ) => Promise<AuthResult>
  adminCreateUser: (
    username: string,
    password: string,
    balance?: number,
  ) => Promise<{ ok: true; userId: string } | { ok: false; reason: string }>
  createTopup: (
    amount: number,
  ) => Promise<
    | { ok: true; topupId: string; amount: number }
    | { ok: false; reason: string }
  >
  confirmTopupDemo: (
    topupId: string,
  ) => Promise<AuthResult>
  listTopups: () => Promise<
    | {
        ok: true
        topups: Array<{
          id: string
          amount: number
          status: string
          createdAt: number
          paidAt: number | null
        }>
      }
    | { ok: false; reason: string }
  >
}

function normalizeUser(raw: UserAccount): UserAccount {
  return {
    ...raw,
    inventory: Array.isArray(raw.inventory) ? raw.inventory : [],
  }
}

function reasonFromError(err: unknown, fallback: string): string {
  if (err instanceof ApiError) return err.message
  if (err instanceof Error) return err.message
  return fallback
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      users: [],
      ready: false,

      bootstrap: async () => {
        const { token } = get()
        if (!token) {
          set({ ready: true, user: null })
          return
        }
        try {
          const data = await apiFetch<{ user: UserAccount }>('/api/auth/me', {
            token,
          })
          set({ user: normalizeUser(data.user), ready: true })
        } catch {
          set({ token: null, user: null, users: [], ready: true })
        }
      },

      register: async (username, password) => {
        try {
          const data = await apiFetch<{ token: string; user: UserAccount }>(
            '/api/auth/register',
            {
              method: 'POST',
              body: JSON.stringify({ username, password }),
            },
          )
          set({
            token: data.token,
            user: normalizeUser(data.user),
            users: [],
          })
          return { ok: true }
        } catch (err) {
          return { ok: false, reason: reasonFromError(err, 'Ошибка регистрации') }
        }
      },

      login: async (username, password) => {
        try {
          const data = await apiFetch<{ token: string; user: UserAccount }>(
            '/api/auth/login',
            {
              method: 'POST',
              body: JSON.stringify({ username, password }),
            },
          )
          set({
            token: data.token,
            user: normalizeUser(data.user),
            users: [],
          })
          return { ok: true }
        } catch (err) {
          return { ok: false, reason: reasonFromError(err, 'Ошибка входа') }
        }
      },

      logout: () => set({ token: null, user: null, users: [] }),

      getSessionUser: () => get().user,

      refreshMe: async () => {
        const { token } = get()
        if (!token) return
        const data = await apiFetch<{ user: UserAccount }>('/api/auth/me', {
          token,
        })
        set({ user: normalizeUser(data.user) })
      },

      loadUsers: async () => {
        const { token } = get()
        if (!token) return { ok: false, reason: 'Нет сессии' }
        try {
          const data = await apiFetch<{ users: UserAccount[] }>(
            '/api/admin/users',
            { token },
          )
          set({ users: data.users.map(normalizeUser) })
          return { ok: true }
        } catch (err) {
          return { ok: false, reason: reasonFromError(err, 'Не удалось загрузить') }
        }
      },

      patchUserLocal: (userId, patch) => {
        set((s) => ({
          user:
            s.user?.id === userId ? { ...s.user, ...patch } : s.user,
          users: s.users.map((u) =>
            u.id === userId ? { ...u, ...patch } : u,
          ),
        }))
      },

      patchUser: (userId, patch) => get().patchUserLocal(userId, patch),

      adminSetBalance: async (userId, balance) => {
        const { token } = get()
        if (!token) return { ok: false, reason: 'Нет сессии' }
        try {
          const data = await apiFetch<{ user: UserAccount }>(
            `/api/admin/users/${userId}/balance`,
            {
              method: 'PATCH',
              token,
              body: JSON.stringify({ balance }),
            },
          )
          const user = normalizeUser(data.user)
          set((s) => ({
            users: s.users.map((u) => (u.id === user.id ? user : u)),
            user: s.user?.id === user.id ? user : s.user,
          }))
          return { ok: true }
        } catch (err) {
          return { ok: false, reason: reasonFromError(err, 'Ошибка баланса') }
        }
      },

      adminCreateUser: async (username, password, balance = STARTING_BALANCE) => {
        const { token } = get()
        if (!token) return { ok: false, reason: 'Нет сессии' }
        try {
          const data = await apiFetch<{ user: UserAccount }>('/api/admin/users', {
            method: 'POST',
            token,
            body: JSON.stringify({ username, password, balance }),
          })
          const user = normalizeUser(data.user)
          set((s) => ({ users: [...s.users, user] }))
          return { ok: true, userId: user.id }
        } catch (err) {
          return {
            ok: false,
            reason: reasonFromError(err, 'Не удалось создать пользователя'),
          }
        }
      },

      createTopup: async (amount) => {
        const { token } = get()
        if (!token) return { ok: false, reason: 'Нет сессии' }
        try {
          const data = await apiFetch<{
            topup: { id: string; amount: number }
          }>('/api/topups', {
            method: 'POST',
            token,
            body: JSON.stringify({ amount }),
          })
          return {
            ok: true,
            topupId: data.topup.id,
            amount: data.topup.amount,
          }
        } catch (err) {
          return { ok: false, reason: reasonFromError(err, 'Ошибка пополнения') }
        }
      },

      confirmTopupDemo: async (topupId) => {
        const { token } = get()
        if (!token) return { ok: false, reason: 'Нет сессии' }
        try {
          const data = await apiFetch<{ user: UserAccount }>(
            `/api/topups/${topupId}/confirm-demo`,
            { method: 'POST', token },
          )
          set({ user: normalizeUser(data.user) })
          return { ok: true }
        } catch (err) {
          return { ok: false, reason: reasonFromError(err, 'Оплата не прошла') }
        }
      },

      listTopups: async () => {
        const { token } = get()
        if (!token) return { ok: false, reason: 'Нет сессии' }
        try {
          const data = await apiFetch<{
            topups: Array<{
              id: string
              amount: number
              status: string
              createdAt: number
              paidAt: number | null
            }>
          }>('/api/topups', { token })
          return { ok: true, topups: data.topups }
        } catch (err) {
          return { ok: false, reason: reasonFromError(err, 'Ошибка истории') }
        }
      },
    }),
    {
      name: 'a34-auth-v2',
      partialize: (s) => ({
        token: s.token,
      }),
    },
  ),
)

syncPersistAcrossTabs(useAuthStore)

export function selectSessionUser(state: AuthState): UserAccount | null {
  return state.user
}

export function readSessionEconomy(): {
  userId: string
  balance: number
  inventory: InventoryItem[]
} | null {
  const user = useAuthStore.getState().user
  if (!user) return null
  return {
    userId: user.id,
    balance: user.balance,
    inventory: user.inventory,
  }
}

export function writeSessionEconomy(next: {
  balance?: number
  inventory?: InventoryItem[]
}): void {
  const { user, token, patchUserLocal } = useAuthStore.getState()
  if (!user || !token) return

  patchUserLocal(user.id, {
    ...(next.balance != null ? { balance: next.balance } : {}),
    ...(next.inventory != null ? { inventory: next.inventory } : {}),
  })

  const body: { balance?: number; inventory?: InventoryItem[] } = {}
  if (next.balance != null) body.balance = next.balance
  if (next.inventory != null) body.inventory = next.inventory

  void apiFetch('/api/me/economy', {
    method: 'PATCH',
    token,
    body: JSON.stringify(body),
  }).catch((err) => {
    console.error('Failed to sync economy', err)
  })
}
