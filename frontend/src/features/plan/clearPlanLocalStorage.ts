import {
  ELK_GARDEN_STATE_KEY,
  ELK_WEEKLY_TASKS_KEY,
} from '../canvas/gardenStateStorage'
import { ELK_GARDEN_PLAN_KEY } from './elkGardenPlanStorage'
import { ELK_PLAN_TASKS_KEY } from './planTasksStorage'

/** All localStorage keys used by the Plan flow (draft + saved plan + tasks). */
export const PLAN_FLOW_STORAGE_KEYS = [
  ELK_GARDEN_STATE_KEY,
  ELK_GARDEN_PLAN_KEY,
  ELK_PLAN_TASKS_KEY,
  ELK_WEEKLY_TASKS_KEY,
] as const

/** Clears saved draft, saved plan, weekly checkoffs, and plan-derived tasks. */
export function clearPlanFlowLocalStorage(): void {
  try {
    for (const key of PLAN_FLOW_STORAGE_KEYS) {
      localStorage.removeItem(key)
    }
  } catch {
    // ignore
  }
}
