import clsx from 'clsx'

// ---------------------------------------------------------------------------
// CapacityBar
//
// Visualises current usage against a plan limit.
// Changes colour as usage approaches or exceeds the limit.
//
// Example:
//   <CapacityBar label="Inventory items" current={33} max={50} />
// ---------------------------------------------------------------------------

interface CapacityBarProps {
  label: string
  current: number
  max: number
  /** Unit string appended to the count (default: 'items') */
  unit?: string
  className?: string
}

export function CapacityBar({ label, current, max, unit = 'items', className }: CapacityBarProps) {
  const pct = Math.min((current / max) * 100, 100)
  const isAtLimit = current >= max
  const isNearLimit = pct >= 90 && !isAtLimit

  const barColor = isAtLimit
    ? 'bg-rose-500'
    : isNearLimit
      ? 'bg-amber-400'
      : 'bg-emerald-500'

  const countColor = isAtLimit
    ? 'text-rose-700'
    : isNearLimit
      ? 'text-amber-700'
      : 'text-stone-600'

  return (
    <div className={clsx('flex flex-col gap-1.5', className)}>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[0.72rem] text-stone-500">{label}</span>
        <span className={clsx('text-[0.72rem] font-semibold tabular-nums', countColor)}>
          {current.toLocaleString()}\u00a0/\u00a0{max.toLocaleString()} {unit}
          {isAtLimit ? ' — at limit' : isNearLimit ? ' — almost full' : ''}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-stone-100">
        <div
          className={clsx('h-full rounded-full transition-all duration-500', barColor)}
          style={{ width: `${pct}%` }}
          role="progressbar"
          aria-valuenow={current}
          aria-valuemin={0}
          aria-valuemax={max}
          aria-label={`${label}: ${current} of ${max} ${unit}`}
        />
      </div>
    </div>
  )
}
