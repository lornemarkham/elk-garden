import { createContext, useContext, useState, useMemo, type ReactNode } from 'react'
import type { Capabilities, PlanDef, PlanId } from './types'
import { ALL_PLANS, OPERATOR_PLAN, PLAN_MAP } from './plans'

// ---------------------------------------------------------------------------
// Persistence
// ---------------------------------------------------------------------------

const PLAN_STORAGE_KEY = 'elk_plan_v1'

function loadPlanId(): PlanId {
  const raw = localStorage.getItem(PLAN_STORAGE_KEY)
  if (raw && raw in PLAN_MAP) return raw as PlanId
  // Default to operator during prototype so all features are visible.
  // Switch to 'free' when the app goes public.
  return 'operator'
}

function savePlanId(id: PlanId): void {
  localStorage.setItem(PLAN_STORAGE_KEY, id)
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

interface CapabilityContextValue {
  /** Fully resolved capability object for the active plan. */
  capabilities: Capabilities
  /** Metadata for the active plan. */
  currentPlan: PlanDef
  /** All available plans — use to render plan pickers. */
  allPlans: PlanDef[]
  /** Switch to a different plan (persisted to localStorage). */
  setPlan: (id: PlanId) => void
  /**
   * Returns true when `current` has reached or exceeded `max`.
   * Use alongside a CapacityBar to warn the user before they hit the wall.
   */
  isAtLimit: (current: number, max: number) => boolean
  /** True when `current` is within 10% of `max`. */
  isNearLimit: (current: number, max: number) => boolean
}

const CapabilityContext = createContext<CapabilityContextValue | null>(null)

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function CapabilityProvider({ children }: { children: ReactNode }) {
  const [planId, setPlanIdState] = useState<PlanId>(loadPlanId)

  const currentPlan = PLAN_MAP[planId] ?? OPERATOR_PLAN

  const value = useMemo<CapabilityContextValue>(
    () => ({
      capabilities: currentPlan.capabilities,
      currentPlan,
      allPlans: ALL_PLANS,
      setPlan: (id) => {
        savePlanId(id)
        setPlanIdState(id)
      },
      isAtLimit: (current, max) => current >= max,
      isNearLimit: (current, max) => current >= max * 0.9 && current < max,
    }),
    [currentPlan],
  )

  return <CapabilityContext.Provider value={value}>{children}</CapabilityContext.Provider>
}

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

function useCapabilityContext(): CapabilityContextValue {
  const ctx = useContext(CapabilityContext)
  if (!ctx) {
    throw new Error('useCapabilities must be used inside <CapabilityProvider>')
  }
  return ctx
}

/** Returns the full resolved capabilities object for the active plan. */
export function useCapabilities(): Capabilities {
  return useCapabilityContext().capabilities
}

/** Returns the active plan definition. */
export function useCurrentPlan(): PlanDef {
  return useCapabilityContext().currentPlan
}

/** Returns plan control utilities (used by the dev plan switcher). */
export function usePlanControl() {
  const { currentPlan, allPlans, setPlan } = useCapabilityContext()
  return { currentPlan, allPlans, setPlan }
}

/** Convenience: returns { isAtLimit, isNearLimit }. */
export function useCapacityHelpers() {
  const { isAtLimit, isNearLimit } = useCapabilityContext()
  return { isAtLimit, isNearLimit }
}
