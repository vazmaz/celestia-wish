import type { Rarity } from '../../../shared/types'

export const RARITY_ORDER: Rarity[] = [
  'common',
  'uncommon',
  'rare',
  'epic',
  'legendary',
]

/** Colors inspired by Genshin star rarity palette (fan theme). */
export const RARITY_META: Record<
  Rarity,
  { label: string; color: string; glow: string; stars: string }
> = {
  common: {
    label: '3★',
    color: '#8fa4c0',
    glow: 'rgba(143, 164, 192, 0.35)',
    stars: '★★★',
  },
  uncommon: {
    label: '3★+',
    color: '#5dce8a',
    glow: 'rgba(93, 206, 138, 0.4)',
    stars: '★★★',
  },
  rare: {
    label: '4★',
    color: '#6eb6ff',
    glow: 'rgba(110, 182, 255, 0.45)',
    stars: '★★★★',
  },
  epic: {
    label: '4★+',
    color: '#c89bff',
    glow: 'rgba(200, 155, 255, 0.5)',
    stars: '★★★★',
  },
  legendary: {
    label: '5★',
    color: '#f0d078',
    glow: 'rgba(240, 208, 120, 0.55)',
    stars: '★★★★★',
  },
}
