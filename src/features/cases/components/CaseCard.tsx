import { Link } from 'react-router-dom'
import type { CSSProperties } from 'react'
import { RARITY_ORDER } from '../data/rarities'
import type { CaseDef } from '../../../shared/types'
import { RarityBadge } from '../../../shared/components/item/RarityBadge'
import { CrystalAmount } from '../../../shared/components/brand/CrystalAmount'

interface Props {
  caseDef: CaseDef
}

export function CaseCard({ caseDef }: Props) {
  const preview = [...caseDef.items]
    .sort(
      (a, b) =>
        RARITY_ORDER.indexOf(b.rarity) - RARITY_ORDER.indexOf(a.rarity),
    )
    .slice(0, 4)

  return (
    <Link
      to={`/case/${caseDef.id}`}
      className="case-card"
      style={{ '--case-theme': caseDef.theme } as CSSProperties}
    >
      <div className="case-card__art" aria-hidden>
        <img
          className="case-card__image"
          src={caseDef.image}
          alt=""
          loading="lazy"
        />
        <div className="case-card__frame" />
        <div className="case-card__art-fade" />
        <span className="case-card__wish-tag">Wish</span>
      </div>

      <div className="case-card__body">
        <div className="case-card__top">
          <h2 className="case-card__title">{caseDef.name}</h2>
          <CrystalAmount
            className="case-card__price"
            value={caseDef.price}
          />
        </div>
        <p className="case-card__desc">{caseDef.description}</p>
        <div className="case-card__preview">
          {preview.map((item) => (
            <div
              key={item.id}
              className={`case-card__chip case-card__chip--${item.rarity}`}
              style={{ borderColor: item.accent }}
              title={item.name}
            >
              <img src={item.image} alt="" />
            </div>
          ))}
          <RarityBadge rarity={preview[0]?.rarity ?? 'common'} compact />
        </div>
      </div>
    </Link>
  )
}
