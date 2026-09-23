export type SupportCategory =
  | 'balance'
  | 'battle'
  | 'upgrade'
  | 'account'
  | 'other'

export type SupportTicketStatus = 'open' | 'answered' | 'closed'

export type SupportAuthorRole = 'user' | 'admin' | 'system'

export interface SupportMessage {
  id: string
  ticketId: string
  authorId: string
  authorName: string
  authorRole: SupportAuthorRole
  body: string
  createdAt: number
}

export interface SupportTicket {
  id: string
  userId: string
  username: string
  category: SupportCategory
  subject: string
  status: SupportTicketStatus
  createdAt: number
  updatedAt: number
  messages: SupportMessage[]
}

export const SUPPORT_CATEGORIES: {
  id: SupportCategory
  label: string
}[] = [
  { id: 'balance', label: 'Баланс / Мора' },
  { id: 'battle', label: 'Баттлы' },
  { id: 'upgrade', label: 'Апгрейд' },
  { id: 'account', label: 'Аккаунт' },
  { id: 'other', label: 'Другое' },
]

export const SUPPORT_STATUS_LABEL: Record<SupportTicketStatus, string> = {
  open: 'Открыт',
  answered: 'Отвечен',
  closed: 'Закрыт',
}
