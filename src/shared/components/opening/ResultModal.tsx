import type { CSSProperties } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { RARITY_META } from '../../../features/cases/data/rarities'
import type { InventoryItem } from '../../../shared/types'
import { RarityBadge } from '../item/RarityBadge'

interface Props {
  item: InventoryItem | null
  onClose: () => void
  onOpenAgain: () => void
  canOpenAgain: boolean
}

export function ResultModal({ item, onClose, onOpenAgain, canOpenAgain }: Props) {
  return (
    <AnimatePresence>
      {item && (
        <motion.div
          className="result-modal"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="dialog"
          aria-modal="true"
          aria-label="Результат открытия"
        >
          <button type="button" className="result-modal__backdrop" onClick={onClose} aria-label="Закрыть" />
          <motion.div
            className="result-modal__panel"
            initial={{ scale: 0.86, y: 28, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.92, y: 12, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 280, damping: 22 }}
            style={
              {
                '--item-color': RARITY_META[item.rarity].color,
                '--item-glow': RARITY_META[item.rarity].glow,
                '--item-accent': item.accent,
              } as CSSProperties
            }
          >
            <p className="result-modal__eyebrow">Wish результат</p>
            <div className="result-modal__visual" aria-hidden>
              {item.image ? (
                <img src={item.image} alt="" />
              ) : (
                <span>{item.name.slice(0, 1)}</span>
              )}
            </div>
            <RarityBadge rarity={item.rarity} />
            <h2 className="result-modal__name">{item.name}</h2>
            <p className="result-modal__value">Стоимость: {item.value} Мора</p>
            <div className="result-modal__actions">
              <button type="button" className="btn btn--ghost" onClick={onClose}>
                В инвентарь
              </button>
              <button
                type="button"
                className="btn btn--primary"
                onClick={onOpenAgain}
                disabled={!canOpenAgain}
              >
                Открыть ещё
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
