import type { GardenPlanResponse } from '../shared/gardenPlanContract.js'
import type { StoredGardenBed } from '../types/storedGarden.js'
import type { PlanTaskRecord } from '../plan/planTaskTypes.js'
import { generatePlanTasksFromElkPlan } from '../plan/generatePlanTasks.js'

export function generateTasksFromInputs(params: {
  plan: GardenPlanResponse | null
  beds: StoredGardenBed[]
  threats: Record<string, boolean>
  userCrops: string[]
}): PlanTaskRecord[] {
  return generatePlanTasksFromElkPlan(
    params.plan,
    params.beds,
    params.userCrops,
    params.threats,
  )
}
