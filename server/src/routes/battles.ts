import { Router } from 'express'
import { z } from 'zod'
import { authRequired, toPublicUser } from '../auth.js'
import { prisma } from '../prisma.js'
import { entryFeeFor, getCaseById } from '../battles/casesCatalog.js'
import {
  createInviteCode,
  createSeed,
} from '../battles/random.js'
import {
  canStart,
  fillWithBots,
  isLobbyFull,
  makeBot,
  makeUserPlayer,
  applyForfeit,
  startDrops,
  pickTeamForJoin,
  SPIN_MS,
} from '../battles/roomLogic.js'
import {
  loadAndReconcile,
  parseCaseIds,
  parsePlayers,
  reconcileRoom,
  toPublicRoom,
} from '../battles/serialize.js'
import {
  formatConfig,
  type BattleFormat,
  type BattlePlayer,
  type BotLuck,
} from '../battles/types.js'
import type { BattleRoom } from '@prisma/client'

type StartBattleResult =
  | { ok: true; room: BattleRoom }
  | { ok: false; error: string; status: number }

/**
 * Start a lobby battle: charge humans, roll drops, set spinning.
 * When `requireReady` is false (auto-start on full lobby), ready flags are ignored.
 */
async function startBattleRoom(
  room: BattleRoom,
  options: { fillBots: boolean; requireReady: boolean },
): Promise<StartBattleResult> {
  if (room.status !== 'lobby') {
    return { ok: false, error: 'Лобби недоступно', status: 400 }
  }

  let players = parsePlayers(room.players)
  const teamSize = room.teamSize ?? 1

  if (options.fillBots && players.length < room.maxPlayers) {
    players = fillWithBots(players, room.maxPlayers, teamSize)
  }

  if (options.requireReady) {
    if (!canStart(players, room.maxPlayers)) {
      return {
        ok: false,
        error:
          teamSize > 1
            ? 'Нужны полные команды и все Ready (или включи добивку ботами)'
            : 'Нужны ≥2 игрока и все Ready',
        status: 400,
      }
    }
  } else if (!isLobbyFull(players, room.maxPlayers, teamSize)) {
    return { ok: false, error: 'Лобби ещё не заполнено', status: 400 }
  }

  const caseIds = parseCaseIds(room.caseIds)
  const fee = room.entryFee
  const humanIds = players
    .filter((p) => p.kind === 'user' && p.userId)
    .map((p) => p.userId!)

  try {
    const started = await prisma.$transaction(async (tx) => {
      const fresh = await tx.battleRoom.findUnique({ where: { id: room.id } })
      if (!fresh || fresh.status !== 'lobby') {
        throw new Error('NOT_LOBBY')
      }

      const users = await tx.user.findMany({
        where: { id: { in: humanIds } },
      })
      if (users.length !== humanIds.length) {
        throw new Error('PLAYER_MISSING')
      }
      for (const u of users) {
        if (u.balance < fee) throw new Error(`FUNDS:${u.username}`)
      }

      for (const u of users) {
        await tx.user.update({
          where: { id: u.id },
          data: { balance: u.balance - fee },
        })
      }

      players = players.map((p) =>
        p.kind === 'user' ? { ...p, entryPaid: true, ready: true } : p,
      )

      const { drops, totalRounds } = startDrops({
        seed: room.seed,
        caseIds,
        players,
      })

      return tx.battleRoom.update({
        where: { id: room.id },
        data: {
          status: 'running',
          phase: 'spinning',
          phaseStartedAt: new Date(),
          players,
          drops,
          currentRound: 0,
          totalRounds,
          suddenDeath: false,
          winnerId: null,
          winnerTeamId: null,
        },
      })
    })

    return { ok: true, room: started }
  } catch (err) {
    const msg = err instanceof Error ? err.message : ''
    if (msg.startsWith('FUNDS:')) {
      return {
        ok: false,
        error: `У игрока ${msg.slice(6)} недостаточно средств`,
        status: 400,
      }
    }
    if (msg === 'PLAYER_MISSING') {
      return { ok: false, error: 'Игрок не найден', status: 400 }
    }
    if (msg === 'NOT_LOBBY') {
      return { ok: false, error: 'Лобби недоступно', status: 400 }
    }
    throw err
  }
}

async function autoStartIfFull(room: BattleRoom): Promise<BattleRoom> {
  const players = parsePlayers(room.players)
  const teamSize = room.teamSize ?? 1
  if (!isLobbyFull(players, room.maxPlayers, teamSize)) return room
  const result = await startBattleRoom(room, {
    fillBots: false,
    requireReady: false,
  })
  return result.ok ? result.room : room
}

