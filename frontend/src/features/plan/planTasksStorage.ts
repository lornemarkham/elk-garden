import type { Task } from '../../types/task'
import {
  loadTomatoMoistureState,
  TOMATOES_FOLLOW_UP_TASK_ID,
  TOMATOES_WATERING_TASK_ID,
  TOMATOES_ZONE_ID,
} from '../../lib/garden/tomatoMoistureState'

export const ELK_PLAN_TASKS_KEY = 'elk_plan_tasks'

export type TaskSection = 'today' | 'up_next'

export type PlanTaskRecord = Pick<
  Task,
  'id' | 'gardenId' | 'zoneId' | 'title' | 'supportiveNote' | 'completed'
> & {
  /** Which bucket to show in when incomplete. */
  section?: TaskSection
  /** Assistant-style hints (optional; shown muted under the description). */
  why?: string
  watchFor?: string
  doneRight?: string
}

export function loadPlanTasks(): PlanTaskRecord[] {
  try {
    const raw = localStorage.getItem(ELK_PLAN_TASKS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    const out: PlanTaskRecord[] = []
    for (const row of parsed) {
      if (!row || typeof row !== 'object') continue
      const r = row as Record<string, unknown>
      if (typeof r.id !== 'string' || typeof r.title !== 'string') continue
      if (typeof r.gardenId !== 'string') continue
      if (typeof r.completed !== 'boolean') continue
      const sectionRaw = r.section
      const section: TaskSection | undefined =
        sectionRaw === 'today' || sectionRaw === 'up_next'
          ? sectionRaw
          : undefined
      const why = typeof r.why === 'string' ? r.why : undefined
      const watchFor = typeof r.watchFor === 'string' ? r.watchFor : undefined
      const doneRight = typeof r.doneRight === 'string' ? r.doneRight : undefined
      out.push({
        id: r.id,
        gardenId: r.gardenId,
        zoneId: typeof r.zoneId === 'string' ? r.zoneId : undefined,
        title: r.title,
        supportiveNote:
          typeof r.supportiveNote === 'string' ? r.supportiveNote : undefined,
        completed: r.completed,
        section,
        why,
        watchFor,
        doneRight,
      })
    }
    return out
  } catch {
    return []
  }
}

function mentionsTomatoes(input: string): boolean {
  return /\btomato(?:es)?\b/i.test(input)
}

export function hasTomatoesInPlanInput(params: {
  crops: string[]
  beds: Array<{ name?: string; rows?: Array<{ crop?: string }> }>
}): boolean {
  return (
    params.crops.some(mentionsTomatoes) ||
    params.beds.some(
      (bed) =>
        mentionsTomatoes(bed.name ?? '') ||
        bed.rows?.some((row) => mentionsTomatoes(row.crop ?? '')),
    )
  )
}

export function ensureTomatoesDemoTask(
  tasks: PlanTaskRecord[],
  hasTomatoes: boolean,
): PlanTaskRecord[] {
  if (!hasTomatoes) return tasks

  const demoTask: PlanTaskRecord = {
    id: TOMATOES_WATERING_TASK_ID,
    gardenId: 'garden_elk_home',
    zoneId: TOMATOES_ZONE_ID,
    title: 'Deep water tomatoes',
    supportiveNote: 'Aim for the base of the plant, not the leaves.',
    completed: false,
    section: 'today',
    why: 'Tomatoes are starting dry, so one deep soak helps reset moisture.',
    doneRight: 'The soil feels evenly damp around the base, not the leaves.',
  }

  const followUpTask: PlanTaskRecord = {
    id: TOMATOES_FOLLOW_UP_TASK_ID,
    gardenId: 'garden_elk_home',
    zoneId: TOMATOES_ZONE_ID,
    title: 'Check tomato soil tomorrow morning',
    supportiveNote: 'Make sure the soil settled into a steady range.',
    completed: false,
    section: 'up_next',
    why: 'A quick follow-up confirms the deep watering helped.',
    doneRight: 'The top inch is not bone dry and the bed is not soggy.',
  }

  const tomatoState = loadTomatoMoistureState()
  const existingFollowUp = tasks.find((t) => t.id === followUpTask.id)
  const rest = tasks.filter(
    (t) => t.id !== demoTask.id && t.id !== followUpTask.id,
  )

  // Demo/local signal loop: Tomatoes dry → task → completion updates moisture.
  if (tomatoState.moistureStatus === 'dry') {
    return [
      { ...demoTask, completed: false },
      ...rest,
    ]
  }

  const out = [...rest]
  if (tomatoState.needsFollowUpCheck) {
    out.unshift({
      ...followUpTask,
      completed: existingFollowUp?.completed ?? followUpTask.completed,
    })
  }
  return out
}

export function savePlanTasks(tasks: PlanTaskRecord[]): void {
  try {
    localStorage.setItem(ELK_PLAN_TASKS_KEY, JSON.stringify(tasks))
  } catch {
    // ignore
  }
}

export function togglePlanTask(
  tasks: PlanTaskRecord[],
  taskId: string,
): PlanTaskRecord[] {
  return tasks.map((t) =>
    t.id === taskId ? { ...t, completed: !t.completed } : t,
  )
}

/** Preserve completion flags when regenerating tasks from the same garden. */
export function mergePlanTaskCompletions(
  generated: PlanTaskRecord[],
  previous: PlanTaskRecord[],
): PlanTaskRecord[] {
  const prev = new Map(previous.map((t) => [t.id, t]))
  return generated.map((g) => {
    const was = prev.get(g.id)
    return {
      ...g,
      completed: was?.completed ?? g.completed,
    }
  })
}
