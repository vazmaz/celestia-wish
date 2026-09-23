import { create } from 'zustand'
import { ApiError, apiFetch } from '../../../shared/api/client'
import { useAuthStore } from '../../auth/store/authStore'
import type { ChatMessage, ChatMute } from '../types'

type Ok = { ok: true }
type Fail = { ok: false; reason: string }
type OkMessage = { ok: true; message: ChatMessage }

interface ChatState {
  messages: ChatMessage[]
  mutes: ChatMute[]
  loadError: string | null
  mutedUntil: number | null
  muteReason: string | null
  unread: number
  mobileOpen: boolean
  lastSeenAt: number
  loadMessages: () => Promise<void>
  loadMutes: () => Promise<void>
  send: (body: string) => Promise<OkMessage | Fail>
  deleteMessage: (id: string) => Promise<Ok | Fail>
  muteUser: (
    userId: string,
    minutes: number,
    reason?: string,
  ) => Promise<Ok | Fail>
  unmuteUser: (userId: string) => Promise<Ok | Fail>
  setMobileOpen: (open: boolean) => void
  markSeen: () => void
  clear: () => void
}

function reasonFromError(err: unknown, fallback: string): string {
  if (err instanceof ApiError) return err.message
  if (err instanceof Error) return err.message
  return fallback
}

function mergeMessages(
  current: ChatMessage[],
  incoming: ChatMessage[],
): ChatMessage[] {
  const byId = new Map<string, ChatMessage>()
  for (const m of current) byId.set(m.id, m)
  for (const m of incoming) byId.set(m.id, m)
  return [...byId.values()].sort((a, b) => a.createdAt - b.createdAt)
}

export const useChatStore = create<ChatState>()((set, get) => ({
  messages: [],
  mutes: [],
  loadError: null,
  mutedUntil: null,
  muteReason: null,
  unread: 0,
  mobileOpen: false,
  lastSeenAt: Date.now(),

  clear: () =>
    set({
      messages: [],
      mutes: [],
      loadError: null,
      mutedUntil: null,
      muteReason: null,
      unread: 0,
      mobileOpen: false,
    }),

  setMobileOpen: (open) => {
    set({ mobileOpen: open })
    if (open) get().markSeen()
  },

  markSeen: () => {
    const { messages } = get()
    const last = messages[messages.length - 1]?.createdAt ?? Date.now()
    set({ lastSeenAt: last, unread: 0 })
  },

  loadMessages: async () => {
    const token = useAuthStore.getState().token
    if (!token) {
      set({ messages: [], loadError: null })
      return
    }
    try {
      const data = await apiFetch<{
        messages: ChatMessage[]
        me?: { chatMutedUntil: number | null; chatMuteReason: string | null }
      }>('/api/chat/messages', { token })
      const me = useAuthStore.getState().user
      const prev = get()
      const merged = mergeMessages([], data.messages)
      const isOpen =
        prev.mobileOpen ||
        (typeof window !== 'undefined' &&
          window.matchMedia('(min-width: 960px)').matches)
      let unread = 0
      if (!isOpen) {
        unread = merged.filter(
          (m) =>
            m.createdAt > prev.lastSeenAt &&
            m.userId !== me?.id,
        ).length
      }
      set({
        messages: merged,
        loadError: null,
        mutedUntil: data.me?.chatMutedUntil ?? me?.chatMutedUntil ?? null,
        muteReason: data.me?.chatMuteReason ?? me?.chatMuteReason ?? null,
        unread: isOpen ? 0 : unread,
        lastSeenAt: isOpen
          ? merged[merged.length - 1]?.createdAt ?? prev.lastSeenAt
          : prev.lastSeenAt,
      })
    } catch (err) {
      set({ loadError: reasonFromError(err, 'Не удалось загрузить чат') })
    }
  },

  loadMutes: async () => {
    const token = useAuthStore.getState().token
    const role = useAuthStore.getState().user?.role
    if (!token || role !== 'admin') {
      set({ mutes: [] })
      return
    }
    try {
      const data = await apiFetch<{ mutes: ChatMute[] }>('/api/chat/mutes', {
        token,
      })
      set({ mutes: data.mutes })
    } catch {
      /* admin-only; ignore for non-admins */
    }
  },

  send: async (body) => {
    const token = useAuthStore.getState().token
    if (!token) return { ok: false, reason: 'Нужно войти в аккаунт.' }
    try {
      const data = await apiFetch<{ message: ChatMessage }>(
        '/api/chat/messages',
        {
          method: 'POST',
          token,
          body: JSON.stringify({ body }),
        },
      )
      set({
        messages: mergeMessages(get().messages, [data.message]),
        loadError: null,
      })
      get().markSeen()
      return { ok: true, message: data.message }
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) {
        const me = useAuthStore.getState().user
        set({
          mutedUntil: me?.chatMutedUntil ?? get().mutedUntil,
          muteReason: me?.chatMuteReason ?? get().muteReason,
        })
      }
      return { ok: false, reason: reasonFromError(err, 'Не удалось отправить') }
    }
  },

  deleteMessage: async (id) => {
    const token = useAuthStore.getState().token
    if (!token) return { ok: false, reason: 'Нужно войти в аккаунт.' }
    try {
      await apiFetch<{ ok: boolean }>(`/api/chat/messages/${id}`, {
        method: 'DELETE',
        token,
      })
      set({ messages: get().messages.filter((m) => m.id !== id) })
      return { ok: true }
    } catch (err) {
      return { ok: false, reason: reasonFromError(err, 'Не удалось удалить') }
    }
  },

  muteUser: async (userId, minutes, reason) => {
    const token = useAuthStore.getState().token
    if (!token) return { ok: false, reason: 'Нужно войти в аккаунт.' }
    try {
      await apiFetch('/api/chat/mute', {
        method: 'POST',
        token,
        body: JSON.stringify({ userId, minutes, reason }),
      })
      await get().loadMutes()
      return { ok: true }
    } catch (err) {
      return { ok: false, reason: reasonFromError(err, 'Не удалось замутить') }
    }
  },

  unmuteUser: async (userId) => {
    const token = useAuthStore.getState().token
    if (!token) return { ok: false, reason: 'Нужно войти в аккаунт.' }
    try {
      await apiFetch('/api/chat/unmute', {
        method: 'POST',
        token,
        body: JSON.stringify({ userId }),
      })
      await get().loadMutes()
      return { ok: true }
    } catch (err) {
      return {
        ok: false,
        reason: reasonFromError(err, 'Не удалось снять мут'),
      }
    }
  },
}))
