import { create } from 'zustand'
import { getCaseById } from '../../cases/data/cases'
import { createUid, pickWeighted } from '../../../shared/lib/random'
import type { CaseItem, InventoryItem } from '../../../shared/types'
import type { DropSnapshot } from '../../battles/types'
import {
  rollUpgradeResult,
  toInventoryItem,
  validateUpgrade,
} from '../../upgrade/services/upgradeService'
import {
  readSessionEconomy,
  useAuthStore,
  writeSessionEconomy,
} from '../../auth/store/authStore'

interface PlayerState {
  lastDrop: InventoryItem | null
  /** Reactive mirrors — synced from auth session user. */
  balance: number
  inventory: InventoryItem[]
  syncFromAuth: () => void
  openCase: (caseId: string) =>
    | { ok: true; item: InventoryItem; dropped: CaseItem }
    | { ok: false; reason: 'not_found' | 'insufficient' | 'unauthenticated' }
  clearLastDrop: () => void
  sellItem: (uid: string) => void
  chargeEntry: (amount: number) => boolean
  grantBattlePool: (drops: DropSnapshot[], battleId: string) => void
  performUpgrade: (
    uids: string[],
  ) =>
    | { ok: true; item: InventoryItem; fee: number }
    | {
        ok: false
        reason:
          | 'count'
          | 'mixed'
          | 'legendary'
          | 'empty_pool'
          | 'insufficient_funds'
          | 'missing_items'
          | 'unauthenticated'
      }
}

function pushEconomy(balance: number, inventory: InventoryItem[]) {
  writeSessionEconomy({ balance, inventory })
  usePlayerStore.setState({ balance, inventory })
}

export const usePlayerStore = create<PlayerState>((set) => ({
  lastDrop: null,
  balance: 0,
  inventory: [],

  syncFromAuth: () => {
    const economy = readSessionEconomy()
    if (!economy) {
      set({ balance: 0, inventory: [], lastDrop: null })
      return
    }
    set({
      balance: economy.balance,
      inventory: economy.inventory,
    })
  },

  openCase: (caseId) => {
    const economy = readSessionEconomy()
    if (!economy) return { ok: false, reason: 'unauthenticated' }

    const caseDef = getCaseById(caseId)
    if (!caseDef) return { ok: false, reason: 'not_found' }
    if (economy.balance < caseDef.price) return { ok: false, reason: 'insufficient' }

    const dropped = pickWeighted(caseDef.items)
    const inventoryItem: InventoryItem = {
      uid: createUid(),
      itemId: dropped.id,
      caseId: caseDef.id,
      name: dropped.name,
      rarity: dropped.rarity,
      value: dropped.value,
      accent: dropped.accent,
      image: dropped.image,
      obtainedAt: Date.now(),
      source: 'solo',
    }

    const balance = economy.balance - caseDef.price
    const inventory = [inventoryItem, ...economy.inventory]
    pushEconomy(balance, inventory)
    set({ lastDrop: inventoryItem })

    return { ok: true, item: inventoryItem, dropped }
  },

  clearLastDrop: () => set({ lastDrop: null }),

  sellItem: (uid) => {
    const economy = readSessionEconomy()
    if (!economy) return
    const item = economy.inventory.find((i) => i.uid === uid)
    if (!item) return
    pushEconomy(
      economy.balance + item.value,
      economy.inventory.filter((i) => i.uid !== uid),
    )
  },

  chargeEntry: (amount) => {
    const economy = readSessionEconomy()
    if (!economy || economy.balance < amount) return false
    pushEconomy(economy.balance - amount, economy.inventory)
    return true
  },

  grantBattlePool: (drops, battleId) => {
    const economy = readSessionEconomy()
    if (!economy) return
    const now = Date.now()
    const items: InventoryItem[] = drops.map((d, i) => ({
      uid: createUid(),
      itemId: d.itemId,
      caseId: d.caseId,
      name: d.name,
      rarity: d.rarity,
      value: d.value,
      accent: d.accent,
      image: d.image,
      obtainedAt: now + i,
      source: 'battle',
      battleId,
    }))
    pushEconomy(economy.balance, [...items, ...economy.inventory])
  },

  performUpgrade: (uids) => {
    const economy = readSessionEconomy()
    if (!economy) return { ok: false, reason: 'unauthenticated' }

    const selected = uids
      .map((uid) => economy.inventory.find((item) => item.uid === uid))
      .filter((item): item is InventoryItem => Boolean(item))

    if (selected.length !== uids.length) {
      return { ok: false, reason: 'missing_items' }
    }

    const check = validateUpgrade(selected, economy.balance)
    if (!check.ok) return check

    const rolled = rollUpgradeResult(check.pool)
    const reward = toInventoryItem(rolled)
    const uidSet = new Set(uids)

    pushEconomy(
      economy.balance - check.fee,
      [reward, ...economy.inventory.filter((item) => !uidSet.has(item.uid))],
    )
    set({ lastDrop: reward })

    return { ok: true, item: reward, fee: check.fee }
  },
}))

/** Keep player mirror in sync when auth session / users change. */
useAuthStore.subscribe((state, prev) => {
  if (state.user !== prev.user) {
    usePlayerStore.getState().syncFromAuth()
  }
})

// Initial sync (in case auth already rehydrated)
if (typeof window !== 'undefined') {
  queueMicrotask(() => usePlayerStore.getState().syncFromAuth())
}
