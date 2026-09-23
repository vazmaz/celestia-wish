type CelestiaMascotProps = {
  className?: string
  title?: string
}

/**
 * Celestia Wish companion — original Genshin-style floating guide character.
 */
export function CelestiaMascot({
  className,
  title = 'Celestia — маскот',
}: CelestiaMascotProps) {
  return (
    <img
      className={className}
      src="/hero/celestia-mascot-v2.png"
      alt={title}
      width={320}
      height={320}
      draggable={false}
    />
  )
}
