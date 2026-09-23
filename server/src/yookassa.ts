import { prisma } from './prisma.js'

const API_BASE = 'https://api.yookassa.ru/v3'

type YooCredentials = {
  shopId: string
  secretKey: string
  publicAppUrl: string | null
}

let cache: { at: number; value: YooCredentials | null } | null = null
const CACHE_MS = 5_000

export function invalidateYooKassaCache(): void {
  cache = null
}

async function loadCredentials(): Promise<YooCredentials | null> {
  const now = Date.now()
  if (cache && now - cache.at < CACHE_MS) return cache.value

  const row = await prisma.paymentSettings.findUnique({
    where: { id: 'default' },
  })

  const shopId =
    row?.yooShopId?.trim() || process.env.YOOKASSA_SHOP_ID?.trim() || ''
  const secretKey =
    row?.yooSecretKey?.trim() || process.env.YOOKASSA_SECRET_KEY?.trim() || ''
  const publicAppUrl =
    row?.publicAppUrl?.trim() || process.env.PUBLIC_APP_URL?.trim() || null

  const value =
    shopId && secretKey ? { shopId, secretKey, publicAppUrl } : null
  cache = { at: now, value }
  return value
}

export async function isYooKassaConfigured(): Promise<boolean> {
  return Boolean(await loadCredentials())
}

function authHeader(creds: YooCredentials): string {
  return `Basic ${Buffer.from(`${creds.shopId}:${creds.secretKey}`).toString('base64')}`
}

export type YooPayment = {
  id: string
  status: string
  paid: boolean
  amount: { value: string; currency: string }
  confirmation?: { type: string; confirmation_url?: string }
  metadata?: Record<string, string>
}

export async function createYooPayment(input: {
  amountRub: number
  description: string
  returnUrl: string
  metadata: Record<string, string>
  idempotenceKey: string
}): Promise<YooPayment> {
  const creds = await loadCredentials()
  if (!creds) throw new Error('ЮKassa не настроена')

  const res = await fetch(`${API_BASE}/payments`, {
    method: 'POST',
    headers: {
      Authorization: authHeader(creds),
      'Content-Type': 'application/json',
      'Idempotence-Key': input.idempotenceKey,
    },
    body: JSON.stringify({
      amount: {
        value: input.amountRub.toFixed(2),
        currency: 'RUB',
      },
      capture: true,
      confirmation: {
        type: 'redirect',
        return_url: input.returnUrl,
      },
      description: input.description,
      metadata: input.metadata,
    }),
  })

  const data = (await res.json()) as YooPayment & {
    type?: string
    description?: string
    code?: string
  }

  if (!res.ok) {
    const msg = data.description ?? data.code ?? `YooKassa HTTP ${res.status}`
    throw new Error(msg)
  }

  return data
}

export async function getYooPayment(paymentId: string): Promise<YooPayment> {
  const creds = await loadCredentials()
  if (!creds) throw new Error('ЮKassa не настроена')

  const res = await fetch(
    `${API_BASE}/payments/${encodeURIComponent(paymentId)}`,
    {
      headers: {
        Authorization: authHeader(creds),
        'Content-Type': 'application/json',
      },
    },
  )

  const data = (await res.json()) as YooPayment & {
    type?: string
    description?: string
  }

  if (!res.ok) {
    throw new Error(data.description ?? `YooKassa HTTP ${res.status}`)
  }

  return data
}

/** PUBLIC_APP_URL from admin/DB/env, else first CORS_ORIGIN. */
export async function appReturnBaseUrl(): Promise<string> {
  const creds = await loadCredentials()
  const explicit = creds?.publicAppUrl
  if (explicit) return explicit.replace(/\/$/, '')

  const fromEnv = process.env.PUBLIC_APP_URL?.trim()
  if (fromEnv) return fromEnv.replace(/\/$/, '')

  const cors = process.env.CORS_ORIGIN ?? 'http://localhost:5173'
  const first = cors.split(',')[0]?.trim()
  return (first || 'http://localhost:5173').replace(/\/$/, '')
}

export function maskSecret(secret: string | null | undefined): string | null {
  if (!secret) return null
  if (secret.length <= 4) return '••••'
  return `••••••••${secret.slice(-4)}`
}
