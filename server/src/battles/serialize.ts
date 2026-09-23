import type { BattleRoom } from '@prisma/client'
import { prisma } from '../prisma.js'
import { createUid } from './random.js'
import {
  REVEAL_MS,
  SPIN_MS,
  advanceAfterReveal,
} from './roomLogic.js'
import type {
  BattlePhase,
  BattlePlayer,
  BattlePrivacy,
  BattleStatus,
  PublicBattleRoom,
  RoundDrop,
  TeamId,
} from './types.js'

export function parsePlayers(raw: unknown): BattlePlayer[] {
  if (!Array.isArray(raw)) return []
  return (raw as BattlePlayer[]).map((p) => ({
    ...p,
    teamId: p.teamId ?? null,
  }))
}

export function parseDrops(raw: unknown): RoundDrop[] {
  return Array.isArray(raw) ? (raw as RoundDrop[]) : []
}

export function parseCaseIds(raw: unknown): string[] {
  return Array.isArray(raw) ? (raw as string[]) : []
}

export function toPublicRoom(
  room: BattleRoom,
  phaseEndsInMs: number | null = null,
): PublicBattleRoom {
  return {
    id: room.id,
    inviteCode: room.inviteCode,
    hostUserId: room.hostUserId,
    privacy: room.privacy as BattlePrivacy,
    status: room.status as BattleStatus,
    phase: room.phase as BattlePhase,
    maxPlayers: room.maxPlayers,
    teamSize: room.teamSize ?? 1,
    caseIds: parseCaseIds(room.caseIds),
    mode: room.mode,
    fillBots: room.fillBots,
    seed: room.seed,
    players: parsePlayers(room.players),
    drops: parseDrops(room.drops),
    currentRound: room.currentRound,
    totalRounds: room.totalRounds,
    suddenDeath: room.suddenDeath,
    winnerId: room.winnerId,
    winnerTeamId: (room.winnerTeamId as TeamId | null) ?? null,
    entryFee: room.entryFee,
    phaseStartedAt: room.phaseStartedAt?.getTime() ?? null,
    finishedAt: room.finishedAt?.getTime() ?? null,
    payoutDone: room.payoutDone,
    createdAt: room.createdAt.getTime(),
    updatedAt: room.updatedAt.getTime(),
    phaseEndsInMs,
  }
}

function phaseEndsIn(room: BattleRoom): number | null {
  if (room.status !== 'running' || !room.phaseStartedAt) return null
  const elapsed = Date.now() - room.phaseStartedAt.getTime()
  const budget = room.phase === 'spinning' ? SPIN_MS : REVEAL_MS
  return Math.max(0, budget - elapsed)
}

type InventoryItem = {
  uid: string
  itemId: string
  caseId: string
  name: string
  rarity: string
  value: number
  accent: string
  image: string
  obtainedAt: number
  source?: string
  battleId?: string
}

async function settlePayout(room: BattleRoom): Promise<BattleRoom> {
  if (room.payoutDone || room.status !== 'finished') {
    return room
  }

  const players = parsePlayers(room.players)
  const drops = parseDrops(room.drops)
  const teamSize = room.teamSize ?? 1

  const recipients: BattlePlayer[] =
    teamSize > 1 && room.winnerTeamId
      ? players.filter(
          (p) =>
            p.teamId === room.winnerTeamId &&
            p.kind === 'user' &&
            p.userId &&
            !p.forfeited,
        )
      : (() => {
          const winner = players.find((p) => p.id === room.winnerId)
          return winner && winner.kind === 'user' && winner.userId
            ? [winner]
            : []
        })()

  if (recipients.length === 0 || drops.length === 0) {
    return prisma.battleRoom.update({
      where: { id: room.id },
      data: { payoutDone: true },
    })
  }

  const byUser = new Map<string, InventoryItem[]>()
  for (const r of recipients) {
    if (r.userId) byUser.set(r.userId, [])
  }

  drops.forEach((d, i) => {
    const recipient = recipients[i % recipients.length]
    if (!recipient.userId) return
    byUser.get(recipient.userId)!.push({
      uid: createUid(),
      itemId: d.item.itemId,
      caseId: d.item.caseId,
      name: d.item.name,
      rarity: d.item.rarity,
      value: d.item.value,
      accent: d.item.accent,
      image: d.item.image,
      obtainedAt: Date.now(),
      source: 'battle',
      battleId: room.id,
    })
  })

  await prisma.$transaction(async (tx) => {
    for (const [userId, granted] of byUser) {
      if (granted.length === 0) continue
      const user = await tx.user.findUnique({ where: { id: userId } })
      if (!user) continue
      const inventory = Array.isArray(user.inventory)
        ? (user.inventory as InventoryItem[])
        : []
      await tx.user.update({
        where: { id: userId },
        data: { inventory: [...granted, ...inventory] },
      })
    }
    await tx.battleRoom.update({
      where: { id: room.id },
      data: { payoutDone: true },
    })
  })

  return (
    (await prisma.battleRoom.findUnique({ where: { id: room.id } })) ?? {
      ...room,
      payoutDone: true,
    }
  )
}