const createSchema = z.object({
  format: z
    .enum(['ffa2', 'ffa3', 'ffa4', '2v2', '3v3'])
    .default('ffa2'),
  /** @deprecated prefer format — kept for older clients */
  maxPlayers: z.union([z.literal(2), z.literal(3), z.literal(4)]).optional(),
  caseIds: z.array(z.string().min(1)).min(1).max(500),
  privacy: z.enum(['public', 'private']).default('public'),
  fillBots: z.boolean().default(true),
})

const readySchema = z.object({
  ready: z.boolean().optional(),
})

const botSchema = z.object({
  luck: z.enum(['cold', 'neutral', 'hot']).optional(),
})

export const battlesRouter = Router()
battlesRouter.use(authRequired)

function uniqueInviteCode(): string {
  return createInviteCode()
}

/** Public lobbies + live public matches for the lobby board. */
battlesRouter.get('/feed', async (_req, res) => {
  const rows = await prisma.battleRoom.findMany({
    where: {
      privacy: 'public',
      status: { in: ['lobby', 'running'] },
    },
    orderBy: { createdAt: 'desc' },
    take: 40,
  })

  const rooms = []
  for (const row of rows) {
    const { room, phaseEndsInMs } = await reconcileRoom(row)
    // Skip emptied lobbies that somehow linger
    if (room.status === 'cancelled') continue
    rooms.push(toPublicRoom(room, phaseEndsInMs))
  }

  res.json({
    lobbies: rooms.filter((r) => r.status === 'lobby'),
    live: rooms.filter((r) => r.status === 'running'),
  })
})

battlesRouter.get('/invite/:code', async (req, res) => {
  const code = String(req.params.code ?? '')
    .trim()
    .toUpperCase()
  if (!code) {
    res.status(400).json({ error: 'Укажи код инвайта' })
    return
  }
  const found = await prisma.battleRoom.findFirst({
    where: { inviteCode: code },
  })
  if (!found) {
    res.status(404).json({ error: 'Лобби с таким кодом не найдено' })
    return
  }
  const { room, phaseEndsInMs } = await reconcileRoom(found)
  res.json({ room: toPublicRoom(room, phaseEndsInMs) })
})

battlesRouter.get('/:id', async (req, res) => {
  const id = String(req.params.id ?? '')
  const loaded = await loadAndReconcile(id)
  if (!loaded) {
    res.status(404).json({ error: 'Баттл не найден' })
    return
  }
  res.json({
    room: toPublicRoom(loaded.room, loaded.phaseEndsInMs),
  })
})

battlesRouter.post('/', async (req, res) => {
  const parsed = createSchema.safeParse(req.body)
  if (!parsed.success) {
    const tooMany = parsed.error.issues.some(
      (i) => i.path[0] === 'caseIds' && i.code === 'too_big',
    )
    res.status(400).json({
      error: tooMany
        ? 'Слишком много кейсов (макс. 500)'
        : 'Некорректные данные баттла',
    })
    return
  }

  const { caseIds, privacy, fillBots } = parsed.data
  let format: BattleFormat = parsed.data.format
  if (!parsed.data.format && parsed.data.maxPlayers) {
    format =
      parsed.data.maxPlayers === 2
        ? 'ffa2'
        : parsed.data.maxPlayers === 3
          ? 'ffa3'
          : 'ffa4'
  }
  const { maxPlayers, teamSize } = formatConfig(format)

  if (!caseIds.every((id) => getCaseById(id))) {
    res.status(400).json({ error: 'Неизвестный кейс' })
    return
  }

  const fee = entryFeeFor(caseIds)
  const user = await prisma.user.findUnique({ where: { id: req.auth!.sub } })
  if (!user) {
    res.status(401).json({ error: 'Сессия недействительна' })
    return
  }
  if (user.balance < fee) {
    res.status(400).json({ error: 'Недостаточно средств на вход' })
    return
  }

  const hostTeam = teamSize > 1 ? ('A' as const) : null
  const host = makeUserPlayer(user.id, user.username, hostTeam)
  host.ready = true

  const room = await prisma.battleRoom.create({
    data: {
      inviteCode: uniqueInviteCode(),
      hostUserId: user.id,
      privacy,
      status: 'lobby',
      phase: 'idle',
      maxPlayers,
      teamSize,
      caseIds,
      mode: 'highest',
      fillBots,
      seed: createSeed(),
      players: [host],
      drops: [],
      currentRound: 0,
      totalRounds: caseIds.length,
      suddenDeath: false,
      entryFee: fee,
    },
  })

  res.status(201).json({ room: toPublicRoom(room) })
})

