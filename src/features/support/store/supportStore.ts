import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { createUid } from '../../../shared/lib/random'
import { syncPersistAcrossTabs } from '../../../shared/lib/persistSync'
import type {
  SupportAuthorRole,
  SupportCategory,
  SupportMessage,
  SupportTicket,
  SupportTicketStatus,
} from '../types'

interface CreateTicketInput {
  userId: string
  username: string
  category: SupportCategory
  subject: string
  body: string
}

interface ReplyInput {
  ticketId: string
  authorId: string
  authorName: string
  authorRole: SupportAuthorRole
  body: string
}

interface SupportState {
  tickets: SupportTicket[]
  createTicket: (
    input: CreateTicketInput,
  ) => { ok: true; ticketId: string } | { ok: false; reason: string }
  reply: (
    input: ReplyInput,
  ) => { ok: true } | { ok: false; reason: string }
  setStatus: (
    ticketId: string,
    status: SupportTicketStatus,
  ) => { ok: true } | { ok: false; reason: string }
  seedDemoTicket: (adminUsername: string) => { ok: true; ticketId: string }
}

const WELCOME =
  'Здравствуйте! Обращение принято. Администратор ответит здесь — обычно в течение дня. Пока можно уточнить детали в этом чате.'

function trimBody(raw: string): string {
  return raw.trim().replace(/\s+/g, ' ')
}

export const useSupportStore = create<SupportState>()(
  persist(
    (set, get) => ({
      tickets: [],

      createTicket: (input) => {
        const subject = input.subject.trim()
        const body = trimBody(input.body)
        if (subject.length < 3) {
          return { ok: false, reason: 'Тема слишком короткая (минимум 3 символа).' }
        }
        if (body.length < 5) {
          return { ok: false, reason: 'Опишите проблему подробнее (минимум 5 символов).' }
        }

        const ticketId = createUid()
        const now = Date.now()
        const userMsg: SupportMessage = {
          id: createUid(),
          ticketId,
          authorId: input.userId,
          authorName: input.username,
          authorRole: 'user',
          body,
          createdAt: now,
        }
        const systemMsg: SupportMessage = {
          id: createUid(),
          ticketId,
          authorId: 'system',
          authorName: 'Celestia Support',
          authorRole: 'system',
          body: WELCOME,
          createdAt: now + 1,
        }

        const ticket: SupportTicket = {
          id: ticketId,
          userId: input.userId,
          username: input.username,
          category: input.category,
          subject,
          status: 'open',
          createdAt: now,
          updatedAt: now,
          messages: [userMsg, systemMsg],
        }

        set({ tickets: [ticket, ...get().tickets] })
        return { ok: true, ticketId }
      },

      reply: (input) => {
        const body = trimBody(input.body)
        if (body.length < 1) {
          return { ok: false, reason: 'Сообщение пустое.' }
        }

        const tickets = get().tickets
        const index = tickets.findIndex((t) => t.id === input.ticketId)
        if (index < 0) {
          return { ok: false, reason: 'Обращение не найдено.' }
        }

        const ticket = tickets[index]
        if (ticket.status === 'closed') {
          return { ok: false, reason: 'Обращение закрыто.' }
        }

        const now = Date.now()
        const message: SupportMessage = {
          id: createUid(),
          ticketId: ticket.id,
          authorId: input.authorId,
          authorName: input.authorName,
          authorRole: input.authorRole,
          body,
          createdAt: now,
        }

        const nextStatus: SupportTicketStatus =
          input.authorRole === 'admin' ? 'answered' : 'open'

        const updated: SupportTicket = {
          ...ticket,
          status: nextStatus,
          updatedAt: now,
          messages: [...ticket.messages, message],
        }

        const next = [...tickets]
        next[index] = updated
        set({ tickets: next })
        return { ok: true }
      },

      setStatus: (ticketId, status) => {
        const tickets = get().tickets
        const index = tickets.findIndex((t) => t.id === ticketId)
        if (index < 0) {
          return { ok: false, reason: 'Обращение не найдено.' }
        }
        const next = [...tickets]
        next[index] = {
          ...tickets[index],
          status,
          updatedAt: Date.now(),
        }
        set({ tickets: next })
        return { ok: true }
      },

      seedDemoTicket: (adminUsername) => {
        const result = get().createTicket({
          userId: 'demo-client',
          username: 'demo_client',
          category: 'balance',
          subject: 'Не пришла Мора после апгрейда',
          body: `Здравствуйте! После апгрейда баланс не обновился. Проверьте, пожалуйста. (демо для @${adminUsername})`,
        })
        if (!result.ok) {
          // createTicket only fails on validation; demo payload is valid
          const ticketId = createUid()
          return { ok: true, ticketId }
        }
        return result
      },
    }),
    { name: 'a34-support' },
  ),
)

syncPersistAcrossTabs(useSupportStore)

export function selectTicketsForUser(userId: string) {
  return (state: SupportState) =>
    state.tickets.filter((t) => t.userId === userId)
}

export function selectOpenTicketCount(state: SupportState): number {
  return state.tickets.filter((t) => t.status === 'open').length
}
