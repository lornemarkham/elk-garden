import { Sparkles } from 'lucide-react'
import clsx from 'clsx'
import type { PlanId } from '../../lib/capabilities/types'

// ---------------------------------------------------------------------------
// UpgradePrompt
//
// A lightweight inline banner that appears inside an already-visible section
// to surface an upgrade opportunity without hiding content.
//
// Use LockedFeature (via FeatureGate) to *replace* content.
// Use UpgradePrompt to *augment* free content with a gentle suggestion.
//
// Example:
//   <UpgradePrompt
//     feature="AI Recommendations"
//     description="Automatically surface missing items and purchasing suggestions."
//     requiredPlan="grower"
//   />
// ---------------------------------------------------------------------------

const PLAN_LABEL: Record<PlanId, string> = {
  free: 'Free',
  grower: 'Grower',
  operator: 'Operator',
}

interface UpgradePromptProps {
  feature: string
  description?: string
  requiredPlan?: PlanId
  /** Callback wired to a future billing/modal flow */
  onUpgrade?: () => void
  className?: string
}

export function UpgradePrompt({
  feature,
  description,
  requiredPlan = 'grower',
  onUpgrade,
  className,
}: UpgradePromptProps) {
  return (
    <div
      className={clsx(
        'flex items-start gap-3 rounded-2xl bg-gradient-to-br from-emerald-50 to-sky-50 px-4 py-3.5 ring-1 ring-emerald-100',
        className,
      )}
    >
      <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="text-xs font-bold text-stone-900">
          {feature}
          <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-[0.65rem] font-bold text-emerald-800 ring-1 ring-emerald-200">
            {PLAN_LABEL[requiredPlan]}
          </span>
        </p>
        {description ? (
          <p className="mt-0.5 text-xs leading-relaxed text-stone-600">{description}</p>
        ) : null}
      </div>
      <button
        type="button"
        onClick={onUpgrade}
        className="shrink-0 rounded-full bg-white px-3 py-1.5 text-[0.68rem] font-bold text-stone-700 ring-1 ring-stone-200 transition hover:bg-stone-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
      >
        Upgrade →
      </button>
    </div>
  )
}