battlesRouter.post('/:id/join', async (req, res) => {
  const id = String(req.params.id ?? '')
  const loaded = await loadAndReconcile(id)
  if (!loaded) {
    res.status(404).json({ error: 'Баттл не найден' })
    return
  }
  let { room } = loaded

  if (room.status !== 'lobby') {
    // Allow “join” into running/finished as spectator — just return room
    res.json({
      room: toPublicRoom(room, loaded.phaseEndsInMs),
      role: 'spectator',
    })
    return
  }

  const user = await prisma.user.findUnique({ where: { id: req.auth!.sub } })
  if (!user) {
    res.status(401).json({ error: 'Сессия недействительна' })
    return
  }

  const players = parsePlayers(room.players)
  if (players.some((p) => p.userId === user.id)) {
    res.json({ room: toPublicRoom(room), role: 'player' })
    return
  }

  if (players.length >= room.maxPlayers) {
    res.status(400).json({ error: 'Лобби заполнено' })
    return
  }

  if (user.balance < room.entryFee) {
    res.status(400).json({ error: 'Недостаточно средств на вход' })
    return
  }

  const teamSize = room.teamSize ?? 1
  const teamId = pickTeamForJoin(players, teamSize)
  if (teamSize > 1 && teamId == null) {
    res.status(400).json({ error: 'Лобби заполнено' })
    return
  }

  const nextPlayers = [
    ...players,
    makeUserPlayer(user.id, user.username, teamId),
  ]
  room = await prisma.battleRoom.update({
    where: { id: room.id },
    data: { players: nextPlayers },
  })

  room = await autoStartIfFull(room)

  res.json({
    room: toPublicRoom(
      room,
      room.status === 'running' && room.phase === 'spinning' ? SPIN_MS : null,
    ),
    role: 'player',
  })
})

battlesRouter.post('/:id/leave', async (req, res) => {
  const id = String(req.params.id ?? '')
  const room = await prisma.battleRoom.findUnique({ where: { id } })
  if (!room) {
    res.status(404).json({ error: 'Баттл не найден' })
    return
  }
  if (room.status !== 'lobby') {
    res.status(400).json({ error: 'Нельзя выйти после старта — используй forfeit' })
    return
  }

  const userId = req.auth!.sub
  let players = parsePlayers(room.players).filter((p) => p.userId !== userId)

  // Host leaving: transfer host or cancel
  if (room.hostUserId === userId) {
    const nextHost = players.find((p) => p.kind === 'user')
    if (!nextHost) {
      await prisma.battleRoom.update({
        where: { id },
        data: { status: 'cancelled', players: [] },
      })
      res.json({ ok: true, cancelled: true })
      return
    }
    const updated = await prisma.battleRoom.update({
      where: { id },
      data: {
        hostUserId: nextHost.userId!,
        players,
      },
    })
    res.json({ room: toPublicRoom(updated), cancelled: false })
    return
  }

  const updated = await prisma.battleRoom.update({
    where: { id },
    data: { players },
  })
  res.json({ room: toPublicRoom(updated), cancelled: false })
})

battlesRouter.post('/:id/ready', async (req, res) => {
  const parsed = readySchema.safeParse(req.body ?? {})
  if (!parsed.success) {
    res.status(400).json({ error: 'Некорректные данные' })
    return
  }

  const id = String(req.params.id ?? '')
  const room = await prisma.battleRoom.findUnique({ where: { id } })
  if (!room || room.status !== 'lobby') {
    res.status(400).json({ error: 'Лобби недоступно' })
    return
  }

  const userId = req.auth!.sub
  const players = parsePlayers(room.players).map((p) => {
    if (p.userId !== userId) return p
    const ready = parsed.data.ready ?? !p.ready
    return { ...p, ready }
  })

  if (!players.some((p) => p.userId === userId)) {
    res.status(400).json({ error: 'Ты не в этом лобби' })
    return
  }

  const updated = await prisma.battleRoom.update({
    where: { id },
    data: { players },
  })
  res.json({ room: toPublicRoom(updated) })
})

battlesRouter.post('/:id/bots', async (req, res) => {
  const parsed = botSchema.safeParse(req.body ?? {})
  if (!parsed.success) {
    res.status(400).json({ error: 'Некорректные данные' })
    return
  }

  const id = String(req.params.id ?? '')
  const room = await prisma.battleRoom.findUnique({ where: { id } })
  if (!room || room.status !== 'lobby') {
    res.status(400).json({ error: 'Лобби недоступно' })
    return
  }
  if (room.hostUserId !== req.auth!.sub && req.auth!.role !== 'admin') {
    res.status(403).json({ error: 'Только хост или админ может добавлять ботов' })
    return
  }

  const players = parsePlayers(room.players)
  if (players.length >= room.maxPlayers) {
    res.status(400).json({ error: 'Лобби заполнено' })
    return
  }

  const teamSize = room.teamSize ?? 1
  const teamId = pickTeamForJoin(players, teamSize)
  if (teamSize > 1 && teamId == null) {
    res.status(400).json({ error: 'Лобби заполнено' })
    return
  }

  const bot = makeBot(
    players.length,
    parsed.data.luck as BotLuck | undefined,
    teamId,
  )
  let updated = await prisma.battleRoom.update({
    where: { id },
    data: { players: [...players, bot] },
  })
  updated = await autoStartIfFull(updated)
  res.json({
    room: toPublicRoom(
      updated,
      updated.status === 'running' && updated.phase === 'spinning'
        ? SPIN_MS
        : null,
    ),
  })
})

