import type { Rarity } from '../types'

const STORAGE_KEY = 'celestia-sfx-muted'

type StopFn = () => void

const listeners = new Set<() => void>()
const stops: StopFn[] = []

let muted = readMuted()
let ctx: AudioContext | null = null
let master: GainNode | null = null
let noiseBuffer: AudioBuffer | null = null
let lastSpin = -1
let lastTick = -1
let lastLand = -1
let lastReveal = -1
let lastOutcome = -1

function readMuted() {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

export function getSfxMuted() {
  return muted
}

export function setSfxMuted(next: boolean) {
  muted = next
  try {
    localStorage.setItem(STORAGE_KEY, next ? '1' : '0')
  } catch {
    /* private mode */
  }
  if (next) stopAll()
  listeners.forEach((fn) => fn())
}

export function subscribeSfx(onStoreChange: () => void) {
  listeners.add(onStoreChange)
  return () => listeners.delete(onStoreChange)
}

function stopAll() {
  for (const stop of stops.splice(0)) {
    try {
      stop()
    } catch {
      /* already stopped */
    }
  }
}

function track(stop: StopFn, lifeMs: number) {
  stops.push(stop)
  window.setTimeout(() => {
    const index = stops.indexOf(stop)
    if (index >= 0) stops.splice(index, 1)
  }, lifeMs)
}

function audioContextCtor(): typeof AudioContext | null {
  if (typeof window === 'undefined') return null
  return (
    window.AudioContext ??
    (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext ??
    null
  )
}

function getCtx() {
  if (muted) return null
  const Ctor = audioContextCtor()
  if (!Ctor) return null
  if (!ctx) {
    ctx = new Ctor()
    const compressor = ctx.createDynamicsCompressor()
    compressor.threshold.value = -16
    compressor.knee.value = 18
    compressor.ratio.value = 3.5
    compressor.attack.value = 0.004
    compressor.release.value = 0.18
    master = ctx.createGain()
    master.gain.value = 0.42
    master.connect(compressor)
    compressor.connect(ctx.destination)
  }
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

function noise(audio: AudioContext) {
  if (noiseBuffer) return noiseBuffer
  const buffer = audio.createBuffer(1, audio.sampleRate, audio.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
  noiseBuffer = buffer
  return buffer
}

function tone(
  audio: AudioContext,
  out: AudioNode,
  opts: {
    freq: number
    type?: OscillatorType
    at: number
    dur: number
    gain: number
    slideTo?: number
  },
) {
  const osc = audio.createOscillator()
  const gain = audio.createGain()
  osc.type = opts.type ?? 'sine'
  osc.frequency.setValueAtTime(opts.freq, opts.at)
  if (opts.slideTo) {
    osc.frequency.exponentialRampToValueAtTime(Math.max(40, opts.slideTo), opts.at + opts.dur)
  }
  gain.gain.setValueAtTime(0.0001, opts.at)
  gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, opts.gain), opts.at + Math.min(0.018, opts.dur * 0.25))
  gain.gain.exponentialRampToValueAtTime(0.0001, opts.at + opts.dur)
  osc.connect(gain)
  gain.connect(out)
  osc.start(opts.at)
  osc.stop(opts.at + opts.dur + 0.03)
  track(() => osc.stop(), (opts.dur + 0.1) * 1000)
}

/** Soft glass/bell hit — slow attack-free decay, like Genshin UI chimes. */
function bell(
  audio: AudioContext,
  out: AudioNode,
  opts: { freq: number; at: number; dur?: number; gain?: number },
) {
  const dur = opts.dur ?? 0.85
  const gainAmt = opts.gain ?? 0.055
  const partials: Array<[number, number, OscillatorType]> = [
    [1, 1, 'sine'],
    [2.002, 0.28, 'sine'],
    [2.99, 0.12, 'triangle'],
    [4.05, 0.06, 'sine'],
  ]
  for (const [mult, amp, type] of partials) {
    const osc = audio.createOscillator()
    const gain = audio.createGain()
    osc.type = type
    osc.frequency.setValueAtTime(opts.freq * mult, opts.at)
    gain.gain.setValueAtTime(0.0001, opts.at)
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, gainAmt * amp), opts.at + 0.012)
    gain.gain.exponentialRampToValueAtTime(0.0001, opts.at + dur)
    osc.connect(gain)
    gain.connect(out)
    osc.start(opts.at)
    osc.stop(opts.at + dur + 0.04)
    track(() => osc.stop(), (dur + 0.12) * 1000)
  }
}

