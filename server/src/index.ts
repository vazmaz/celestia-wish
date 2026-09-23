import cors from 'cors'
import express from 'express'
import { ensureAdminSeeded } from './auth.js'
import { adminRouter } from './routes/admin.js'
import { authRouter } from './routes/auth.js'
import { meRouter } from './routes/me.js'
import { paymentsRouter, topupsRouter } from './routes/topups.js'

const app = express()
const port = Number(process.env.PORT ?? 3010)
const corsOrigin =
  process.env.CORS_ORIGIN ??
  'http://localhost:5173,http://127.0.0.1:5173,http://localhost:5174,http://127.0.0.1:5174'

app.use(
  cors({
    origin: corsOrigin.split(',').map((s) => s.trim()),
    credentials: true,
  }),
)
app.use(express.json({ limit: '1mb' }))

app.get('/api/health', (_req, res) => {
  res.json({ ok: true })
})

app.use('/api/auth', authRouter)
app.use('/api/me', meRouter)
app.use('/api/admin', adminRouter)
app.use('/api/topups', topupsRouter)
app.use('/api/payments', paymentsRouter)

app.use(
  (
    err: unknown,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    console.error(err)
    res.status(500).json({ error: 'Внутренняя ошибка сервера' })
  },
)

await ensureAdminSeeded()

app.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`)
})
