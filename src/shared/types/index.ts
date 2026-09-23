export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'

export type ElementId = 'anemo' | 'pyro' | 'hydro' | 'electro' | 'cryo' | 'dendro'

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
  element: ElementId
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
