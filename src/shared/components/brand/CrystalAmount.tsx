import { CrystalIcon } from './CrystalIcon'

type CrystalAmountProps = {
  value: number | string
  className?: string
  coinClassName?: string
}

/** Numeric amount with a Primogem instead of the word «Кристаллы». */
export function CrystalAmount({
  value,
  className,
  coinClassName = 'crystal-amount__icon',
}: CrystalAmountProps) {
  const formatted =
    typeof value === 'number' ? value.toLocaleString('ru-RU') : value

  return (
    <span className={className ? `crystal-amount ${className}` : 'crystal-amount'}>
      <CrystalIcon className={coinClassName} />
      <span className="crystal-amount__value">{formatted}</span>
    </span>
  )
}
