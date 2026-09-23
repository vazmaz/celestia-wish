import { MoraCoin } from './MoraCoin'

type MoraAmountProps = {
  value: number | string
  className?: string
  coinClassName?: string
}

/** Numeric amount with Mora coin instead of the word «Мора». */
export function MoraAmount({
  value,
  className,
  coinClassName = 'mora-amount__coin',
}: MoraAmountProps) {
  const formatted =
    typeof value === 'number' ? value.toLocaleString('ru-RU') : value

  return (
    <span className={className ? `mora-amount ${className}` : 'mora-amount'}>
      <MoraCoin className={coinClassName} />
      <span className="mora-amount__value">{formatted}</span>
    </span>
  )
}
