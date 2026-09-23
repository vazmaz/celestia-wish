import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { RARITY_META } from '../../../features/cases/data/rarities'
import type { CaseItem } from '../../../shared/types'

const DEFAULT_ITEM_WIDTH = 132
const ITEM_GAP = 10
const DEFAULT_SPIN_MS = 5200

interface Props {
  pool: CaseItem[]
  winner: CaseItem
  spinning: boolean
  onDone: () => void
  durationMs?: number
  itemWidth?: number
  compact?: boolean
}

function buildStrip(pool: CaseItem[], winner: CaseItem, length = 48): CaseItem[] {
  const strip: CaseItem[] = []
  for (let i = 0; i < length; i++) {
    strip.push(pool[Math.floor(Math.random() * pool.length)])
  }
  const winIndex = length - 8
  strip[winIndex] = winner
  return strip
}

export function Roulette({
  pool,
  winner,
  spinning,
  onDone,
  durationMs = DEFAULT_SPIN_MS,
  itemWidth = DEFAULT_ITEM_WIDTH,
  compact = false,
}: Props) {
  const trackRef = useRef<HTMLDivElement>(null)
  const [offset, setOffset] = useState(0)
  const [active, setActive] = useState(false)
  const strip = useMemo(() => buildStrip(pool, winner), [pool, winner])
  const winIndex = strip.length - 8
  const stride = itemWidth + ITEM_GAP

  useEffect(() => {
    if (!spinning) return

    const viewport = trackRef.current?.parentElement
    const viewportWidth = viewport?.clientWidth ?? 360
    const centerPad = viewportWidth / 2 - itemWidth / 2
    const jitter = (Math.random() - 0.5) * (itemWidth * 0.35)
    const target = winIndex * stride - centerPad + jitter

    setActive(false)
    setOffset(0)

    const start = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setActive(true)
        setOffset(target)
      })
    })

    const timer = window.setTimeout(() => {
      onDone()
    }, durationMs + 80)

    return () => {
      cancelAnimationFrame(start)
      window.clearTimeout(timer)
    }
  }, [spinning, winIndex, onDone, durationMs, itemWidth, stride])

  return (
    <div className={`roulette${compact ? ' roulette--compact' : ''}`} aria-live="polite">
      <div className="roulette__marker" aria-hidden />
      <div className="roulette__viewport">
        <div
          ref={trackRef}
          className={`roulette__track${active ? ' roulette__track--spin' : ''}`}
          style={{
            transform: `translate3d(${-offset}px, 0, 0)`,
            transitionDuration: active ? `${durationMs}ms` : '0ms',
          }}
        >
          {strip.map((item, index) => {
            const meta = RARITY_META[item.rarity]
            return (
              <div
                key={`${item.id}-${index}`}
                className="roulette__item"
                style={
                  {
                    width: itemWidth,
                    '--item-color': meta.color,
                    '--item-glow': meta.glow,
                    '--item-accent': item.accent,
                  } as CSSProperties
                }
              >
                <div className="roulette__item-visual">
                  {item.image ? (
                    <img src={item.image} alt="" />
                  ) : (
                    <span>{item.name.slice(0, 1)}</span>
                  )}
                </div>
                <p className="roulette__item-name">{item.name}</p>
                <span className="roulette__item-rarity">{meta.label}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
