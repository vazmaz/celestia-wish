import { formatChance, sumChances } from '../../../shared/lib/random'
import type { CaseItem } from '../../../shared/types'
import { ItemTile } from '../../../shared/components/item/ItemTile'
import { RARITY_ORDER } from '../data/rarities'

interface Props {
  items: CaseItem[]
}

export function CaseContents({ items }: Props) {
  const total = sumChances(items)
  const sorted = [...items].sort(
    (a, b) =>
      RARITY_ORDER.indexOf(b.rarity) - RARITY_ORDER.indexOf(a.rarity) ||
      b.chance - a.chance,
  )

  return (
    <section className="case-contents">
      <header className="section-head">
        <h2>Содержимое баннера</h2>
        <p>Шансы как в Wish: заданы явно и используются при каждом открытии.</p>
      </header>
      <div className="case-contents__grid">
        {sorted.map((item) => (
          <ItemTile
            key={item.id}
            name={item.name}
            rarity={item.rarity}
            accent={item.accent}
            image={item.image}
            chanceLabel={formatChance(item.chance, total)}
            value={item.value}
          />
        ))}
      </div>
    </section>
  )
}
