import { ApiError, apiFetch } from '../../../shared/api/client'
import type { UserAccount } from '../../auth/types'
import type {
  BattleRoomState,
  BotLuck,
  BattlePrivacy,
  BattleFormat,
} from '../types'

export type BattleFeed = {
  lobbies: BattleRoomState[]
  live: BattleRoomState[]
}

function reason(err: unknown, fallback: string): string {
  if (err instanceof ApiError) return err.message
  if (err instanceof Error) return err.message
  return fallback
}

export async function fetchBattleFeed(token: string): Promise<BattleFeed> {
  return apiFetch<BattleFeed>('/api/battles/feed', { token })
}

export async function fetchBattle(
  token: string,
  id: string,
): Promise<BattleRoomState> {
  const data = await apiFetch<{ room: BattleRoomState }>(`/api/battles/${id}`, {
    token,
  })
  return data.room
}

export async function fetchBattleByInvite(
  token: string,
  code: string,
): Promise<BattleRoomState> {
  const data = await apiFetch<{ room: BattleRoomState }>(
    `/api/battles/invite/${encodeURIComponent(code)}`,
    { token },
  )
  return data.room
}

export async function createBattleApi(
  token: string,
  input: {
    format: BattleFormat
    caseIds: string[]
    privacy: BattlePrivacy
    fillBots: boolean
  },
): Promise<BattleRoomState> {
  const data = await apiFetch<{ room: BattleRoomState }>('/api/battles', {
    method: 'POST',
    token,
    body: JSON.stringify(input),
  })
  return data.room
}

export async function joinBattleApi(
  token: string,
  id: string,
): Promise<{ room: BattleRoomState; role: string }> {
  return apiFetch(`/api/battles/${id}/join`, {
    method: 'POST',
    token,
    body: JSON.stringify({}),
  })
}

export async function leaveBattleApi(
  token: string,
  id: string,
): Promise<{ room?: BattleRoomState; cancelled?: boolean }> {
  return apiFetch(`/api/battles/${id}/leave`, {
    method: 'POST',
    token,
    body: JSON.stringify({}),
  })
}

export async function readyBattleApi(
  token: string,
  id: string,
  ready?: boolean,
): Promise<BattleRoomState> {
  const data = await apiFetch<{ room: BattleRoomState }>(
    `/api/battles/${id}/ready`,
    {
      method: 'POST',
      token,
      body: JSON.stringify(ready == null ? {} : { ready }),
    },
  )
  return data.room
}

export async function addBotApi(
  token: string,
  id: string,
  luck?: BotLuck,
): Promise<BattleRoomState> {
  const data = await apiFetch<{ room: BattleRoomState }>(
    `/api/battles/${id}/bots`,
    {
      method: 'POST',
      token,
      body: JSON.stringify(luck ? { luck } : {}),
    },
  )
  return data.room
}

export async function startBattleApi(
  token: string,
  id: string,
): Promise<{ room: BattleRoomState; user?: UserAccount }> {
  return apiFetch(`/api/battles/${id}/start`, {
    method: 'POST',
    token,
    body: JSON.stringify({}),
  })
}

export async function forfeitBattleApi(
  token: string,
  id: string,
): Promise<{ room: BattleRoomState; user?: UserAccount }> {
  return apiFetch(`/api/battles/${id}/forfeit`, {
    method: 'POST',
    token,
    body: JSON.stringify({}),
  })
}

export async function rematchBattleApi(
  token: string,
  id: string,
): Promise<BattleRoomState> {
  const data = await apiFetch<{ room: BattleRoomState }>(
    `/api/battles/${id}/rematch`,
    {
      method: 'POST',
      token,
      body: JSON.stringify({}),
    },
  )
  return data.room
}

export { reason as battleApiReason }
