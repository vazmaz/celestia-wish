import { useMemo, useState, type CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { ItemTile } from '../../../shared/components/item/ItemTile'
import { CrystalAmount } from '../../../shared/components/brand/CrystalAmount'
import { RARITY_META, RARITY_ORDER } from '../../cases/data/rarities'
import { usePlayerStore } from '../store/playerStore'
import type { Rarity } from '../../../shared/types'

export function InventoryPage() {
  const inventory = usePlayerStore((s) => s.inventory)
  const sellItem = usePlayerStore((s) => s.sellItem)
  const [filter, setFilter] = useState<Rarity | 'all'>('all')

  const totalValue = inventory.reduce((sum, item) => sum + item.value, 0)

  const byRarity = useMemo(
    () =>
      RARITY_ORDER.reduce(
        (acc, rarity) => {
          acc[rarity] = inventory.filter((i) => i.rarity === rarity).length
          return acc
        },
        {} as Record<Rarity, number>,
      ),
    [inventory],
  )

  const visible = useMemo(
    () =>
      filter === 'all'
        ? inventory
        : inventory.filter((item) => item.rarity === filter),
    [inventory, filter],
  )

  const visibleValue = useMemo(
    () => visible.reduce((sum, item) => sum + item.value, 0),
    [visible],
  )

  return (
    <div className="page inventory-page">
      <header className="section-head section-head--row">
        <div>
          <h1>Инвентарь</h1>
          <p>
            {inventory.length === 0
              ? 'Пока пусто — открой кейс или выиграй баттл.'
              : filter === 'all'
                ? `${inventory.length} предметов · `
                : `${visible.length} из ${inventory.length} · `}
            {inventory.length > 0 && (
              <CrystalAmount value={filter === 'all' ? totalValue : visibleValue} />
            )}
          </p>
        </div>
        <Link to="/" className="btn btn--ghost">
          К кейсам
        </Link>
      </header>

      {inventory.length > 0 && (
        <div className="inventory-filters" role="toolbar" aria-label="Фильтр по редкости">
          <button
            type="button"
            className={`inventory-filters__chip${filter === 'all' ? ' is-active' : ''}`}
            aria-pressed={filter === 'all'}
            onClick={() => setFilter('all')}
          >
            Все
            <strong>{inventory.length}</strong>
          </button>
          {RARITY_ORDER.map((rarity) => {
            const meta = RARITY_META[rarity]
            const count = byRarity[rarity]
            const active = filter === rarity
            return (
              <button
                key={rarity}
                type="button"
                className={`inventory-filters__chip rarity-${rarity}${active ? ' is-active' : ''}${count === 0 ? ' is-empty' : ''}`}
                style={
                  {
                    '--chip-color': meta.color,
                    '--chip-glow': meta.glow,
                  } as CSSProperties
                }
                title={`Редкость ${meta.label}`}
                aria-label={`${meta.label}, ${count}`}
                aria-pressed={active}
                disabled={count === 0}
                onClick={() => setFilter(active ? 'all' : rarity)}
              >
                <span className="inventory-filters__label">{meta.label}</span>
                <strong>{count}</strong>
              </button>
            )
          })}
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
      ) : visible.length === 0 ? (
        <div className="empty-state">
          <p>Нет предметов этой редкости.</p>
          <button
            type="button"
            className="btn btn--ghost"
            onClick={() => setFilter('all')}
          >
            Показать все
          </button>
        </div>
      ) : (
        <div className="inventory-grid">
          {visible.map((item) => (
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
                Продать · <CrystalAmount value={item.value} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
