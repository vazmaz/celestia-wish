import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import type { Request, Response, NextFunction } from 'express'
import type { Role, User } from '@prisma/client'
import { prisma } from './prisma.js'

const JWT_SECRET = process.env.JWT_SECRET ?? 'dev-insecure-secret'
const TOKEN_TTL = '7d'

export type PublicUser = {
  id: string
  username: string
  role: Role
  balance: number
  inventory: unknown
  createdAt: number
  chatMutedUntil: number | null
  chatMuteReason: string | null
}

export function toPublicUser(user: User): PublicUser {
  return {
    id: user.id,
    username: user.username,
    role: user.role,
    balance: user.balance,
    inventory: user.inventory,
    createdAt: user.createdAt.getTime(),
    chatMutedUntil: user.chatMutedUntil?.getTime() ?? null,
    chatMuteReason: user.chatMuteReason ?? null,
  }
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10)
}

export async function verifyPassword(
  password: string,
  passwordHash: string,
): Promise<boolean> {
  return bcrypt.compare(password, passwordHash)
}

export function signToken(userId: string, role: Role): string {
  return jwt.sign({ sub: userId, role }, JWT_SECRET, { expiresIn: TOKEN_TTL })
}

export type AuthPayload = { sub: string; role: Role }

export function authRequired(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Требуется авторизация' })
    return
  }
  try {
    const payload = jwt.verify(header.slice(7), JWT_SECRET) as AuthPayload
    req.auth = payload
    next()
  } catch {
    res.status(401).json({ error: 'Сессия недействительна' })
  }
}

export function adminRequired(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (!req.auth || req.auth.role !== 'admin') {
    res.status(403).json({ error: 'Только администратор' })
    return
  }
  next()
}

export async function ensureAdminSeeded(): Promise<void> {
  const username = (process.env.ADMIN_USERNAME ?? 'admin').trim().toLowerCase()
  const password = process.env.ADMIN_PASSWORD ?? 'admin123'
  const existing = await prisma.user.findUnique({ where: { username } })
  if (existing) return

  await prisma.user.create({
    data: {
      username,
      passwordHash: await hashPassword(password),
      role: 'admin',
      balance: 50_000,
      inventory: [],
    },
  })
  console.log(`[seed] admin user created: ${username}`)
}

declare global {
  namespace Express {
    interface Request {
      auth?: AuthPayload
    }
  }
}
