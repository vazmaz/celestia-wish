import { Router } from 'express'
import { z } from 'zod'
import {
  adminRequired,
  authRequired,
  hashPassword,
  toPublicUser,
} from '../auth.js'
import { prisma } from '../prisma.js'

export const adminRouter = Router()
adminRouter.use(authRequired, adminRequired)

adminRouter.get('/users', async (_req, res) => {
  const users = await prisma.user.findMany({ orderBy: { createdAt: 'asc' } })
  res.json({ users: users.map(toPublicUser) })
})

adminRouter.patch('/users/:id/balance', async (req, res) => {
  const balance = Number(req.body?.balance)
  if (!Number.isFinite(balance) || balance < 0) {
    res.status(400).json({ error: 'Некорректный баланс' })
    return
  }

  try {
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { balance: Math.floor(balance) },
    })
    res.json({ user: toPublicUser(user) })
  } catch {
    res.status(404).json({ error: 'Пользователь не найден' })
  }
})

const createUserSchema = z.object({
  username: z.string().trim().min(3).max(32),
  password: z.string().min(4).max(128),
  balance: z.number().int().min(0).optional(),
})

adminRouter.post('/users', async (req, res) => {
  const parsed = createUserSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Некорректные данные пользователя' })
    return
  }

  const username = parsed.data.username.trim().toLowerCase()
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
      balance:
        parsed.data.balance ??
        (Number.isFinite(starting) ? Math.floor(starting) : 10_000),
      inventory: [],
    },
  })

  res.status(201).json({ user: toPublicUser(user) })
})
