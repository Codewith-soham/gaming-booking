import { formatCurrency, formatDuration } from '../../utils/format'

export default function PriceBreakdown({ price }) {
  return (
    <dl className="space-y-1.5 text-sm">
      <div className="flex justify-between gap-3">
        <dt className="text-muted">
          {formatCurrency(price.hourlyRate)}/hr x {formatDuration(price.durationMinutes)}
        </dt>
        <dd className="tabular">{formatCurrency(price.baseAmount)}</dd>
      </div>
      {price.discount && (
        <div className="flex justify-between gap-3 text-ok">
          <dt>{price.discount.label}</dt>
          <dd className="tabular">-{formatCurrency(price.discount.amount)}</dd>
        </div>
      )}
      <div className="flex justify-between gap-3 border-t border-line pt-2 text-base font-semibold">
        <dt>Total</dt>
        <dd className="tabular">{formatCurrency(price.total)}</dd>
      </div>
    </dl>
  )
}
