import { Router } from 'express'
import { z } from 'zod'
import { authRequired, toPublicUser } from '../auth.js'
import { prisma } from '../prisma.js'

const economySchema = z.object({
  balance: z.number().int().min(0).optional(),
  inventory: z.array(z.unknown()).optional(),
})

export const meRouter = Router()

meRouter.use(authRequired)

meRouter.patch('/economy', async (req, res) => {
  const parsed = economySchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Некорректные данные экономики' })
    return
  }

  const data: { balance?: number; inventory?: object } = {}
  if (parsed.data.balance != null) data.balance = parsed.data.balance
  if (parsed.data.inventory != null) {
    data.inventory = parsed.data.inventory as object
  }

  const user = await prisma.user.update({
    where: { id: req.auth!.sub },
    data,
  })

  res.json({ user: toPublicUser(user) })
})
