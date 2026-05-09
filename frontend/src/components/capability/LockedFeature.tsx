import { Lock } from 'lucide-react'
import clsx from 'clsx'
import type { PlanId } from '../../lib/capabilities/types'

// ---------------------------------------------------------------------------
// Plan display helpers
// ---------------------------------------------------------------------------

const PLAN_LABELS: Record<PlanId, string> = {
  free: 'Free',
  grower: 'Grower',
  operator: 'Operator',
}

const PLAN_ACCENT: Record<PlanId, string> = {
  free: 'text-stone-700',
  grower: 'text-emerald-800',
  operator: 'text-sky-800',
}

const PLAN_BADGE: Record<PlanId, string> = {
  free: 'bg-stone-100 ring-stone-200',
  grower: 'bg-emerald-50 ring-emerald-200',
  operator: 'bg-sky-50 ring-sky-200',
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface LockedFeatureProps {
  /** Short name of the feature shown as the heading */
  feature: string
  /** One or two sentences explaining what this feature does */
  description?: string
  /** Minimum plan required — drives the badge and CTA label */
  requiredPlan?: PlanId
  /** Replace the default lock icon with a custom node */
  icon?: React.ReactNode
  /** Compact single-row variant for inline use */
  compact?: boolean
  /** Optional custom CTA handler — no-op placeholder by default */
  onUpgrade?: () => void
}

export function LockedFeature({
  feature,
  description,
  requiredPlan = 'grower',
  icon,
  compact = false,
  onUpgrade,
}: LockedFeatureProps) {
  if (compact) {
    return (
      <div className="flex items-center gap-3 rounded-2xl bg-stone-50 px-4 py-3 ring-1 ring-stone-200">
        <Lock className="h-4 w-4 shrink-0 text-stone-400" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <span className="text-sm font-semibold text-stone-700">{feature}</span>
          {description ? (
            <span className="ml-2 text-xs text-stone-500">{description}</span>
          ) : null}
        </div>
        <UpgradeBadge planId={requiredPlan} onUpgrade={onUpgrade} />
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-4 rounded-2xl bg-stone-50 px-6 py-8 text-center ring-1 ring-stone-200">
      <span
        className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white ring-1 ring-stone-200 shadow-sm"
        aria-hidden="true"
      >
        {icon ?? <Lock className="h-5 w-5 text-stone-400" />}
      </span>

      <div className="max-w-xs">
        <p className="text-sm font-bold text-stone-900">{feature}</p>
        {description ? (
          <p className="mt-1.5 text-xs leading-relaxed text-stone-500">{description}</p>
        ) : null}
      </div>

      <div className="flex flex-col items-center gap-2">
        <span
          className={clsx(
            'rounded-full px-3 py-1 text-[0.68rem] font-bold ring-1',
            PLAN_BADGE[requiredPlan],
            PLAN_ACCENT[requiredPlan],
          )}
        >
          {PLAN_LABELS[requiredPlan]} feature
        </span>
        <button
          type="button"
          onClick={onUpgrade}
          className="text-xs font-semibold text-stone-500 underline underline-offset-2 hover:text-stone-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 rounded"
        >
          Learn about {PLAN_LABELS[requiredPlan]} →
        </button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Internal badge used by the compact variant
// ---------------------------------------------------------------------------

function UpgradeBadge({ planId, onUpgrade }: { planId: PlanId; onUpgrade?: () => void }) {
  return (
    <button
      type="button"
      onClick={onUpgrade}
      className={clsx(
        'shrink-0 rounded-full px-2.5 py-1 text-[0.65rem] font-bold ring-1 transition',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600',
        PLAN_BADGE[planId],
        PLAN_ACCENT[planId],
        'hover:opacity-80',
      )}
    >
      {PLAN_LABELS[planId]} ↑
    </button>
  )
}
