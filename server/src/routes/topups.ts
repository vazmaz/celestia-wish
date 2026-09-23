import { Router } from 'express'
import { z } from 'zod'
import { authRequired, toPublicUser } from '../auth.js'
import { prisma } from '../prisma.js'

const createTopupSchema = z.object({
  amount: z.number().int().min(100).max(1_000_000),
})

export const topupsRouter = Router()

topupsRouter.use(authRequired)

topupsRouter.get('/', async (req, res) => {
  const topups = await prisma.topup.findMany({
    where: { userId: req.auth!.sub },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })
  res.json({
    topups: topups.map((t) => ({
      id: t.id,
      amount: t.amount,
      status: t.status,
      createdAt: t.createdAt.getTime(),
      paidAt: t.paidAt?.getTime() ?? null,
    })),
  })
})

topupsRouter.post('/', async (req, res) => {
  const parsed = createTopupSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Сумма от 100 до 1 000 000' })
    return
  }

  const topup = await prisma.topup.create({
    data: {
      userId: req.auth!.sub,
      amount: parsed.data.amount,
      status: 'pending',
    },
  })

  // Later: create payment at YooKassa / Stripe and return checkout URL.
  res.status(201).json({
    topup: {
      id: topup.id,
      amount: topup.amount,
      status: topup.status,
      createdAt: topup.createdAt.getTime(),
      paidAt: null,
    },
    demoConfirmPath: `/api/topups/${topup.id}/confirm-demo`,
  })
})

topupsRouter.post('/:id/confirm-demo', async (req, res) => {
  if (process.env.DEMO_PAYMENTS !== 'true') {
    res.status(403).json({ error: 'Демо-оплата отключена' })
    return
  }

  const result = await creditTopup(req.params.id, req.auth!.sub, `demo_${Date.now()}`)
  if (!result.ok) {
    res.status(result.status).json({ error: result.error })
    return
  }
  res.json({ topup: result.topup, user: result.user })
})

export const paymentsRouter = Router()

/**
 * Placeholder for a real payment provider webhook.
 * Body: { topupId, providerPaymentId, secret }
 */
paymentsRouter.post('/webhook', async (req, res) => {
  const secret = process.env.PAYMENT_WEBHOOK_SECRET
  if (secret && req.body?.secret !== secret) {
    res.status(401).json({ error: 'Invalid webhook secret' })
    return
  }

  const topupId = String(req.body?.topupId ?? '')
  const providerPaymentId = String(req.body?.providerPaymentId ?? `wh_${Date.now()}`)
  if (!topupId) {
    res.status(400).json({ error: 'topupId required' })
    return
  }

  const topup = await prisma.topup.findUnique({ where: { id: topupId } })
  if (!topup) {
    res.status(404).json({ error: 'Topup not found' })
    return
  }

  const result = await creditTopup(topup.id, topup.userId, providerPaymentId)
  if (!result.ok) {
    res.status(result.status).json({ error: result.error })
    return
  }
  res.json({ ok: true, topup: result.topup })
})

async function creditTopup(
  topupId: string,
  userId: string,
  providerPaymentId: string,
): Promise<
  | {
      ok: true
      topup: {
        id: string
        amount: number
        status: string
        createdAt: number
        paidAt: number | null
      }
      user: ReturnType<typeof toPublicUser>
    }
  | { ok: false; status: number; error: string }
> {
  const topup = await prisma.topup.findUnique({ where: { id: topupId } })
  if (!topup || topup.userId !== userId) {
    return { ok: false, status: 404, error: 'Пополнение не найдено' }
  }
  if (topup.status === 'paid') {
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } })
    return {
      ok: true,
      topup: {
        id: topup.id,
        amount: topup.amount,
        status: topup.status,
        createdAt: topup.createdAt.getTime(),
        paidAt: topup.paidAt?.getTime() ?? null,
      },
      user: toPublicUser(user),
    }
  }
  if (topup.status !== 'pending') {
    return { ok: false, status: 409, error: 'Пополнение недоступно' }
  }

  const [updatedTopup, user] = await prisma.$transaction(async (tx) => {
    const paid = await tx.topup.update({
      where: { id: topupId },
      data: {
        status: 'paid',
        paidAt: new Date(),
        providerPaymentId,
      },
    })
    const credited = await tx.user.update({
      where: { id: userId },
      data: { balance: { increment: topup.amount } },
    })
    return [paid, credited] as const
  })

  return {
    ok: true,
    topup: {
      id: updatedTopup.id,
      amount: updatedTopup.amount,
      status: updatedTopup.status,
      createdAt: updatedTopup.createdAt.getTime(),
      paidAt: updatedTopup.paidAt?.getTime() ?? null,
    },
    user: toPublicUser(user),
  }
}
