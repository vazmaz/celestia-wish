import type { InventoryItem } from '../../shared/types'

export type UserRole = 'user' | 'admin'

/** Public account shape returned by the API (no password fields). */
export interface UserAccount {
  id: string
  username: string
  role: UserRole
  balance: number
  inventory: InventoryItem[]
  createdAt: number
  chatMutedUntil?: number | null
  chatMuteReason?: string | null
}

export const STARTING_BALANCE = 10_000
export const ADMIN_USERNAME = 'admin'
