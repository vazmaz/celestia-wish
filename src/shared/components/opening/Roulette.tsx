import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { RARITY_META } from '../../../features/cases/data/rarities'
import { sfx } from '../../../shared/lib/sfx'
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
  /** Play scroll ticks. Battles should enable this on one lane only. */
  audible?: boolean
  spinVariant?: 'case' | 'battle'
}

/** Matches `.roulette__track` transition-timing-function. */
function easeRoulette(x: number) {
  const x1 = 0.12
  const y1 = 0.75
  const x2 = 0.08
  const y2 = 1
  const cx = 3 * x1
  const bx = 3 * (x2 - x1) - cx
  const ax = 1 - cx - bx
  const cy = 3 * y1
  const by = 3 * (y2 - y1) - cy
  const ay = 1 - cy - by
  const sampleX = (t: number) => ((ax * t + bx) * t + cx) * t
  const sampleY = (t: number) => ((ay * t + by) * t + cy) * t
  const sampleDX = (t: number) => (3 * ax * t + 2 * bx) * t + cx
  let t = x
  for (let i = 0; i < 8; i++) {
    const slope = sampleDX(t)
    if (Math.abs(slope) < 1e-6) break
    const guess = sampleX(t) - x
    if (Math.abs(guess) < 1e-5) return sampleY(t)
    t = Math.min(1, Math.max(0, t - guess / slope))
  }
  let lo = 0
  let hi = 1
  t = x
  for (let i = 0; i < 14; i++) {
    const guess = sampleX(t)
    if (guess < x) lo = t
    else hi = t
    t = (lo + hi) / 2
  }
  return sampleY(t)
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
  audible = true,
  spinVariant = 'case',
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

    let cancelled = false
    let rafOuter = 0
    let rafInner = 0
    let tickRaf = 0

    const beginTicks = () => {
      if (!audible || cancelled) return
      sfx.spinStart(spinVariant)
      const startCenter = viewportWidth / 2
      const endCenter = target + viewportWidth / 2
      const indexAt = (center: number) => Math.round((center - itemWidth / 2) / stride)
      let lastIndex = indexAt(startCenter)
      let landed = false
      const startedAt = performance.now()

      const step = (now: number) => {
        if (cancelled) return
        const t = Math.min(1, (now - startedAt) / durationMs)
        const center = startCenter + (endCenter - startCenter) * easeRoulette(t)
        const idx = indexAt(center)
        if (idx !== lastIndex) {
          sfx.tick(t)
          lastIndex = idx
        }
        if (t < 1) {
          tickRaf = requestAnimationFrame(step)
        } else if (!landed) {
          landed = true
          sfx.land()
        }
      }
      tickRaf = requestAnimationFrame(step)
    }

    rafOuter = requestAnimationFrame(() => {
      rafInner = requestAnimationFrame(() => {
        if (cancelled) return
        setActive(true)
        setOffset(target)
        beginTicks()
      })
    })

    const timer = window.setTimeout(() => {
      onDone()
    }, durationMs + 80)

    return () => {
      cancelled = true
      cancelAnimationFrame(rafOuter)
      cancelAnimationFrame(rafInner)
      cancelAnimationFrame(tickRaf)
      window.clearTimeout(timer)
    }
  }, [spinning, winIndex, onDone, durationMs, itemWidth, stride, audible, spinVariant])

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
