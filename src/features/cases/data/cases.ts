import type { CaseDef, CaseItem, ElementId } from '../../../shared/types'

export const ELEMENT_ART: Record<
  ElementId,
  { cover: string; icon: string }
> = {
  anemo: {
    cover: '/cases/case-anemo.png',
    icon: '/items/item-anemo.png',
  },
  pyro: {
    cover: '/cases/case-pyro.png',
    icon: '/items/item-pyro.png',
  },
  hydro: {
    cover: '/cases/case-hydro.png',
    icon: '/items/item-hydro.png',
  },
  electro: {
    cover: '/cases/case-electro.png',
    icon: '/items/item-electro.png',
  },
  cryo: {
    cover: '/cases/case-cryo.png',
    icon: '/items/item-cryo.png',
  },
  dendro: {
    cover: '/cases/case-dendro.png',
    icon: '/items/item-dendro.png',
  },
}

type ItemInput = Omit<CaseItem, 'image'> & { image?: string }

function banner(
  def: Omit<CaseDef, 'image' | 'items' | 'element'> & {
    element: ElementId
    items: ItemInput[]
  },
): CaseDef {
  const art = ELEMENT_ART[def.element]
  return {
    ...def,
    image: art.cover,
    items: def.items.map((item) => ({
      ...item,
      image: item.image ?? art.icon,
    })),
  }
}

/**
 * Fan-theme catalog inspired by Genshin Impact elements (unofficial).
 * Covers: public/cases · icons: public/items
 *
 * Chances sum to 100 and are tuned so a full sell-back returns 50% of the
 * case price. Item values are unchanged; only drop weights move.
 */
