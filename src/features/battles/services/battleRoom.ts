import { getCaseById } from '../../cases/data/cases'
import type { BattlePlayer, BattleRoomState } from '../types'

export function entryFeeFor(
  caseIds: string[],
  casePrice: (id: string) => number = (id) => getCaseById(id)?.price ?? 0,
): number {
  return caseIds.reduce((sum, id) => sum + casePrice(id), 0)
}

export function canStart(room: BattleRoomState): boolean {
  if (room.status !== 'lobby') return false
  if (room.players.length < 2) return false
  if (room.players.length > room.maxPlayers) return false
  return room.players.every((p) => p.ready)
}

export function dropsForRound(room: BattleRoomState, roundIndex: number) {
  return room.drops.filter((d) => d.roundIndex === roundIndex)
}

export function isParticipant(
  room: BattleRoomState,
  userId: string | undefined | null,
): boolean {
  if (!userId) return false
  return room.players.some((p) => p.userId === userId)
}

export function youPlayer(
  room: BattleRoomState,
  userId: string | undefined | null,
): BattlePlayer | undefined {
  if (!userId) return undefined
  return room.players.find((p) => p.userId === userId)
}
