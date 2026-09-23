import { RARITY_META } from '../../../features/cases/data/rarities'
import type { Rarity } from '../../../shared/types'

interface Props {
  rarity: Rarity
  compact?: boolean
}

export function RarityBadge({ rarity, compact }: Props) {
  const meta = RARITY_META[rarity]
  return (
    <span
      className={`rarity-badge${compact ? ' rarity-badge--compact' : ''}`}
      style={{
        color: meta.color,
        borderColor: meta.color,
        boxShadow: `0 0 12px ${meta.glow}`,
      }}
    >
      {meta.label}
    </span>
  )
}
