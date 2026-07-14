import type { StoredGardenBed } from '../canvas/gardenStateStorage'
import type { PlanTaskRecord } from '../plan/planTasksStorage'
import { bedIdForTask } from '../plan/bedTaskIds'

export { bedIdForTask } from '../plan/bedTaskIds'

export type BedTaskGroup = {
  key: string
  bedId: string | null
  bedLabel: string
  tasks: PlanTaskRecord[]
}

/** General / plan-wide tasks first, then beds in plan order. */
export function groupTasksByBed(
  tasks: PlanTaskRecord[],
  beds: StoredGardenBed[],
): BedTaskGroup[] {
  const general: PlanTaskRecord[] = []
  const perBed = new Map<string, PlanTaskRecord[]>()
  for (const a of beds) perBed.set(a.id, [])

  for (const t of tasks) {
    const aid = bedIdForTask(t.id, beds)
    if (aid === null) {
      general.push(t)
      continue
    }
    const list = perBed.get(aid)
    if (list) list.push(t)
    else general.push(t)
  }

  const out: BedTaskGroup[] = []
  if (general.length > 0) {
    out.push({
      key: 'general',
      bedId: null,
      bedLabel: 'All garden',
      tasks: general,
    })
  }
  for (const a of beds) {
    const list = perBed.get(a.id) ?? []
    if (list.length === 0) continue
    out.push({
      key: a.id,
      bedId: a.id,
      bedLabel: a.name.trim() || 'Unnamed bed',
      tasks: list,
    })
  }
  return out
}
