import type { CSSProperties } from 'react'
import { RARITY_META } from '../../../features/cases/data/rarities'
import type { Rarity } from '../../../shared/types'
import { CrystalAmount } from '../brand/CrystalAmount'
import { RarityBadge } from './RarityBadge'

interface Props {
  name: string
  rarity: Rarity
  accent: string
  image?: string
  chanceLabel?: string
  value?: number
  size?: 'sm' | 'md' | 'lg'
}

export function ItemTile({
  name,
  rarity,
  accent,
  image,
  chanceLabel,
  value,
  size = 'md',
}: Props) {
  const meta = RARITY_META[rarity]
  const showFx = rarity === 'rare' || rarity === 'epic' || rarity === 'legendary'

  return (
    <article
      className={`item-tile item-tile--${size} item-tile--${rarity}`}
      style={
        {
          '--item-accent': accent,
          '--item-glow': meta.glow,
          '--item-color': meta.color,
        } as CSSProperties
      }
    >
      <div className="item-tile__visual" aria-hidden>
        {showFx && <div className="item-tile__aura" />}
        {image ? (
          <img
            className={`item-tile__image item-art--${rarity}`}
            src={image}
            alt=""
            loading="lazy"
          />
        ) : (
          <span className="item-tile__glyph">{name.slice(0, 1)}</span>
        )}
        {(rarity === 'epic' || rarity === 'legendary') && (
          <div className="item-tile__sparkles" />
        )}
        <div className="item-tile__shine" />
      </div>
      <div className="item-tile__meta">
        <RarityBadge rarity={rarity} compact />
        <h3 className="item-tile__name">{name}</h3>
        <div className="item-tile__footer">
          {chanceLabel != null && <span>{chanceLabel}</span>}
          {value != null && (
            <CrystalAmount className="item-tile__value" value={value} />
          )}
        </div>
      </div>
    </article>
  )
}
