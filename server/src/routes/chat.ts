import { Router } from 'express'
import { z } from 'zod'
import { adminRequired, authRequired, toPublicUser } from '../auth.js'
import { prisma } from '../prisma.js'

const MESSAGE_LIMIT = 100
const BODY_MAX = 300
const RATE_WINDOW_MS = 60_000
const RATE_MAX = 20
const RATE_GAP_MS = 2_000

const postSchema = z.object({
  body: z.string().trim().min(1).max(BODY_MAX),
})

const muteSchema = z.object({
  userId: z.string().min(1),
  /** Minutes; -1 = permanent (100 years). Omit / null to unmute via unmute route. */
  minutes: z.number().int().refine((n) => n === -1 || (n >= 1 && n <= 60 * 24 * 365)),
  reason: z.string().trim().max(200).optional(),
})

const unmuteSchema = z.object({
  userId: z.string().min(1),
})

type RateBucket = { times: number[] }
const rateByUser = new Map<string, RateBucket>()

function checkRateLimit(userId: string): string | null {
  const now = Date.now()
  let bucket = rateByUser.get(userId)
  if (!bucket) {
    bucket = { times: [] }
    rateByUser.set(userId, bucket)
  }
  bucket.times = bucket.times.filter((t) => now - t < RATE_WINDOW_MS)
  const last = bucket.times[bucket.times.length - 1]
  if (last != null && now - last < RATE_GAP_MS) {
    return 'Подождите пару секунд перед следующим сообщением.'
  }
  if (bucket.times.length >= RATE_MAX) {
    return 'Слишком много сообщений. Попробуйте через минуту.'
  }
  bucket.times.push(now)
  return null
}

function isMuted(until: Date | null | undefined): boolean {
  return Boolean(until && until.getTime() > Date.now())
}

function toPublicMessage(msg: {
  id: string
  userId: string
  username: string
  body: string
  createdAt: Date
}) {
  return {
    id: msg.id,
    userId: msg.userId,
    username: msg.username,
    body: msg.body,
    createdAt: msg.createdAt.getTime(),
  }
}

function muteUntilFromMinutes(minutes: number): Date {
  if (minutes === -1) {
    return new Date(Date.now() + 100 * 365.25 * 24 * 60 * 60 * 1000)
  }
  return new Date(Date.now() + minutes * 60_000)
}

export const chatRouter = Router()
chatRouter.use(authRequired)

chatRouter.get('/messages', async (req, res) => {
  const [rows, me] = await Promise.all([
    prisma.chatMessage.findMany({
      orderBy: { createdAt: 'desc' },
      take: MESSAGE_LIMIT,
    }),
    prisma.user.findUnique({ where: { id: req.auth!.sub } }),
  ])
  res.json({
    messages: rows.reverse().map(toPublicMessage),
    me: {
      chatMutedUntil: me?.chatMutedUntil?.getTime() ?? null,
      chatMuteReason: me?.chatMuteReason ?? null,
    },
  })
})

chatRouter.post('/messages', async (req, res) => {
  const parsed = postSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: `Сообщение от 1 до ${BODY_MAX} символов.` })
    return
  }

  const user = await prisma.user.findUnique({ where: { id: req.auth!.sub } })
  if (!user) {
    res.status(401).json({ error: 'Сессия недействительна' })
    return
  }

  if (isMuted(user.chatMutedUntil)) {
    const until = user.chatMutedUntil!.getTime()
    const reason = user.chatMuteReason?.trim()
    res.status(403).json({
      error: reason
        ? `Вы в муте до ${new Date(until).toLocaleString('ru-RU')}: ${reason}`
        : `Вы в муте до ${new Date(until).toLocaleString('ru-RU')}.`,
      chatMutedUntil: until,
      chatMuteReason: user.chatMuteReason ?? null,
    })
    return
  }

  const rateError = checkRateLimit(user.id)
  if (rateError) {
    res.status(429).json({ error: rateError })
    return
  }

  const msg = await prisma.chatMessage.create({
    data: {
      userId: user.id,
      username: user.username,
      body: parsed.data.body,
    },
  })

  res.status(201).json({ message: toPublicMessage(msg) })
})

chatRouter.delete('/messages/:id', adminRequired, async (req, res) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id
  if (!id) {
    res.status(400).json({ error: 'Некорректный id' })
    return
  }
  try {
    await prisma.chatMessage.delete({ where: { id } })
    res.json({ ok: true, id })
  } catch {
    res.status(404).json({ error: 'Сообщение не найдено' })
  }
})

chatRouter.get('/mutes', adminRequired, async (_req, res) => {
  const now = new Date()
  const users = await prisma.user.findMany({
    where: { chatMutedUntil: { gt: now } },
    orderBy: { chatMutedUntil: 'asc' },
  })
  res.json({
    mutes: users.map((u) => ({
      userId: u.id,
      username: u.username,
      chatMutedUntil: u.chatMutedUntil!.getTime(),
      chatMuteReason: u.chatMuteReason ?? null,
    })),
  })
})

chatRouter.post('/mute', adminRequired, async (req, res) => {
  const parsed = muteSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Некорректные данные мута' })
    return
  }

  const target = await prisma.user.findUnique({
    where: { id: parsed.data.userId },
  })
  if (!target) {
    res.status(404).json({ error: 'Пользователь не найден' })
    return
  }
  if (target.role === 'admin') {
    res.status(400).json({ error: 'Нельзя замутить администратора' })
    return
  }

  const until = muteUntilFromMinutes(parsed.data.minutes)
  const reason = parsed.data.reason?.trim() || null
  const user = await prisma.user.update({
    where: { id: target.id },
    data: {
      chatMutedUntil: until,
      chatMuteReason: reason,
    },
  })

  res.json({
    user: toPublicUser(user),
    mute: {
      userId: user.id,
      username: user.username,
      chatMutedUntil: until.getTime(),
      chatMuteReason: reason,
    },
  })
})

chatRouter.post('/unmute', adminRequired, async (req, res) => {
  const parsed = unmuteSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Некорректные данные' })
    return
  }

  try {
    const user = await prisma.user.update({
      where: { id: parsed.data.userId },
      data: { chatMutedUntil: null, chatMuteReason: null },
    })
    res.json({ user: toPublicUser(user) })
  } catch {
    res.status(404).json({ error: 'Пользователь не найден' })
  }
})