function whoosh(
  audio: AudioContext,
  out: AudioNode,
  at: number,
  dur: number,
  gainValue: number,
  fromHz: number,
  toHz: number,
) {
  const src = audio.createBufferSource()
  const band = audio.createBiquadFilter()
  const gain = audio.createGain()
  src.buffer = noise(audio)
  band.type = 'bandpass'
  band.Q.value = 0.85
  band.frequency.setValueAtTime(fromHz, at)
  band.frequency.exponentialRampToValueAtTime(Math.max(80, toHz), at + dur)
  gain.gain.setValueAtTime(0.0001, at)
  gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, gainValue), at + dur * 0.22)
  gain.gain.exponentialRampToValueAtTime(0.0001, at + dur)
  src.connect(band)
  band.connect(gain)
  gain.connect(out)
  src.start(at)
  src.stop(at + dur)
  track(() => src.stop(), (dur + 0.1) * 1000)
}

function burst(
  audio: AudioContext,
  out: AudioNode,
  at: number,
  dur: number,
  gainValue: number,
  filter: { type: BiquadFilterType; freq: number; q: number },
) {
  const src = audio.createBufferSource()
  const band = audio.createBiquadFilter()
  const gain = audio.createGain()
  src.buffer = noise(audio)
  band.type = filter.type
  band.frequency.setValueAtTime(filter.freq, at)
  band.Q.value = filter.q
  gain.gain.setValueAtTime(Math.max(0.0002, gainValue), at)
  gain.gain.exponentialRampToValueAtTime(0.0001, at + dur)
  src.connect(band)
  band.connect(gain)
  gain.connect(out)
  src.start(at)
  src.stop(at + dur)
  track(() => src.stop(), (dur + 0.1) * 1000)
}

/** High crystalline sparkles — soft “star dust” texture. */
function sparkles(audio: AudioContext, out: AudioNode, at: number, count = 5) {
  for (let i = 0; i < count; i++) {
    const t = at + i * 0.045 + Math.random() * 0.02
    const freq = 1800 + Math.random() * 2200
    tone(audio, out, {
      freq,
      type: 'sine',
      at: t,
      dur: 0.12 + Math.random() * 0.1,
      gain: 0.012 + Math.random() * 0.012,
    })
    burst(audio, out, t, 0.05, 0.018, { type: 'bandpass', freq, q: 8 })
  }
}

const REVEAL: Record<Rarity, { notes: number[]; step: number; dur: number; gain: number }> = {
  common: { notes: [523.25, 659.25], step: 0.09, dur: 0.7, gain: 0.045 },
  uncommon: { notes: [523.25, 659.25, 783.99], step: 0.09, dur: 0.8, gain: 0.048 },
  rare: { notes: [392, 523.25, 659.25, 987.77], step: 0.1, dur: 0.95, gain: 0.052 },
  epic: { notes: [349.23, 523.25, 659.25, 830.61, 1046.5], step: 0.11, dur: 1.1, gain: 0.055 },
  legendary: {
    notes: [261.63, 392, 523.25, 659.25, 783.99, 1046.5, 1318.51],
    step: 0.12,
    dur: 1.35,
    gain: 0.06,
  },
}