export const CASES: CaseDef[] = [
  banner({
    id: 'anemo-breeze',
    name: 'Anemo Breeze',
    description: 'Шёпот ветров Мондштадта: перья, амулеты и эхо свободы.',
    price: 160,
    element: 'anemo',
    theme: 'linear-gradient(145deg, #0d2a28 0%, #1a5c52 45%, #3ecfbf 100%)',
    items: [
      { id: 'an-1', name: 'Dandelion Seed', rarity: 'common', chance: 34.33, value: 20, accent: '#7a9e96' },
      { id: 'an-2', name: 'Windcatcher Ribbon', rarity: 'common', chance: 24.94, value: 26, accent: '#8bb0a8' },
      { id: 'an-3', name: 'Breeze Charm', rarity: 'common', chance: 18.7, value: 32, accent: '#9cc4bb' },
      { id: 'an-4', name: 'Skyfeather Bow', rarity: 'uncommon', chance: 5.73, value: 70, accent: '#3ecf9a' },
      { id: 'an-5', name: 'Wanderer Cape', rarity: 'uncommon', chance: 4.41, value: 88, accent: '#45d9a8' },
      { id: 'an-6', name: 'Gale Catalyst', rarity: 'rare', chance: 4.41, value: 180, accent: '#4db8ff' },
      { id: 'an-7', name: 'Vortex Claymore', rarity: 'rare', chance: 3.07, value: 240, accent: '#5ac4ff' },
      { id: 'an-8', name: 'Freedom Codex', rarity: 'epic', chance: 2.42, value: 520, accent: '#b48cff' },
      { id: 'an-9', name: 'Skyward Zephyr', rarity: 'epic', chance: 1.33, value: 680, accent: '#c9a0ff' },
      { id: 'an-10', name: 'Winds of Celestia', rarity: 'legendary', chance: 0.66, value: 2400, accent: '#f0d078' },
    ],
  }),
  banner({
    id: 'pyro-embers',
    name: 'Pyro Embers',
    description: 'Пламя Натлана и Ли Юэ: угли, клинки и огненные печати.',
    price: 200,
    element: 'pyro',
    theme: 'linear-gradient(145deg, #2a1008 0%, #8b2e14 48%, #e85d2a 100%)',
    items: [
      { id: 'py-1', name: 'Ashflake', rarity: 'common', chance: 33.95, value: 24, accent: '#a87868' },
      { id: 'py-2', name: 'Ember Seal', rarity: 'common', chance: 25.89, value: 30, accent: '#b88874' },
      { id: 'py-3', name: 'Cinder Ring', rarity: 'common', chance: 17.8, value: 38, accent: '#c49884' },
      { id: 'py-4', name: 'Blaze Dagger', rarity: 'uncommon', chance: 5.58, value: 85, accent: '#3ecf9a' },
      { id: 'py-5', name: 'Crimson Scarf', rarity: 'uncommon', chance: 4.75, value: 100, accent: '#45d9a8' },
      { id: 'py-6', name: 'Inferno Polearm', rarity: 'rare', chance: 4.3, value: 220, accent: '#4db8ff' },
      { id: 'py-7', name: 'Solar Mask', rarity: 'rare', chance: 3.01, value: 280, accent: '#5ac4ff' },
      { id: 'py-8', name: 'Phoenix Gauntlet', rarity: 'epic', chance: 2.36, value: 600, accent: '#b48cff' },
      { id: 'py-9', name: 'Lavawalker Relic', rarity: 'epic', chance: 1.5, value: 780, accent: '#c9a0ff' },
      { id: 'py-10', name: 'Heart of the Pyro Archon', rarity: 'legendary', chance: 0.86, value: 2800, accent: '#f0d078' },
    ],
  }),
  banner({
    id: 'hydro-tide',
    name: 'Hydro Tide',
    description: 'Глубины Фонтейна: жемчуг, клинки воды и песни прилива.',
    price: 190,
    element: 'hydro',
    theme: 'linear-gradient(145deg, #071828 0%, #0e4a7a 50%, #3db4ff 100%)',
    items: [
      { id: 'hy-1', name: 'Tide Pearl', rarity: 'common', chance: 35.3, value: 22, accent: '#6a8aa0' },
      { id: 'hy-2', name: 'Seafoam Token', rarity: 'common', chance: 24.06, value: 28, accent: '#7a9ab0' },
      { id: 'hy-3', name: 'Ripple Charm', rarity: 'common', chance: 17.65, value: 34, accent: '#8aaac0' },
      { id: 'hy-4', name: 'Fountain Blade', rarity: 'uncommon', chance: 5.75, value: 78, accent: '#3ecf9a' },
      { id: 'hy-5', name: 'Mariner Gloves', rarity: 'uncommon', chance: 4.42, value: 95, accent: '#45d9a8' },
      { id: 'hy-6', name: 'Abyss Catalyst', rarity: 'rare', chance: 4.42, value: 200, accent: '#4db8ff' },
      { id: 'hy-7', name: 'Wavebreaker Bow', rarity: 'rare', chance: 3.5, value: 260, accent: '#5ac4ff' },
      { id: 'hy-8', name: 'Court of Springs', rarity: 'epic', chance: 2.47, value: 560, accent: '#b48cff' },
      { id: 'hy-9', name: 'Oceanid Tear', rarity: 'epic', chance: 1.55, value: 720, accent: '#c9a0ff' },
      { id: 'hy-10', name: 'Hydro Sovereign Orb', rarity: 'legendary', chance: 0.88, value: 2600, accent: '#f0d078' },
    ],
  }),
  banner({
    id: 'electro-pulse',
    name: 'Electro Pulse',
    description: 'Гроза Инадзумы: амулеты, клинки молний и вечность.',
    price: 220,
    element: 'electro',
    theme: 'linear-gradient(145deg, #1a0a2e 0%, #4a1a8a 48%, #a855f7 100%)',
    items: [
      { id: 'el-1', name: 'Static Shard', rarity: 'common', chance: 36.52, value: 28, accent: '#8a7aa0' },
      { id: 'el-2', name: 'Thunder Tag', rarity: 'common', chance: 27.18, value: 35, accent: '#9a8ab0' },
      { id: 'el-3', name: 'Amethyst Bead', rarity: 'common', chance: 19.94, value: 42, accent: '#aa9ac0' },
      { id: 'el-4', name: 'Raiden Ribbon', rarity: 'uncommon', chance: 3.7, value: 100, accent: '#3ecf9a' },
      { id: 'el-5', name: 'Storm Ward', rarity: 'uncommon', chance: 3.09, value: 125, accent: '#45d9a8' },
      { id: 'el-6', name: 'Lightning Katana', rarity: 'rare', chance: 3, value: 260, accent: '#4db8ff' },
      { id: 'el-7', name: 'Vision Case: Electro', rarity: 'rare', chance: 2.47, value: 320, accent: '#5ac4ff' },
      { id: 'el-8', name: 'Eternity Scroll', rarity: 'epic', chance: 1.85, value: 700, accent: '#b48cff' },
      { id: 'el-9', name: 'Baal Echo', rarity: 'epic', chance: 1.32, value: 900, accent: '#c9a0ff' },
      { id: 'el-10', name: 'Musou no Hitotachi', rarity: 'legendary', chance: 0.62, value: 3200, accent: '#f0d078' },
      { id: 'el-11', name: 'Engulfing Stars', rarity: 'legendary', chance: 0.31, value: 4500, accent: '#ffe08a' },
    ],
  }),
  banner({
    id: 'cryo-veil',
    name: 'Cryo Veil',
    description: 'Снега Снежной: кристаллы, копья льда и лунный свет.',
    price: 180,
    element: 'cryo',
    theme: 'linear-gradient(145deg, #0a1524 0%, #1a3a5c 50%, #7ec8ff 100%)',
    items: [
      { id: 'cr-1', name: 'Frostflake', rarity: 'common', chance: 36.95, value: 20, accent: '#7a90a0' },
      { id: 'cr-2', name: 'Snowblind Pin', rarity: 'common', chance: 24.11, value: 26, accent: '#8aa0b0' },
      { id: 'cr-3', name: 'Ice Lace', rarity: 'common', chance: 16.06, value: 34, accent: '#9ab0c0' },
      { id: 'cr-4', name: 'Glacier Spear', rarity: 'uncommon', chance: 5.72, value: 75, accent: '#3ecf9a' },
      { id: 'cr-5', name: 'Winter Cloak', rarity: 'uncommon', chance: 4.83, value: 92, accent: '#45d9a8' },
      { id: 'cr-6', name: 'Moonlit Bow', rarity: 'rare', chance: 4.41, value: 195, accent: '#4db8ff' },
      { id: 'cr-7', name: 'Cryo Vision Case', rarity: 'rare', chance: 3.08, value: 250, accent: '#5ac4ff' },
      { id: 'cr-8', name: 'Blizzard Strayer', rarity: 'epic', chance: 2.42, value: 540, accent: '#b48cff' },
      { id: 'cr-9', name: 'Ice Queen Diadem', rarity: 'epic', chance: 1.54, value: 700, accent: '#c9a0ff' },
      { id: 'cr-10', name: 'Heart of the Cryo Archon', rarity: 'legendary', chance: 0.88, value: 2500, accent: '#f0d078' },
    ],
  }),
  banner({
    id: 'dendro-grove',
    name: 'Dendro Grove',
    description: 'Сады Сумеру: листья, посохи мудрости и древние корни.',
    price: 210,
    element: 'dendro',
    theme: 'linear-gradient(145deg, #0c1f14 0%, #1a5c32 48%, #5dce6a 100%)',
    items: [
      { id: 'de-1', name: 'Sprout Chip', rarity: 'common', chance: 36.54, value: 26, accent: '#6a906e' },
      { id: 'de-2', name: 'Leaf Token', rarity: 'common', chance: 27.2, value: 32, accent: '#7aa07e' },
      { id: 'de-3', name: 'Vine Bracelet', rarity: 'common', chance: 19.94, value: 40, accent: '#8ab08e' },
      { id: 'de-4', name: 'Jungle Cleaver', rarity: 'uncommon', chance: 3.68, value: 95, accent: '#3ecf9a' },
      { id: 'de-5', name: 'Scholar Satchel', rarity: 'uncommon', chance: 3.09, value: 115, accent: '#45d9a8' },
      { id: 'de-6', name: 'Wisdom Staff', rarity: 'rare', chance: 3.08, value: 240, accent: '#4db8ff' },
      { id: 'de-7', name: 'Dendro Vision Case', rarity: 'rare', chance: 2.46, value: 300, accent: '#5ac4ff' },
      { id: 'de-8', name: 'Deepwood Memories', rarity: 'epic', chance: 1.85, value: 680, accent: '#b48cff' },
      { id: 'de-9', name: 'Gilded Dreams', rarity: 'epic', chance: 1.23, value: 860, accent: '#c9a0ff' },
      { id: 'de-10', name: 'Heart of the Dendro Archon', rarity: 'legendary', chance: 0.6, value: 3000, accent: '#f0d078' },
      { id: 'de-11', name: 'A Thousand Verdant Suns', rarity: 'legendary', chance: 0.33, value: 4800, accent: '#ffe08a' },
    ],
  }),
]

export function getCaseById(id: string): CaseDef | undefined {
  return CASES.find((c) => c.id === id)
}
