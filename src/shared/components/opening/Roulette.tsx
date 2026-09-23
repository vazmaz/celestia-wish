import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
} from 'react'
import { RARITY_META } from '../../../features/cases/data/rarities'
import { sfx } from '../../../shared/lib/sfx'
import type { CaseItem } from '../../../shared/types'

const DEFAULT_ITEM_WIDTH = 128
const DEFAULT_ITEM_HEIGHT = 88
const ITEM_GAP = 10
const DEFAULT_SPIN_MS = 5200
const STRIP_LENGTH = 48
const WIN_INDEX = STRIP_LENGTH - 8

interface Props {
  pool: CaseItem[]
  winner: CaseItem
  spinning: boolean
  onDone: () => void
  durationMs?: number
  itemWidth?: number
  /** Fixed item height for vertical orientation. */
  itemHeight?: number
  compact?: boolean
  /** Play scroll ticks. Battles should enable this on one lane only. */
  audible?: boolean
  spinVariant?: 'case' | 'battle'
  orientation?: 'horizontal' | 'vertical'
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

function buildStrip(pool: CaseItem[], winner: CaseItem): CaseItem[] {
  const strip: CaseItem[] = []
  for (let i = 0; i < STRIP_LENGTH; i++) {
    strip.push(pool[Math.floor(Math.random() * pool.length)])
  }
  strip[WIN_INDEX] = winner
  return strip
}

/** Center of item[winIndex] exactly under the viewport midline. */
function measureCenterOffset(
  track: HTMLDivElement,
  viewport: HTMLElement,
  winIndex: number,
  fallbackStride: number,
  itemSize: number,
  vertical: boolean,
): number {
  const el = track.children[winIndex] as HTMLElement | undefined
  if (el) {
    if (vertical) {
      const itemCenter = el.offsetTop + el.offsetHeight / 2
      return itemCenter - viewport.clientHeight / 2
    }
    const itemCenter = el.offsetLeft + el.offsetWidth / 2
    return itemCenter - viewport.clientWidth / 2
  }
  if (vertical) {
    return winIndex * fallbackStride + itemSize / 2 - viewport.clientHeight / 2
  }
  return winIndex * fallbackStride + itemSize / 2 - viewport.clientWidth / 2
}

export function Roulette({
  pool,
  winner,
  spinning,
  onDone,
  durationMs = DEFAULT_SPIN_MS,
  itemWidth = DEFAULT_ITEM_WIDTH,
  itemHeight = DEFAULT_ITEM_HEIGHT,
  compact = false,
  audible = true,
  spinVariant = 'case',
  orientation = 'horizontal',
}: Props) {
  const vertical = orientation === 'vertical'
  const rootRef = useRef<HTMLDivElement>(null)
  const viewportRef = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const onDoneRef = useRef(onDone)
  const poolRef = useRef(pool)
  const winnerRef = useRef(winner)
  const spinningRef = useRef(spinning)
  const [offset, setOffset] = useState(0)
  const [active, setActive] = useState(false)
  const [strip, setStrip] = useState(() => buildStrip(pool, winner))
  const gap = ITEM_GAP
  const itemSize = vertical ? itemHeight : itemWidth
  const stride = itemSize + gap

  poolRef.current = pool
  winnerRef.current = winner
  spinningRef.current = spinning

  useEffect(() => {
    onDoneRef.current = onDone
  }, [onDone])

  const centerOnWinner = useCallback(() => {
    const track = trackRef.current
    const viewport = viewportRef.current
    if (!track || !viewport) return
    const span = vertical ? viewport.clientHeight : viewport.clientWidth
    if (span < 8) return
    const centered = measureCenterOffset(
      track,
      viewport,
      WIN_INDEX,
      stride,
      itemSize,
      vertical,
    )
    setActive(false)
    setOffset(centered)
  }, [stride, itemSize, vertical])

  // Idle / after spin: keep winner dead-center. Also re-run on resize
  // (opponent lanes often measure wrong on first paint).
  useLayoutEffect(() => {
    if (spinning) return
    centerOnWinner()
  }, [spinning, strip, centerOnWinner])

  useEffect(() => {
    const root = rootRef.current
    if (!root || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(() => {
      if (!spinningRef.current) centerOnWinner()
    })
    ro.observe(root)
    return () => ro.disconnect()
  }, [centerOnWinner])

  useEffect(() => {
    if (!spinning) return

    const frozen = buildStrip(poolRef.current, winnerRef.current)
    setStrip(frozen)
    setActive(false)

    let cancelled = false
    let rafOuter = 0
    let rafInner = 0
    let rafStart = 0
    let tickRaf = 0
    let timer = 0

    rafOuter = requestAnimationFrame(() => {
      rafInner = requestAnimationFrame(() => {
        if (cancelled) return
        const track = trackRef.current
        const viewport = viewportRef.current
        if (!track || !viewport) return

        const target = measureCenterOffset(
          track,
          viewport,
          WIN_INDEX,
          stride,
          itemSize,
          vertical,
        )
        const startOffset = Math.max(0, target - stride * 18)
        setOffset(startOffset)

        const beginTicks = () => {
          if (!audible || cancelled) return
          sfx.spinStart(spinVariant)
          const travel = target - startOffset
          const startedAt = performance.now()
          let lastIndex = -1
          let landed = false

          const step = (now: number) => {
            if (cancelled) return
            const t = Math.min(1, (now - startedAt) / durationMs)
            const current = startOffset + travel * easeRoulette(t)
            const idx = Math.round(current / stride)
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

        rafStart = requestAnimationFrame(() => {
          if (cancelled) return
          setActive(true)
          setOffset(target)
          beginTicks()
        })

        timer = window.setTimeout(() => {
          onDoneRef.current()
        }, durationMs + 80)
      })
    })

    return () => {
      cancelled = true
      cancelAnimationFrame(rafOuter)
      cancelAnimationFrame(rafInner)
      cancelAnimationFrame(rafStart)
      cancelAnimationFrame(tickRaf)
      window.clearTimeout(timer)
    }
  }, [
    spinning,
    durationMs,
    itemSize,
    stride,
    audible,
    spinVariant,
    vertical,
  ])

  const itemStyle = vertical
    ? ({
        height: itemHeight,
        flex: `0 0 ${itemHeight}px`,
        width: '100%',
        '--item-height': `${itemHeight}px`,
      } as CSSProperties)
    : ({
        width: itemWidth,
        flex: `0 0 ${itemWidth}px`,
        '--item-width': `${itemWidth}px`,
      } as CSSProperties)

  return (
    <div
      ref={rootRef}
      className={`roulette${compact ? ' roulette--compact' : ''}${
        vertical ? ' roulette--vertical' : ''
      }`}
      aria-live="polite"
    >
      {/* Marker outside masked clip so it's always visible & centered */}
      <div className="roulette__marker" aria-hidden />
      <div className="roulette__viewport" ref={viewportRef}>
        <div className="roulette__clip">
          <div
            ref={trackRef}
            className={`roulette__track${active ? ' roulette__track--spin' : ''}`}
            style={{
              transform: vertical
                ? `translate3d(0, ${-offset}px, 0)`
                : `translate3d(${-offset}px, 0, 0)`,
              transitionDuration: active ? `${durationMs}ms` : '0ms',
              gap: `${gap}px`,
            }}
          >
            {strip.map((item, index) => {
              const meta = RARITY_META[item.rarity]
              const isWin = index === WIN_INDEX && !spinning
              return (
                <div
                  key={`${item.id}-${index}`}
                  className={`roulette__item${isWin ? ' roulette__item--win' : ''}`}
                  style={
                    {
                      ...itemStyle,
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
    </div>
  )
}
