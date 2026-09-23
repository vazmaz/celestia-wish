import { Router } from 'express'
import { z } from 'zod'
import { authRequired, toPublicUser } from '../auth.js'
import { prisma } from '../prisma.js'
import {
  appReturnBaseUrl,
  createYooPayment,
  getYooPayment,
  isYooKassaConfigured,
} from '../yookassa.js'

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

topupsRouter.get('/:id', async (req, res) => {
  const topup = await prisma.topup.findUnique({ where: { id: req.params.id } })
  if (!topup || topup.userId !== req.auth!.sub) {
    res.status(404).json({ error: 'Пополнение не найдено' })
    return
  }

  // After return from YooKassa, sync status if webhook hasn't landed yet.
  if (
    topup.status === 'pending' &&
    topup.providerPaymentId &&
    (await isYooKassaConfigured())
  ) {
    try {
      const payment = await getYooPayment(topup.providerPaymentId)
      if (payment.status === 'succeeded' && payment.paid) {
        const credited = await creditTopup(
          topup.id,
          topup.userId,
          payment.id,
          payment.amount.value,
        )
        if (credited.ok) {
          res.json({ topup: credited.topup, user: credited.user })
          return
        }
      }
    } catch (err) {
      console.error('YooKassa status sync failed', err)
    }
  }

  const fresh = await prisma.topup.findUniqueOrThrow({
    where: { id: topup.id },
  })
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: req.auth!.sub },
  })
  res.json({
    topup: {
      id: fresh.id,
      amount: fresh.amount,
      status: fresh.status,
      createdAt: fresh.createdAt.getTime(),
      paidAt: fresh.paidAt?.getTime() ?? null,
    },
    user: toPublicUser(user),
  })
})

topupsRouter.post('/', async (req, res) => {
  const parsed = createTopupSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Сумма от 100 до 1 000 000' })
    return
  }

  const amount = parsed.data.amount
  const userId = req.auth!.sub

  const topup = await prisma.topup.create({
    data: {
      userId,
      amount,
      status: 'pending',
    },
  })

  const payload = {
    topup: {
      id: topup.id,
      amount: topup.amount,
      status: topup.status,
      createdAt: topup.createdAt.getTime(),
      paidAt: null as number | null,
    },
  }

  if (await isYooKassaConfigured()) {
    try {
      const returnUrl = `${await appReturnBaseUrl()}/?topup=${encodeURIComponent(topup.id)}`
      const payment = await createYooPayment({
        amountRub: amount,
        description: `Пополнение баланса: ${amount} кристаллов`,
        returnUrl,
        metadata: {
          topupId: topup.id,
          userId,
        },
        idempotenceKey: topup.id,
      })

      const confirmationUrl = payment.confirmation?.confirmation_url
      if (!confirmationUrl) {
        await prisma.topup.update({
          where: { id: topup.id },
          data: { status: 'failed' },
        })
        res.status(502).json({ error: 'ЮKassa не вернула ссылку на оплату' })
        return
      }

      await prisma.topup.update({
        where: { id: topup.id },
        data: { providerPaymentId: payment.id },
      })

      res.status(201).json({
        ...payload,
        confirmationUrl,
        mode: 'yookassa' as const,
      })
      return
    } catch (err) {
      console.error('YooKassa create payment failed', err)
      await prisma.topup.update({
        where: { id: topup.id },
        data: { status: 'failed' },
      })
      res.status(502).json({
        error:
          err instanceof Error
            ? `ЮKassa: ${err.message}`
            : 'Не удалось создать платёж в ЮKassa',
      })
      return
    }
  }

  if (process.env.DEMO_PAYMENTS === 'true') {
    res.status(201).json({
      ...payload,
      demoConfirmPath: `/api/topups/${topup.id}/confirm-demo`,
      mode: 'demo' as const,
    })
    return
  }

  await prisma.topup.update({
    where: { id: topup.id },
    data: { status: 'failed' },
  })
  res.status(503).json({
    error:
      'Платежи не настроены. Укажи YOOKASSA_SHOP_ID и YOOKASSA_SECRET_KEY или DEMO_PAYMENTS=true',
  })
})

