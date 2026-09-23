type MoraCoinProps = {
  className?: string
  title?: string
}

/** Golden Mora coin — Genshin-inspired currency mark. */
export function MoraCoin({ className, title = 'Мора' }: MoraCoinProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 32 32"
      role="img"
      aria-label={title}
    >
      <defs>
        <radialGradient id="mora-face" cx="38%" cy="32%" r="68%">
          <stop offset="0%" stopColor="#fff1b0" />
          <stop offset="45%" stopColor="#f0c45a" />
          <stop offset="100%" stopColor="#c98728" />
        </radialGradient>
        <linearGradient id="mora-rim" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ffe9a0" />
          <stop offset="50%" stopColor="#d4a03a" />
          <stop offset="100%" stopColor="#8f5c18" />
        </linearGradient>
        <linearGradient id="mora-gem" x1="0.2" y1="0" x2="0.8" y2="1">
          <stop offset="0%" stopColor="#fff6c8" />
          <stop offset="55%" stopColor="#f0d078" />
          <stop offset="100%" stopColor="#b87a20" />
        </linearGradient>
      </defs>

      <circle cx="16" cy="16" r="14.5" fill="url(#mora-rim)" />
      <circle cx="16" cy="16" r="12.2" fill="url(#mora-face)" />
      <circle
        cx="16"
        cy="16"
        r="11.2"
        fill="none"
        stroke="rgba(120, 70, 10, 0.35)"
        strokeWidth="0.8"
      />

      {/* Decorative rim ticks */}
      {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => {
        const rad = (deg * Math.PI) / 180
        const x1 = 16 + Math.cos(rad) * 12.8
        const y1 = 16 + Math.sin(rad) * 12.8
        const x2 = 16 + Math.cos(rad) * 13.9
        const y2 = 16 + Math.sin(rad) * 13.9
        return (
          <line
            key={deg}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke="rgba(255, 235, 170, 0.85)"
            strokeWidth="1.1"
            strokeLinecap="round"
          />
        )
      })}

      {/* Center geo-style diamond */}
      <path
        d="M16 6.8 L22.4 16 L16 25.2 L9.6 16 Z"
        fill="url(#mora-gem)"
        stroke="#8a5414"
        strokeWidth="0.7"
        strokeLinejoin="round"
      />
      <path
        d="M16 9.4 L20.2 16 L16 22.6 L11.8 16 Z"
        fill="rgba(255, 250, 220, 0.35)"
      />
      <path
        d="M16 12.2 L18.2 16 L16 19.8 L13.8 16 Z"
        fill="#7a4a12"
        opacity="0.55"
      />
      <circle cx="13.2" cy="12.4" r="1.15" fill="rgba(255,255,255,0.55)" />
    </svg>
  )
}
