import { useMemo, useState, type CSSProperties } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { RARITY_META, RARITY_ORDER } from '../../cases/data/rarities'
import { usePlayerStore } from '../../inventory/store/playerStore'
import type { InventoryItem, Rarity } from '../../../shared/types'
import { RarityBadge } from '../../../shared/components/item/RarityBadge'
import {
  UPGRADE_COST,
  canUpgradeRarity,
  nextRarity,
} from '../config'
import {
  calcUpgradeFee,
  getUpgradePool,
} from '../services/upgradeService'

type Phase = 'pick' | 'animating' | 'result'

const REASON_HINT: Record<string, string> = {
  count: `Нужно ровно ${UPGRADE_COST} предметов одной редкости.`,
  mixed: 'Нельзя смешивать разные редкости.',
  legendary: 'Legendary (5★) апгрейдить нельзя.',
  empty_pool: 'Нет предметов целевой редкости в каталоге.',
  insufficient_funds: 'Не хватает Моры на комиссию апгрейда.',
  missing_items: 'Часть предметов уже недоступна.',
}

export function UpgradePage() {
  const inventory = usePlayerStore((s) => s.inventory)
  const balance = usePlayerStore((s) => s.balance)
  const performUpgrade = usePlayerStore((s) => s.performUpgrade)

  const [sourceRarity, setSourceRarity] = useState<Rarity>('common')
  const [selectedUids, setSelectedUids] = useState<string[]>([])
  const [phase, setPhase] = useState<Phase>('pick')
  const [result, setResult] = useState<InventoryItem | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)

  const targetRarity = nextRarity(sourceRarity)

  const available = useMemo(
    () =>
      inventory.filter(
        (item) =>
          item.rarity === sourceRarity && !selectedUids.includes(item.uid),
      ),
    [inventory, sourceRarity, selectedUids],
  )

  const selectedItems = useMemo(
    () =>
      selectedUids
        .map((uid) => inventory.find((item) => item.uid === uid))
        .filter((item): item is InventoryItem => Boolean(item)),
    [selectedUids, inventory],
  )

  const ownedCount = inventory.filter((i) => i.rarity === sourceRarity).length
  const fee = calcUpgradeFee(selectedItems)
  const pool = targetRarity ? getUpgradePool(targetRarity) : []
  const canSubmit =
    selectedItems.length === UPGRADE_COST &&
    canUpgradeRarity(sourceRarity) &&
    balance >= fee &&
    pool.length > 0 &&
    phase === 'pick'

  const toggleSelect = (uid: string) => {
    setError(null)
    setSelectedUids((prev) => {
      if (prev.includes(uid)) return prev.filter((id) => id !== uid)
      if (prev.length >= UPGRADE_COST) return prev
      return [...prev, uid]
    })
  }

  const clearSlots = () => {
    setSelectedUids([])
    setError(null)
  }

  const fillAuto = () => {
    const take = inventory
      .filter((item) => item.rarity === sourceRarity)
      .slice(0, UPGRADE_COST)
      .map((item) => item.uid)
    setSelectedUids(take)
    setError(null)
  }

  const runUpgrade = () => {
    setConfirmOpen(false)
    setError(null)
    setPhase('animating')

    window.setTimeout(() => {
      const outcome = performUpgrade(selectedUids)
      if (!outcome.ok) {
        setPhase('pick')
        setError(REASON_HINT[outcome.reason] ?? 'Не удалось улучшить.')
        return
      }
      setResult(outcome.item)
      setSelectedUids([])
      setPhase('result')
    }, 1600)
  }

  return (
    <div className="page upgrade-page">
      <header className="section-head section-head--row">
        <div>
          <h1>Upgrade</h1>
          <p>
            {UPGRADE_COST} предметов одной редкости → 1 предмет следующей. Без шанса
            провала.
          </p>
        </div>
        <Link to="/inventory" className="btn btn--ghost">
          Инвентарь
        </Link>
      </header>

      <div className="upgrade-ladder" aria-label="Цепочка редкостей">
        {RARITY_ORDER.map((rarity, index) => (
          <span key={rarity} className="upgrade-ladder__step">
            <button
              type="button"
              className={`upgrade-rarity-btn${
                sourceRarity === rarity ? ' is-active' : ''
              }${!canUpgradeRarity(rarity) ? ' is-locked' : ''}`}
              style={{
                color: RARITY_META[rarity].color,
                borderColor: RARITY_META[rarity].color,
              }}
              disabled={!canUpgradeRarity(rarity)}
              onClick={() => {
                setSourceRarity(rarity)
                setSelectedUids([])
                setError(null)
                setPhase('pick')
                setResult(null)
              }}
            >
              {RARITY_META[rarity].label}
            </button>
            {index < RARITY_ORDER.length - 1 && (
              <span className="upgrade-ladder__arrow" aria-hidden>
                →
              </span>
            )}
          </span>
        ))}
      </div>

      <section
        className="upgrade-board"
        style={
          {
            '--from-color': RARITY_META[sourceRarity].color,
            '--to-color': targetRarity
              ? RARITY_META[targetRarity].color
              : RARITY_META.legendary.color,
          } as CSSProperties
        }
      >
        <div className="upgrade-board__sacrifice">
          <header className="upgrade-board__head">
            <div>
              <h2>Жертва</h2>
              <p>
                {selectedItems.length}/{UPGRADE_COST} · {RARITY_META[sourceRarity].label} ·
                в инвентаре {ownedCount}
              </p>
            </div>
            <div className="upgrade-board__tools">
              <button type="button" className="btn btn--tiny" onClick={fillAuto}>
                Автозаполнение
              </button>
              <button type="button" className="btn btn--tiny" onClick={clearSlots}>
                Очистить
              </button>
            </div>
          </header>

          <div className="upgrade-slots">
            {Array.from({ length: UPGRADE_COST }).map((_, index) => {
              const item = selectedItems[index]
              return (
                <button
                  key={item?.uid ?? `slot-${index}`}
                  type="button"
                  className={`upgrade-slot${item ? ' has-item' : ''}`}
                  onClick={() => item && toggleSelect(item.uid)}
                  title={item ? `Убрать ${item.name}` : 'Пустой слот'}
                >
                  {item ? (
                    <>
                      <img src={item.image} alt="" />
                      <span>{item.name}</span>
                    </>
                  ) : (
                    <span className="upgrade-slot__empty">{index + 1}</span>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        <div className="upgrade-board__arrow" aria-hidden>
          <motion.div
            className="upgrade-fuse"
            animate={
              phase === 'animating'
                ? { scale: [1, 1.15, 0.9, 1.2], opacity: [0.7, 1, 1, 1] }
                : { scale: 1, opacity: 0.85 }
            }
            transition={{ duration: 1.4 }}
          />
          <p>
            {targetRarity
              ? `${RARITY_META[sourceRarity].label} → ${RARITY_META[targetRarity].label}`
              : 'Max rarity'}
          </p>
        </div>

        <div className="upgrade-board__reward">
          <header className="upgrade-board__head">
            <div>
              <h2>Награда</h2>
              <p>
                {targetRarity
                  ? `1 случайный ${RARITY_META[targetRarity].label} из глобального пула`
                  : 'Апгрейд недоступен'}
              </p>
            </div>
          </header>

          <div className="upgrade-preview-grid">
            {pool.slice(0, 8).map((item) => (
              <div key={item.id} className="upgrade-preview-chip" title={item.name}>
                <img src={item.image} alt="" />
                <span>{item.name}</span>
              </div>
            ))}
            {pool.length > 8 && (
              <div className="upgrade-preview-chip upgrade-preview-chip--more">
                +{pool.length - 8}
              </div>
            )}
            {pool.length === 0 && (
              <p className="form-hint">Нет кандидатов этой редкости.</p>
            )}
          </div>

          <div className="upgrade-fee">
            <span>Комиссия</span>
            <strong>{fee} Мора</strong>
            <em>10% от средней цены жертвы</em>
          </div>
        </div>
      </section>

      {ownedCount < UPGRADE_COST && (
        <p className="form-hint">
          Нужно ещё {UPGRADE_COST - ownedCount} предмет(ов) редкости{' '}
          {RARITY_META[sourceRarity].label}. Открой баннеры или выиграй баттл.
        </p>
      )}

      {error && <p className="form-error">{error}</p>}

      <div className="upgrade-cta">
        <button
          type="button"
          className="btn btn--primary btn--xl"
          disabled={!canSubmit}
          onClick={() => setConfirmOpen(true)}
        >
          Upgrade · {fee} Мора
        </button>
      </div>

      <section className="upgrade-inventory">
        <h2>Инвентарь · {RARITY_META[sourceRarity].label}</h2>
        {available.length === 0 ? (
          <p className="form-hint">
            {ownedCount === 0
              ? 'Нет предметов этой редкости.'
              : 'Все подходящие предметы уже в слотах.'}
          </p>
        ) : (
          <div className="upgrade-inventory__grid">
            {available.map((item) => (
              <button
                key={item.uid}
                type="button"
                className="upgrade-inv-card"
                disabled={selectedUids.length >= UPGRADE_COST || phase !== 'pick'}
                onClick={() => toggleSelect(item.uid)}
              >
                <img src={item.image} alt="" />
                <div>
                  <RarityBadge rarity={item.rarity} compact />
                  <strong>{item.name}</strong>
                  <span>{item.value} Мора</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </section>

      <AnimatePresence>
        {confirmOpen && (
          <motion.div
            className="result-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <button
              type="button"
              className="result-modal__backdrop"
              aria-label="Закрыть"
              onClick={() => setConfirmOpen(false)}
            />
            <motion.div
              className="result-modal__panel upgrade-confirm"
              initial={{ scale: 0.9, y: 16 }}
              animate={{ scale: 1, y: 0 }}
            >
              <h2>Подтвердить Upgrade?</h2>
              <p>
                Списать {UPGRADE_COST}× {RARITY_META[sourceRarity].label} и {fee} Мора.
                Получишь 1× {targetRarity ? RARITY_META[targetRarity].label : '—'}.
              </p>
              <div className="result-modal__actions">
                <button
                  type="button"
                  className="btn btn--ghost"
                  onClick={() => setConfirmOpen(false)}
                >
                  Отмена
                </button>
                <button type="button" className="btn btn--primary" onClick={runUpgrade}>
                  Upgrade
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {phase === 'animating' && (
          <motion.div
            className="upgrade-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="upgrade-overlay__orb"
              animate={{ rotate: 360, scale: [1, 1.3, 1] }}
              transition={{ duration: 1.5, ease: 'easeInOut' }}
            />
            <p>Слияние редкостей…</p>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {phase === 'result' && result && (
          <motion.div
            className="result-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <button
              type="button"
              className="result-modal__backdrop"
              aria-label="Закрыть"
              onClick={() => {
                setPhase('pick')
                setResult(null)
              }}
            />
            <motion.div
              className="result-modal__panel"
              initial={{ scale: 0.86, y: 24 }}
              animate={{ scale: 1, y: 0 }}
              style={
                {
                  '--item-color': RARITY_META[result.rarity].color,
                  '--item-glow': RARITY_META[result.rarity].glow,
                } as CSSProperties
              }
            >
              <p className="result-modal__eyebrow">Upgrade успешен</p>
              <div className="result-modal__visual">
                <img src={result.image} alt="" />
              </div>
              <RarityBadge rarity={result.rarity} />
              <h2 className="result-modal__name">{result.name}</h2>
              <p className="result-modal__value">{result.value} Мора</p>
              <div className="result-modal__actions">
                <button
                  type="button"
                  className="btn btn--primary"
                  onClick={() => {
                    setPhase('pick')
                    setResult(null)
                  }}
                >
                  Ещё Upgrade
                </button>
                <Link to="/inventory" className="btn btn--ghost">
                  В инвентарь
                </Link>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
