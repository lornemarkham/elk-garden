import type { ReactNode } from 'react'
import type { PlanId } from '../../lib/capabilities/types'
import { LockedFeature } from './LockedFeature'

// ---------------------------------------------------------------------------
// FeatureGate
//
// Usage:
//   const caps = useCapabilities()
//   <FeatureGate
//     enabled={caps.inventory.advancedBudgeting}
//     feature="Phase Readiness Budget"
//     description="See per-phase cost breakdowns and owned vs. needed lists."
//     requiredPlan="grower"
//   >
//     <PhaseReadinessBudgetSection />
//   </FeatureGate>
//
// Rules:
//   - Pass a pre-evaluated boolean, never a plan ID or user role.
//   - The fallback defaults to <LockedFeature /> — override if needed.
//   - Never import PlanId comparisons outside of plans.ts and LockedFeature.
// ---------------------------------------------------------------------------

interface FeatureGateProps {
  /** Pre-evaluated capability boolean from useCapabilities(). */
  enabled: boolean
  /** Feature name passed to the default LockedFeature fallback. */
  feature: string
  /** Feature description passed to the default LockedFeature fallback. */
  description?: string
  /** Minimum plan that enables this feature — for the upgrade CTA. */
  requiredPlan?: PlanId
  /** Replace the default locked UI with a custom fallback. */
  fallback?: ReactNode
  /** Use the compact single-row locked state. */
  compact?: boolean
  children: ReactNode
}

export function FeatureGate({
  enabled,
  feature,
  description,
  requiredPlan = 'grower',
  fallback,
  compact = false,
  children,
}: FeatureGateProps) {
  if (enabled) return <>{children}</>

  return (
    <>
      {fallback ?? (
        <LockedFeature
          feature={feature}
          description={description}
          requiredPlan={requiredPlan}
          compact={compact}
        />
      )}
    </>
  )
}
