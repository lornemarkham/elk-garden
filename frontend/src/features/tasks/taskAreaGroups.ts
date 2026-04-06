import type { StoredGardenArea } from '../canvas/gardenStateStorage'
import type { PlanTaskRecord } from '../plan/planTasksStorage'
import { areaIdForTask } from '../plan/areaTaskIds'

export { areaIdForTask } from '../plan/areaTaskIds'

export type AreaTaskGroup = {
  key: string
  areaId: string | null
  areaLabel: string
  tasks: PlanTaskRecord[]
}

/** General / plan-wide tasks first, then areas in plan order. */
export function groupTasksByArea(
  tasks: PlanTaskRecord[],
  areas: StoredGardenArea[],
): AreaTaskGroup[] {
  const general: PlanTaskRecord[] = []
  const perArea = new Map<string, PlanTaskRecord[]>()
  for (const a of areas) perArea.set(a.id, [])

  for (const t of tasks) {
    const aid = areaIdForTask(t.id, areas)
    if (aid === null) {
      general.push(t)
      continue
    }
    const list = perArea.get(aid)
    if (list) list.push(t)
    else general.push(t)
  }

  const out: AreaTaskGroup[] = []
  if (general.length > 0) {
    out.push({
      key: 'general',
      areaId: null,
      areaLabel: 'All garden',
      tasks: general,
    })
  }
  for (const a of areas) {
    const list = perArea.get(a.id) ?? []
    if (list.length === 0) continue
    out.push({
      key: a.id,
      areaId: a.id,
      areaLabel: a.name.trim() || 'Unnamed area',
      tasks: list,
    })
  }
  return out
}
