import { create } from 'zustand'
import { ApiError, apiFetch } from '../../../shared/api/client'
import { useAuthStore } from '../../auth/store/authStore'
import type {
  SupportCategory,
  SupportTicket,
  SupportTicketStatus,
} from '../types'

interface CreateTicketInput {
  category: SupportCategory
  subject: string
  body: string
}

interface ReplyInput {
  ticketId: string
  body: string
}

type OkTicket = { ok: true; ticket: SupportTicket }
type Fail = { ok: false; reason: string }

interface SupportState {
  tickets: SupportTicket[]
  loadError: string | null
  loadTickets: () => Promise<void>
  clear: () => void
  createTicket: (input: CreateTicketInput) => Promise<OkTicket | Fail>
  reply: (input: ReplyInput) => Promise<OkTicket | Fail>
  setStatus: (
    ticketId: string,
    status: SupportTicketStatus,
  ) => Promise<OkTicket | Fail>
  seedDemoTicket: () => Promise<OkTicket | Fail>
}

function reasonFromError(err: unknown, fallback: string): string {
  if (err instanceof ApiError) return err.message
  if (err instanceof Error) return err.message
  return fallback
}

function upsertTicket(
  tickets: SupportTicket[],
  ticket: SupportTicket,
): SupportTicket[] {
  return [ticket, ...tickets.filter((t) => t.id !== ticket.id)]
}

export const useSupportStore = create<SupportState>()((set, get) => ({
  tickets: [],
  loadError: null,

  clear: () => set({ tickets: [], loadError: null }),

  loadTickets: async () => {
    const token = useAuthStore.getState().token
    if (!token) {
      set({ tickets: [], loadError: null })
      return
    }
    try {
      const data = await apiFetch<{ tickets: SupportTicket[] }>(
        '/api/support/tickets',
        { token },
      )
      set({ tickets: data.tickets, loadError: null })
    } catch (err) {
      set({ loadError: reasonFromError(err, 'Не удалось загрузить обращения') })
    }
  },

  createTicket: async (input) => {
    const token = useAuthStore.getState().token
    if (!token) return { ok: false, reason: 'Нужно войти в аккаунт.' }
    try {
      const data = await apiFetch<{ ticket: SupportTicket }>(
        '/api/support/tickets',
        {
          method: 'POST',
          token,
          body: JSON.stringify(input),
        },
      )
      set({ tickets: upsertTicket(get().tickets, data.ticket), loadError: null })
      return { ok: true, ticket: data.ticket }
    } catch (err) {
      return { ok: false, reason: reasonFromError(err, 'Не удалось отправить') }
    }
  },

  reply: async (input) => {
    const token = useAuthStore.getState().token
    if (!token) return { ok: false, reason: 'Нужно войти в аккаунт.' }
    try {
      const data = await apiFetch<{ ticket: SupportTicket }>(
        `/api/support/tickets/${input.ticketId}/messages`,
        {
          method: 'POST',
          token,
          body: JSON.stringify({ body: input.body }),
        },
      )
      set({ tickets: upsertTicket(get().tickets, data.ticket), loadError: null })
      return { ok: true, ticket: data.ticket }
    } catch (err) {
      return { ok: false, reason: reasonFromError(err, 'Не удалось отправить') }
    }
  },

  setStatus: async (ticketId, status) => {
    const token = useAuthStore.getState().token
    if (!token) return { ok: false, reason: 'Нужно войти в аккаунт.' }
    try {
      const data = await apiFetch<{ ticket: SupportTicket }>(
        `/api/support/tickets/${ticketId}`,
        {
          method: 'PATCH',
          token,
          body: JSON.stringify({ status }),
        },
      )
      set({ tickets: upsertTicket(get().tickets, data.ticket), loadError: null })
      return { ok: true, ticket: data.ticket }
    } catch (err) {
      return {
        ok: false,
        reason: reasonFromError(err, 'Не удалось сменить статус'),
      }
    }
  },

  seedDemoTicket: async () => {
    const token = useAuthStore.getState().token
    if (!token) return { ok: false, reason: 'Нужно войти в аккаунт.' }
    try {
      const data = await apiFetch<{ ticket: SupportTicket }>(
        '/api/support/tickets/demo',
        { method: 'POST', token },
      )
      set({ tickets: upsertTicket(get().tickets, data.ticket), loadError: null })
      return { ok: true, ticket: data.ticket }
    } catch (err) {
      return {
        ok: false,
        reason: reasonFromError(err, 'Не удалось создать демо-обращение'),
      }
    }
  },
}))

export function selectTicketsForUser(userId: string) {
  return (state: SupportState) =>
    state.tickets.filter((t) => t.userId === userId)
}

export function selectOpenTicketCount(state: SupportState): number {
  return state.tickets.filter((t) => t.status === 'open').length
}
