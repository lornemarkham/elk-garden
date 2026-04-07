import type { GardenPlanResponse } from '../shared/gardenPlanContract.js'
import type { StoredGardenArea } from '../types/storedGarden.js'
import type { PlanTaskRecord } from './planTaskTypes.js'
import { buildGardenTasksFromState } from './gardenTaskBuilder.js'

export { buildGardenTasksFromState } from './gardenTaskBuilder.js'

/** Backwards-compatible name: full task list from plan + beds + threats + crops. */
export function generatePlanTasksFromElkPlan(
  plan: GardenPlanResponse | null,
  areas: StoredGardenArea[],
  userCrops: string[],
  threats: Record<string, boolean>,
): PlanTaskRecord[] {
  return buildGardenTasksFromState({ plan, areas, threats, userCrops })
}
