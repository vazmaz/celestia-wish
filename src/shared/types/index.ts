export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'

export type BannerCategoryId =
  | 'elements'
  | 'swords'
  | 'characters'
  | 'shields'
  | 'equipment'
  | 'pets'

/** @deprecated Use BannerCategoryId */
export type ElementId = BannerCategoryId

export interface CaseItem {
  id: string
  name: string
  rarity: Rarity
  /** Drop weight (explicit, not uniform). */
  chance: number
  /** Item price — used for battle Highest scoring. */
  value: number
  accent: string
  /** Icon / art path under /public */
  image: string
}

export interface CaseDef {
  id: string
  name: string
  description: string
  price: number
  theme: string
  category: BannerCategoryId
  /** Banner cover art */
  image: string
  items: CaseItem[]
}

export interface InventoryItem {
  uid: string
  itemId: string
  caseId: string
  name: string
  rarity: Rarity
  value: number
  accent: string
  image: string
  obtainedAt: number
  source?: 'solo' | 'battle' | 'upgrade'
  battleId?: string
}
