import { Router } from 'express'
import { z } from 'zod'
import {
  adminRequired,
  authRequired,
  hashPassword,
  toPublicUser,
} from '../auth.js'
import { prisma } from '../prisma.js'
import {
  invalidateYooKassaCache,
  isYooKassaConfigured,
  maskSecret,
} from '../yookassa.js'

export const adminRouter = Router()
adminRouter.use(authRequired, adminRequired)

adminRouter.get('/payments', async (_req, res) => {
  const row = await prisma.paymentSettings.findUnique({
    where: { id: 'default' },
  })
  const envShop = Boolean(process.env.YOOKASSA_SHOP_ID?.trim())
  const envSecret = Boolean(process.env.YOOKASSA_SECRET_KEY?.trim())
  const configured = await isYooKassaConfigured()

  res.json({
    settings: {
      yooShopId: row?.yooShopId ?? '',
      yooSecretKeyMasked: maskSecret(row?.yooSecretKey),
      hasSecretKey: Boolean(row?.yooSecretKey?.trim()),
      publicAppUrl: row?.publicAppUrl ?? '',
      updatedAt: row?.updatedAt?.getTime() ?? null,
      source: {
        db: Boolean(row?.yooShopId?.trim() && row?.yooSecretKey?.trim()),
        env: envShop && envSecret,
      },
      configured,
      demoPayments: process.env.DEMO_PAYMENTS === 'true',
    },
  })
})

const paymentsSchema = z.object({
  yooShopId: z.string().trim().max(64).optional(),
  yooSecretKey: z.string().trim().max(256).optional(),
  publicAppUrl: z.string().trim().max(512).optional(),
  clearSecretKey: z.boolean().optional(),
})

adminRouter.put('/payments', async (req, res) => {
  const parsed = paymentsSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Некорректные данные' })
    return
  }

  const existing = await prisma.paymentSettings.findUnique({
    where: { id: 'default' },
  })

  let nextSecret = existing?.yooSecretKey ?? null
  if (parsed.data.clearSecretKey) {
    nextSecret = null
  } else if (
    parsed.data.yooSecretKey != null &&
    parsed.data.yooSecretKey.length > 0
  ) {
    nextSecret = parsed.data.yooSecretKey
  }

  const row = await prisma.paymentSettings.upsert({
    where: { id: 'default' },
    create: {
      id: 'default',
      yooShopId: parsed.data.yooShopId || null,
      yooSecretKey: nextSecret,
      publicAppUrl: parsed.data.publicAppUrl || null,
    },
    update: {
      ...(parsed.data.yooShopId !== undefined
        ? { yooShopId: parsed.data.yooShopId || null }
        : {}),
      yooSecretKey: nextSecret,
      ...(parsed.data.publicAppUrl !== undefined
        ? { publicAppUrl: parsed.data.publicAppUrl || null }
        : {}),
    },
  })

  invalidateYooKassaCache()
  const configured = await isYooKassaConfigured()

  res.json({
    settings: {
      yooShopId: row.yooShopId ?? '',
      yooSecretKeyMasked: maskSecret(row.yooSecretKey),
      hasSecretKey: Boolean(row.yooSecretKey?.trim()),
      publicAppUrl: row.publicAppUrl ?? '',
      updatedAt: row.updatedAt.getTime(),
      configured,
      demoPayments: process.env.DEMO_PAYMENTS === 'true',
    },
  })
})

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