topupsRouter.post('/:id/confirm-demo', async (req, res) => {
  if (process.env.DEMO_PAYMENTS !== 'true') {
    res.status(403).json({ error: 'Демо-оплата отключена' })
    return
  }
  if (await isYooKassaConfigured()) {
    res.status(403).json({ error: 'Демо-оплата недоступна при настроенной ЮKassa' })
    return
  }

  const result = await creditTopup(
    req.params.id,
    req.auth!.sub,
    `demo_${Date.now()}`,
  )
  if (!result.ok) {
    res.status(result.status).json({ error: result.error })
    return
  }
  res.json({ topup: result.topup, user: result.user })
})

export const paymentsRouter = Router()

/**
 * ЮKassa HTTP-уведомления.
 * В кабинете ЮKassa укажи URL: https://<api-host>/api/payments/webhook
 */
paymentsRouter.post('/webhook', async (req, res) => {
  const event = String(req.body?.event ?? '')
  const object = req.body?.object as
    | {
        id?: string
        status?: string
        paid?: boolean
        amount?: { value?: string; currency?: string }
        metadata?: { topupId?: string; userId?: string }
      }
    | undefined

  if (!object?.id) {
    res.status(400).json({ error: 'Invalid notification' })
    return
  }

  // Only credit on success; acknowledge other events so ЮKassa stops retrying.
  if (event !== 'payment.succeeded' && object.status !== 'succeeded') {
    res.json({ ok: true, ignored: true })
    return
  }

  if (!(await isYooKassaConfigured())) {
    res.status(503).json({ error: 'YooKassa not configured' })
    return
  }

  let payment
  try {
    payment = await getYooPayment(object.id)
  } catch (err) {
    console.error('YooKassa webhook verify failed', err)
    res.status(502).json({ error: 'Payment verify failed' })
    return
  }

  if (payment.status !== 'succeeded' || !payment.paid) {
    res.json({ ok: true, ignored: true })
    return
  }

  const topupId =
    payment.metadata?.topupId ?? object.metadata?.topupId ?? ''
  if (!topupId) {
    res.status(400).json({ error: 'metadata.topupId missing' })
    return
  }

  const topup = await prisma.topup.findUnique({ where: { id: topupId } })
  if (!topup) {
    res.status(404).json({ error: 'Topup not found' })
    return
  }

  const result = await creditTopup(
    topup.id,
    topup.userId,
    payment.id,
    payment.amount.value,
  )
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
  paidAmountValue?: string,
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

  if (paidAmountValue != null) {
    const paidRub = Math.round(Number.parseFloat(paidAmountValue))
    if (!Number.isFinite(paidRub) || paidRub !== topup.amount) {
      return { ok: false, status: 409, error: 'Сумма платежа не совпадает' }
    }
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

  // Same YooKassa payment must not credit another topup.
  if (providerPaymentId && !providerPaymentId.startsWith('demo_')) {
    const clash = await prisma.topup.findFirst({
      where: {
        providerPaymentId,
        status: 'paid',
        NOT: { id: topupId },
      },
    })
    if (clash) {
      return { ok: false, status: 409, error: 'Платёж уже использован' }
    }
  }

  try {
    const [updatedTopup, user] = await prisma.$transaction(async (tx) => {
      const locked = await tx.topup.updateMany({
        where: { id: topupId, status: 'pending' },
        data: {
          status: 'paid',
          paidAt: new Date(),
          providerPaymentId,
        },
      })
      if (locked.count === 0) {
        throw new Error('ALREADY_PROCESSED')
      }
      const paid = await tx.topup.findUniqueOrThrow({ where: { id: topupId } })
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
  } catch (err) {
    if (err instanceof Error && err.message === 'ALREADY_PROCESSED') {
      const fresh = await prisma.topup.findUniqueOrThrow({
        where: { id: topupId },
      })
      const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } })
      return {
        ok: true,
        topup: {
          id: fresh.id,
          amount: fresh.amount,
          status: fresh.status,
          createdAt: fresh.createdAt.getTime(),
          paidAt: fresh.paidAt?.getTime() ?? null,
        },
        user: toPublicUser(user),
      }
    }
    throw err
  }
}
