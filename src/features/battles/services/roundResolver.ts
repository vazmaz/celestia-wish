import type { BattlePlayer, RoundDrop } from '../types'

export function sumPlayerTotals(
  drops: RoundDrop[],
  players: BattlePlayer[],
): Record<string, number> {
  const totals: Record<string, number> = {}
  for (const p of players) totals[p.id] = 0
  for (const drop of drops) {
    if (players.find((p) => p.id === drop.playerId)?.forfeited) continue
    totals[drop.playerId] = (totals[drop.playerId] ?? 0) + drop.item.value
  }
  for (const p of players) {
    if (p.forfeited) totals[p.id] = 0
  }
  return totals
}

export function sumTeamTotals(
  drops: RoundDrop[],
  players: BattlePlayer[],
): { A: number; B: number } {
  const playerTotals = sumPlayerTotals(drops, players)
  const teams = { A: 0, B: 0 }
  for (const p of players) {
    if (!p.teamId || p.forfeited) continue
    teams[p.teamId] += playerTotals[p.id] ?? 0
  }
  return teams
}
