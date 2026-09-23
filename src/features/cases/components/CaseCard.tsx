import { Link } from 'react-router-dom'
import { RARITY_ORDER } from '../data/rarities'
import type { CaseDef } from '../../../shared/types'
import { RarityBadge } from '../../../shared/components/item/RarityBadge'

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
    <Link to={`/case/${caseDef.id}`} className="case-card">
      <div className="case-card__art" aria-hidden>
        <img
          className="case-card__image"
          src={caseDef.image}
          alt=""
          loading="lazy"
        />
        <div className="case-card__art-fade" />
      </div>

      <div className="case-card__body">
        <div className="case-card__top">
          <h2 className="case-card__title">{caseDef.name}</h2>
          <span className="case-card__price">{caseDef.price} Мора</span>
        </div>
        <p className="case-card__desc">{caseDef.description}</p>
        <div className="case-card__preview">
          {preview.map((item) => (
            <div
              key={item.id}
              className="case-card__chip"
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