battlesRouter.post('/:id/start', async (req, res) => {
  const id = String(req.params.id ?? '')
  const room = await prisma.battleRoom.findUnique({ where: { id } })
  if (!room || room.status !== 'lobby') {
    res.status(400).json({ error: 'Лобби недоступно' })
    return
  }
  if (room.hostUserId !== req.auth!.sub) {
    res.status(403).json({ error: 'Только хост может стартовать' })
    return
  }

  const result = await startBattleRoom(room, {
    fillBots: room.fillBots,
    requireReady: true,
  })
  if (!result.ok) {
    res.status(result.status).json({ error: result.error })
    return
  }

  const me = await prisma.user.findUnique({ where: { id: req.auth!.sub } })
  res.json({
    room: toPublicRoom(result.room, SPIN_MS),
    user: me ? toPublicUser(me) : undefined,
  })
})

battlesRouter.post('/:id/forfeit', async (req, res) => {
  const id = String(req.params.id ?? '')
  const loaded = await loadAndReconcile(id)
  if (!loaded) {
    res.status(404).json({ error: 'Баттл не найден' })
    return
  }
  let { room } = loaded
  if (room.status !== 'running') {
    res.status(400).json({ error: 'Баттл не идёт' })
    return
  }

  const userId = req.auth!.sub
  const players = parsePlayers(room.players)
  if (!players.some((p) => p.userId === userId && !p.forfeited)) {
    res.status(400).json({ error: 'Ты не участник этого баттла' })
    return
  }

  const result = applyForfeit(players, userId, room.teamSize ?? 1)
  if (result.finished) {
    room = await prisma.battleRoom.update({
      where: { id },
      data: {
        players: result.players,
        status: 'finished',
        phase: 'revealed',
        winnerId: result.winnerId,
        winnerTeamId: result.winnerTeamId,
        finishedAt: new Date(),
        phaseStartedAt: new Date(),
      },
    })
    const { room: settled, phaseEndsInMs } = await reconcileRoom(room)
    const me = await prisma.user.findUnique({ where: { id: userId } })
    res.json({
      room: toPublicRoom(settled, phaseEndsInMs),
      user: me ? toPublicUser(me) : undefined,
    })
    return
  }

  room = await prisma.battleRoom.update({
    where: { id },
    data: { players: result.players },
  })
  res.json({ room: toPublicRoom(room, loaded.phaseEndsInMs) })
})

battlesRouter.post('/:id/rematch', async (req, res) => {
  const id = String(req.params.id ?? '')
  const prev = await prisma.battleRoom.findUnique({ where: { id } })
  if (!prev || prev.status !== 'finished') {
    res.status(400).json({ error: 'Rematch только после матча' })
    return
  }

  const user = await prisma.user.findUnique({ where: { id: req.auth!.sub } })
  if (!user) {
    res.status(401).json({ error: 'Сессия недействительна' })
    return
  }

  const caseIds = parseCaseIds(prev.caseIds)
  const fee = entryFeeFor(caseIds)
  if (user.balance < fee) {
    res.status(400).json({ error: 'Недостаточно средств на вход' })
    return
  }

  const teamSize = prev.teamSize ?? 1
  const host = makeUserPlayer(
    user.id,
    user.username,
    teamSize > 1 ? 'A' : null,
  )
  host.ready = true

  // Re-add bots from previous composition; other humans must rejoin
  const prevPlayers = parsePlayers(prev.players)
  const bots = prevPlayers.filter((p) => p.kind === 'bot')
  const players: BattlePlayer[] = [host]
  for (const bot of bots) {
    if (players.length >= prev.maxPlayers) break
    const teamId = pickTeamForJoin(players, teamSize)
    players.push(makeBot(players.length, bot.luck, teamId))
  }

  const room = await prisma.battleRoom.create({
    data: {
      inviteCode: uniqueInviteCode(),
      hostUserId: user.id,
      privacy: prev.privacy,
      status: 'lobby',
      phase: 'idle',
      maxPlayers: prev.maxPlayers,
      teamSize,
      caseIds,
      mode: 'highest',
      fillBots: prev.fillBots,
      seed: createSeed(),
      players,
      drops: [],
      currentRound: 0,
      totalRounds: caseIds.length,
      suddenDeath: false,
      entryFee: fee,
    },
  })

  res.status(201).json({ room: toPublicRoom(room) })
})
