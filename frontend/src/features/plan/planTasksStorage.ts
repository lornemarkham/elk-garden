import type { Task } from '../../types/task'

export const ELK_PLAN_TASKS_KEY = 'elk_plan_tasks'

export type TaskSection = 'today' | 'up_next'

export type PlanTaskRecord = Pick<
  Task,
  'id' | 'gardenId' | 'title' | 'supportiveNote' | 'completed'
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