/** Serialize reconcile per room so concurrent polls don't reset phase timers. */
const reconcileLocks = new Map<string, Promise<void>>()

async function withRoomLock<T>(roomId: string, fn: () => Promise<T>): Promise<T> {
  const prev = reconcileLocks.get(roomId) ?? Promise.resolve()
  let release!: () => void
  const gate = new Promise<void>((resolve) => {
    release = resolve
  })
  const chain = prev.then(() => gate)
  reconcileLocks.set(roomId, chain)
  await prev
  try {
    return await fn()
  } finally {
    release()
    if (reconcileLocks.get(roomId) === chain) {
      reconcileLocks.delete(roomId)
    }
  }
}

/**
 * Auto-advance spinning → revealed → next round / finish based on wall clock.
 * Safe to call on every read; catches up if clients were offline.
 */
export async function reconcileRoom(room: BattleRoom): Promise<{
  room: BattleRoom
  phaseEndsInMs: number | null
}> {
  return withRoomLock(room.id, async () => {
    // Re-read under lock — stale callers must not advance on outdated snapshots.
    const fresh =
      (await prisma.battleRoom.findUnique({ where: { id: room.id } })) ?? room

    if (fresh.status !== 'running' || !fresh.phaseStartedAt) {
      if (fresh.status === 'finished' && !fresh.payoutDone) {
        const settled = await settlePayout(fresh)
        return { room: settled, phaseEndsInMs: null }
      }
      return { room: fresh, phaseEndsInMs: null }
    }

    let current = fresh
    const maxSteps = Math.max(64, current.totalRounds * 2 + 16)

    for (let guard = 0; guard < maxSteps; guard++) {
      if (current.status !== 'running' || !current.phaseStartedAt) break

      const elapsed = Date.now() - current.phaseStartedAt.getTime()

      if (current.phase === 'spinning') {
        if (elapsed < SPIN_MS) break
        const moved = await prisma.battleRoom.updateMany({
          where: {
            id: current.id,
            status: 'running',
            phase: 'spinning',
            phaseStartedAt: current.phaseStartedAt,
          },
          data: {
            phase: 'revealed',
            phaseStartedAt: new Date(),
          },
        })
        if (moved.count === 0) {
          current =
            (await prisma.battleRoom.findUnique({ where: { id: current.id } })) ??
            current
          continue
        }
        current =
          (await prisma.battleRoom.findUnique({ where: { id: current.id } })) ??
          current
        continue
      }

      if (current.phase === 'revealed') {
        if (elapsed < REVEAL_MS) break

        const players = parsePlayers(current.players)
        const drops = parseDrops(current.drops)
        const caseIds = parseCaseIds(current.caseIds)
        const result = advanceAfterReveal({
          players,
          drops,
          currentRound: current.currentRound,
          totalRounds: current.totalRounds,
          suddenDeath: current.suddenDeath,
          caseIds,
          seed: current.seed,
          teamSize: current.teamSize ?? 1,
        })

        if (result.kind === 'finish') {
          const moved = await prisma.battleRoom.updateMany({
            where: {
              id: current.id,
              status: 'running',
              phase: 'revealed',
              phaseStartedAt: current.phaseStartedAt,
            },
            data: {
              status: 'finished',
              phase: 'revealed',
              winnerId: result.winnerId,
              winnerTeamId: result.winnerTeamId,
              finishedAt: new Date(),
              phaseStartedAt: new Date(),
            },
          })
          if (moved.count === 0) {
            current =
              (await prisma.battleRoom.findUnique({ where: { id: current.id } })) ??
              current
            continue
          }
          current =
            (await prisma.battleRoom.findUnique({ where: { id: current.id } })) ??
            current
          current = await settlePayout(current)
          break
        }

        const moved = await prisma.battleRoom.updateMany({
          where: {
            id: current.id,
            status: 'running',
            phase: 'revealed',
            phaseStartedAt: current.phaseStartedAt,
          },
          data: {
            phase: 'spinning',
            phaseStartedAt: new Date(),
            currentRound: result.currentRound,
            totalRounds: result.totalRounds,
            suddenDeath: result.suddenDeath,
            drops: result.drops,
          },
        })
        if (moved.count === 0) {
          current =
            (await prisma.battleRoom.findUnique({ where: { id: current.id } })) ??
            current
          continue
        }
        current =
          (await prisma.battleRoom.findUnique({ where: { id: current.id } })) ??
          current
        continue
      }

      break
    }

    return { room: current, phaseEndsInMs: phaseEndsIn(current) }
  })
}

export async function loadAndReconcile(id: string): Promise<{
  room: BattleRoom
  phaseEndsInMs: number | null
} | null> {
  const found = await prisma.battleRoom.findUnique({ where: { id } })
  if (!found) return null
  return reconcileRoom(found)
}
