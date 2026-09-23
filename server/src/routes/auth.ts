import { Router } from 'express'
import { z } from 'zod'
import {
  hashPassword,
  signToken,
  toPublicUser,
  verifyPassword,
  authRequired,
} from '../auth.js'
import { prisma } from '../prisma.js'

const credentialsSchema = z.object({
  username: z.string().trim().min(3).max(32),
  password: z.string().min(4).max(128),
})

function sanitizeUsername(raw: string): string {
  return raw.trim().toLowerCase()
}

export const authRouter = Router()

authRouter.post('/register', async (req, res) => {
  const parsed = credentialsSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Логин мин. 3, пароль мин. 4 символа' })
    return
  }

  const username = sanitizeUsername(parsed.data.username)
  const adminName = (process.env.ADMIN_USERNAME ?? 'admin').trim().toLowerCase()
  if (username === adminName) {
    res.status(400).json({ error: 'Этот логин зарезервирован' })
    return
  }

  const exists = await prisma.user.findUnique({ where: { username } })
  if (exists) {
    res.status(409).json({ error: 'Такой логин уже занят' })
    return
  }

  const starting = Number(process.env.STARTING_BALANCE ?? 10_000)
  const user = await prisma.user.create({
    data: {
      username,
      passwordHash: await hashPassword(parsed.data.password),
      role: 'user',
      balance: Number.isFinite(starting) ? Math.floor(starting) : 10_000,
      inventory: [],
    },
  })

  const token = signToken(user.id, user.role)
  res.status(201).json({ token, user: toPublicUser(user) })
})

authRouter.post('/login', async (req, res) => {
  const parsed = credentialsSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Некорректные данные' })
    return
  }

  const username = sanitizeUsername(parsed.data.username)
  const user = await prisma.user.findUnique({ where: { username } })
  if (!user || !(await verifyPassword(parsed.data.password, user.passwordHash))) {
    res.status(401).json({ error: 'Неверный логин или пароль' })
    return
  }

  const token = signToken(user.id, user.role)
  res.json({ token, user: toPublicUser(user) })
})

authRouter.get('/me', authRequired, async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.auth!.sub } })
  if (!user) {
    res.status(401).json({ error: 'Пользователь не найден' })
    return
  }
  res.json({ user: toPublicUser(user) })
})
