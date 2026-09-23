import { useId } from 'react'

type CrystalIconProps = {
  className?: string
  title?: string
}

/** Faceted Primogem — the blue crystal currency from Genshin. */
export function CrystalIcon({
  className,
  title = 'Кристалл',
}: CrystalIconProps) {
  const uid = useId().replace(/:/g, '')
  const body = `${uid}-body`
  const shine = `${uid}-shine`
  const deep = `${uid}-deep`

  return (
    <svg
      className={className}
      viewBox="0 0 32 32"
      role="img"
      aria-label={title}
    >
      <defs>
        <linearGradient id={body} x1="0.18" y1="0" x2="0.82" y2="1">
          <stop offset="0%" stopColor="#f4fdff" />
          <stop offset="16%" stopColor="#9ae6ff" />
          <stop offset="46%" stopColor="#3b8cf6" />
          <stop offset="100%" stopColor="#173888" />
        </linearGradient>
        <linearGradient id={shine} x1="0.5" y1="0" x2="0.5" y2="1">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#c5f1ff" />
        </linearGradient>
        <linearGradient id={deep} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#6ec0ff" />
          <stop offset="100%" stopColor="#10275f" />
        </linearGradient>
      </defs>

      <path
        d="M16 1.3 L24.4 7.1 L28.4 14.5 L23.5 23.2 L16 30.6 L8.5 23.2 L3.6 14.5 L7.6 7.1 Z"
        fill={`url(#${body})`}
        stroke="#0c2458"
        strokeWidth="0.65"
        strokeLinejoin="round"
      />

      <path d="M16 1.3 L7.6 7.1 L3.6 14.5 L16 14.1 Z" fill="#e7f9ff" opacity="0.62" />
      <path
        d="M16 1.3 L24.4 7.1 L28.4 14.5 L16 14.1 Z"
        fill={`url(#${deep})`}
        opacity="0.5"
      />
      <path d="M3.6 14.5 L8.5 23.2 L16 30.6 L16 14.1 Z" fill="#1c4eae" opacity="0.38" />
      <path d="M28.4 14.5 L23.5 23.2 L16 30.6 L16 14.1 Z" fill="#0d2868" opacity="0.55" />

      <path d="M16 4 L21.4 8.3 L16 12.1 L10.6 8.3 Z" fill={`url(#${shine})`} />
      <path d="M16 8.4 L19.4 13.1 L16 23.2 L12.6 13.1 Z" fill="#7ecbff" opacity="0.5" />
      <path d="M16 10.2 L17.7 13.3 L16 17.4 L14.3 13.3 Z" fill="#ffffff" opacity="0.88" />

      <path
        d="M25.4 3.6 L25.9 5.05 L27.4 5.55 L25.9 6.05 L25.4 7.5 L24.9 6.05 L23.4 5.55 L24.9 5.05 Z"
        fill="#ffffff"
      />
    </svg>
  )
}
