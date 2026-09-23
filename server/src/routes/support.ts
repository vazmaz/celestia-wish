import { Router } from 'express'
import type {
  SupportAuthorRole,
  SupportCategory,
  SupportMessage,
  SupportTicket,
  SupportTicketStatus,
} from '@prisma/client'
import { z } from 'zod'
import { adminRequired, authRequired } from '../auth.js'
import { prisma } from '../prisma.js'

const WELCOME =
  'Здравствуйте! Обращение принято. Администратор ответит здесь — обычно в течение дня. Пока можно уточнить детали в этом чате.'

const categorySchema = z.enum([
  'balance',
  'battle',
  'upgrade',
  'account',
  'other',
])

const statusSchema = z.enum(['open', 'answered', 'closed'])

const createSchema = z.object({
  category: categorySchema,
  subject: z.string().trim().min(3).max(80),
  body: z.string().trim().min(5).max(1000),
})

const replySchema = z.object({
  body: z.string().trim().min(1).max(2000),
})

const statusBodySchema = z.object({
  status: statusSchema,
})

type TicketWithMessages = SupportTicket & { messages: SupportMessage[] }

function toPublicTicket(ticket: TicketWithMessages) {
  return {
    id: ticket.id,
    userId: ticket.userId,
    username: ticket.username,
    category: ticket.category,
    subject: ticket.subject,
    status: ticket.status,
    createdAt: ticket.createdAt.getTime(),
    updatedAt: ticket.updatedAt.getTime(),
    messages: [...ticket.messages]
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      .map((msg) => ({
        id: msg.id,
        ticketId: msg.ticketId,
        authorId: msg.authorId,
        authorName: msg.authorName,
        authorRole: msg.authorRole,
        body: msg.body,
        createdAt: msg.createdAt.getTime(),
      })),
  }
}

const ticketInclude = {
  messages: { orderBy: { createdAt: 'asc' as const } },
}

export const supportRouter = Router()
supportRouter.use(authRequired)

supportRouter.get('/tickets', async (req, res) => {
  const isAdmin = req.auth!.role === 'admin'
  const tickets = await prisma.supportTicket.findMany({
    where: isAdmin ? undefined : { userId: req.auth!.sub },
    orderBy: { updatedAt: 'desc' },
    include: ticketInclude,
  })
  res.json({ tickets: tickets.map(toPublicTicket) })
})

supportRouter.post('/tickets', async (req, res) => {
  const parsed = createSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({
      error: 'Тема от 3 символов, сообщение от 5.',
    })
    return
  }

  const user = await prisma.user.findUnique({ where: { id: req.auth!.sub } })
  if (!user) {
    res.status(401).json({ error: 'Сессия недействительна' })
    return
  }

  const now = new Date()
  const ticket = await prisma.supportTicket.create({
    data: {
      userId: user.id,
      username: user.username,
      category: parsed.data.category as SupportCategory,
      subject: parsed.data.subject,
      status: 'open',
      messages: {
        create: [
          {
            authorId: user.id,
            authorName: user.username,
            authorRole: 'user',
            body: parsed.data.body.replace(/\s+/g, ' '),
            createdAt: now,
          },
          {
            authorId: 'system',
            authorName: 'Celestia Support',
            authorRole: 'system',
            body: WELCOME,
            createdAt: new Date(now.getTime() + 1),
          },
        ],
      },
    },
    include: ticketInclude,
  })

  res.status(201).json({ ticket: toPublicTicket(ticket) })
})

supportRouter.post('/tickets/demo', adminRequired, async (req, res) => {
  const admin = await prisma.user.findUnique({ where: { id: req.auth!.sub } })
  if (!admin) {
    res.status(401).json({ error: 'Сессия недействительна' })
    return
  }

  const now = new Date()
  const ticket = await prisma.supportTicket.create({
    data: {
      userId: admin.id,
      username: 'demo_client',
      category: 'balance',
      subject: 'Не пришли кристаллы после апгрейда',
      status: 'open',
      messages: {
        create: [
          {
            authorId: admin.id,
            authorName: 'demo_client',
            authorRole: 'user' satisfies SupportAuthorRole,
            body: `Здравствуйте! После апгрейда баланс не обновился. Проверьте, пожалуйста. (демо для @${admin.username})`,
            createdAt: now,
          },
          {
            authorId: 'system',
            authorName: 'Celestia Support',
            authorRole: 'system',
            body: WELCOME,
            createdAt: new Date(now.getTime() + 1),
          },
        ],
      },
    },
    include: ticketInclude,
  })

  res.status(201).json({ ticket: toPublicTicket(ticket) })
})

supportRouter.post('/tickets/:id/messages', async (req, res) => {
  const parsed = replySchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Сообщение пустое.' })
    return
  }

  const ticket = await prisma.supportTicket.findUnique({
    where: { id: req.params.id },
  })
  if (!ticket) {
    res.status(404).json({ error: 'Обращение не найдено.' })
    return
  }

  const isAdmin = req.auth!.role === 'admin'
  if (!isAdmin && ticket.userId !== req.auth!.sub) {
    res.status(404).json({ error: 'Обращение не найдено.' })
    return
  }
  if (ticket.status === 'closed') {
    res.status(400).json({ error: 'Обращение закрыто.' })
    return
  }

  const user = await prisma.user.findUnique({ where: { id: req.auth!.sub } })
  if (!user) {
    res.status(401).json({ error: 'Сессия недействительна' })
    return
  }

  const nextStatus: SupportTicketStatus = isAdmin ? 'answered' : 'open'
  const authorRole: SupportAuthorRole = isAdmin ? 'admin' : 'user'

  const updated = await prisma.supportTicket.update({
    where: { id: ticket.id },
    data: {
      status: nextStatus,
      messages: {
        create: {
          authorId: user.id,
          authorName: user.username,
          authorRole,
          body: parsed.data.body.replace(/\s+/g, ' '),
        },
      },
    },
    include: ticketInclude,
  })

  res.json({ ticket: toPublicTicket(updated) })
})

supportRouter.patch('/tickets/:id', adminRequired, async (req, res) => {
  const parsed = statusBodySchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Некорректный статус' })
    return
  }

  const ticketId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id
  if (!ticketId) {
    res.status(404).json({ error: 'Обращение не найдено.' })
    return
  }

  try {
    const ticket = await prisma.supportTicket.update({
      where: { id: ticketId },
      data: { status: parsed.data.status },
      include: ticketInclude,
    })
    res.json({ ticket: toPublicTicket(ticket) })
  } catch {
    res.status(404).json({ error: 'Обращение не найдено.' })
  }
})