export const sfx = {
  /** Call from a click so later animation sounds are allowed to play. */
  unlock() {
    getCtx()
  },

  /** Soft UI confirm — like toggling sound / menu ding. */
  blip() {
    const audio = getCtx()
    if (!audio || !master) return
    const now = audio.currentTime
    bell(audio, master, { freq: 783.99, at: now, dur: 0.45, gain: 0.04 })
    bell(audio, master, { freq: 1174.66, at: now + 0.055, dur: 0.55, gain: 0.032 })
    sparkles(audio, master, now + 0.02, 2)
  },

  caseOpen() {
    const audio = getCtx()
    if (!audio || !master) return
    const now = audio.currentTime
    whoosh(audio, master, now, 0.55, 0.055, 420, 2400)
    tone(audio, master, {
      freq: 130.81,
      type: 'sine',
      at: now,
      dur: 0.7,
      gain: 0.045,
      slideTo: 196,
    })
    const motif = [523.25, 659.25, 783.99, 987.77, 1318.51]
    motif.forEach((freq, i) => {
      bell(audio, master!, {
        freq,
        at: now + 0.04 + i * 0.07,
        dur: 0.9 - i * 0.05,
        gain: 0.05 - i * 0.004,
      })
    })
    sparkles(audio, master, now + 0.12, 7)
  },

  /** Start of the wish scroll / battle round — soft anemo gust. */
  spinStart(variant: 'case' | 'battle' = 'case') {
    const audio = getCtx()
    if (!audio || !master) return
    const now = audio.currentTime
    if (now - lastSpin < 0.25) return
    lastSpin = now
    whoosh(audio, master, now, 0.5, variant === 'battle' ? 0.05 : 0.038, 320, 2600)
    bell(audio, master, { freq: 659.25, at: now + 0.02, dur: 0.5, gain: 0.03 })
    bell(audio, master, { freq: 987.77, at: now + 0.08, dur: 0.55, gain: 0.025 })
    if (variant === 'battle') {
      tone(audio, master, {
        freq: 196,
        type: 'sine',
        at: now,
        dur: 0.55,
        gain: 0.05,
        slideTo: 293.66,
      })
      bell(audio, master, { freq: 523.25, at: now + 0.12, dur: 0.7, gain: 0.035 })
      sparkles(audio, master, now + 0.05, 4)
    }
  },

  /** Crystal tick as the banner strip passes items. */
  tick(progress: number) {
    const audio = getCtx()
    if (!audio || !master) return
    const now = audio.currentTime
    if (now - lastTick < 0.05) return
    lastTick = now
    const energy = 1 - Math.min(1, Math.max(0, progress))
    const freq = 980 + energy * 900
    tone(audio, master, {
      type: 'sine',
      freq,
      at: now,
      dur: 0.045 + energy * 0.02,
      gain: 0.016 + energy * 0.018,
    })
    tone(audio, master, {
      type: 'sine',
      freq: freq * 2.01,
      at: now,
      dur: 0.035,
      gain: 0.008 + energy * 0.008,
    })
    burst(audio, master, now, 0.028, 0.012 + energy * 0.02, {
      type: 'bandpass',
      freq: 1600 + energy * 1400,
      q: 7,
    })
  },

  /** Soft settle when the scroll stops — like a star locking in. */
  land() {
    const audio = getCtx()
    if (!audio || !master) return
    const now = audio.currentTime
    if (now - lastLand < 0.2) return
    lastLand = now
    whoosh(audio, master, now, 0.28, 0.03, 1800, 400)
    bell(audio, master, { freq: 392, at: now, dur: 0.55, gain: 0.04 })
    bell(audio, master, { freq: 783.99, at: now + 0.04, dur: 0.7, gain: 0.035 })
    sparkles(audio, master, now + 0.02, 3)
  },

  reveal(rarity: Rarity) {
    const audio = getCtx()
    if (!audio || !master) return
    const now = audio.currentTime
    if (now - lastReveal < 0.35) return
    lastReveal = now
    const spec = REVEAL[rarity]
    whoosh(audio, master, now, 0.45, rarity === 'legendary' ? 0.05 : 0.03, 600, 2800)
    spec.notes.forEach((freq, index) => {
      const at = now + index * spec.step
      bell(audio, master!, { freq, at, dur: spec.dur, gain: spec.gain })
    })
    if (rarity === 'epic' || rarity === 'legendary') {
      sparkles(audio, master, now + 0.08, rarity === 'legendary' ? 10 : 6)
      bell(audio, master, {
        freq: rarity === 'legendary' ? 1567.98 : 1318.51,
        at: now + spec.notes.length * spec.step * 0.55,
        dur: 1.2,
        gain: 0.04,
      })
    }
  },

  upgradeCharge() {
    const audio = getCtx()
    if (!audio || !master) return () => {}
    const now = audio.currentTime
    const dur = 1.45
    const stopsLocal: StopFn[] = []

    whoosh(audio, master, now, dur * 0.95, 0.04, 280, 3200)
    whoosh(audio, master, now + 0.15, dur * 0.8, 0.028, 900, 4800)

    const pad = audio.createOscillator()
    const pad2 = audio.createOscillator()
    const filter = audio.createBiquadFilter()
    const gain = audio.createGain()
    pad.type = 'sine'
    pad2.type = 'triangle'
    pad.frequency.setValueAtTime(164.81, now)
    pad.frequency.exponentialRampToValueAtTime(392, now + dur)
    pad2.frequency.setValueAtTime(329.63, now)
    pad2.frequency.exponentialRampToValueAtTime(659.25, now + dur)
    filter.type = 'lowpass'
    filter.Q.value = 0.6
    filter.frequency.setValueAtTime(500, now)
    filter.frequency.exponentialRampToValueAtTime(2800, now + dur)
    gain.gain.setValueAtTime(0.0001, now)
    gain.gain.linearRampToValueAtTime(0.055, now + dur * 0.75)
    gain.gain.linearRampToValueAtTime(0.0001, now + dur)
    pad.connect(filter)
    pad2.connect(filter)
    filter.connect(gain)
    gain.connect(master)
    pad.start(now)
    pad2.start(now)
    pad.stop(now + dur + 0.05)
    pad2.stop(now + dur + 0.05)
    stopsLocal.push(() => {
      try {
        pad.stop()
        pad2.stop()
      } catch {
        /* already stopped */
      }
    })

    const pulses = [392, 440, 523.25, 587.33, 659.25, 783.99, 987.77]
    pulses.forEach((freq, i) => {
      const t = now + 0.08 + i * (dur / pulses.length) * 0.92
      bell(audio, master!, {
        freq,
        at: t,
        dur: 0.55,
        gain: 0.028 + i * 0.004,
      })
      sparkles(audio, master!, t, 2)
    })

    bell(audio, master, { freq: 1046.5, at: now + dur - 0.22, dur: 0.9, gain: 0.06 })
    bell(audio, master, { freq: 1318.51, at: now + dur - 0.12, dur: 1.0, gain: 0.045 })

    const stop = () => {
      for (const fn of stopsLocal) fn()
    }
    track(stop, (dur + 0.3) * 1000)
    return stop
  },

  /** Victory fanfare / soft defeat — domain clear vibe. */
  battleOutcome(won: boolean) {
    const audio = getCtx()
    if (!audio || !master) return
    const now = audio.currentTime
    if (now - lastOutcome < 0.8) return
    lastOutcome = now

    if (won) {
      whoosh(audio, master, now, 0.7, 0.045, 500, 3200)
      const fanfare = [392, 523.25, 659.25, 783.99, 1046.5]
      fanfare.forEach((freq, i) => {
        bell(audio, master!, {
          freq,
          at: now + i * 0.1,
          dur: 1.1,
          gain: 0.045 + i * 0.004,
        })
      })
      bell(audio, master, { freq: 1318.51, at: now + 0.52, dur: 1.4, gain: 0.04 })
      sparkles(audio, master, now + 0.15, 9)
      return
    }

    whoosh(audio, master, now, 0.55, 0.03, 1600, 280)
    const down = [523.25, 415.3, 329.63]
    down.forEach((freq, i) => {
      bell(audio, master!, {
        freq,
        at: now + i * 0.14,
        dur: 0.85,
        gain: 0.038 - i * 0.004,
      })
    })
  },
}
