import { Link } from 'react-router-dom'
import { ItemTile } from '../../../shared/components/item/ItemTile'
import { RARITY_ORDER } from '../../cases/data/rarities'
import { usePlayerStore } from '../store/playerStore'
import type { Rarity } from '../../../shared/types'

export function InventoryPage() {
  const inventory = usePlayerStore((s) => s.inventory)
  const sellItem = usePlayerStore((s) => s.sellItem)

  const totalValue = inventory.reduce((sum, item) => sum + item.value, 0)

  const byRarity = RARITY_ORDER.reduce(
    (acc, rarity) => {
      acc[rarity] = inventory.filter((i) => i.rarity === rarity).length
      return acc
    },
    {} as Record<Rarity, number>,
  )

  return (
    <div className="page inventory-page">
      <header className="section-head section-head--row">
        <div>
          <h1>Инвентарь</h1>
          <p>
            {inventory.length === 0
              ? 'Пока пусто — открой кейс или выиграй баттл.'
              : `${inventory.length} предметов · ~${totalValue.toLocaleString('ru-RU')} Мора`}
          </p>
        </div>
        <Link to="/" className="btn btn--ghost">
          К кейсам
        </Link>
      </header>

      {inventory.length > 0 && (
        <div className="inventory-stats">
          {RARITY_ORDER.map((rarity) =>
            byRarity[rarity] > 0 ? (
              <span key={rarity} className={`inventory-stats__chip rarity-${rarity}`}>
                {rarity}: {byRarity[rarity]}
              </span>
            ) : null,
          )}
        </div>
      )}

      {inventory.length === 0 ? (
        <div className="empty-state">
          <p>Открой кейс или победи в Case Battle — предметы сохранятся на сервере.</p>
          <div className="empty-state__actions">
            <Link to="/" className="btn btn--primary">
              Выбрать кейс
            </Link>
            <Link to="/battles" className="btn btn--ghost">
              Case Battle
            </Link>
          </div>
        </div>
      ) : (
        <div className="inventory-grid">
          {inventory.map((item) => (
            <div key={item.uid} className="inventory-card">
              <ItemTile
                name={item.name}
                rarity={item.rarity}
                accent={item.accent}
                image={item.image}
                value={item.value}
              />
              <button
                type="button"
                className="btn btn--ghost btn--block"
                onClick={() => sellItem(item.uid)}
              >
                Продать за {item.value} Мора
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
