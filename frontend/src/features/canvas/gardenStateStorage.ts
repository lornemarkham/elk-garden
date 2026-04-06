import type { GardenPlanResponse } from '@shared/gardenPlanContract'

export const ELK_GARDEN_STATE_KEY = 'elk_garden_state'

/** Legacy mirror of weekly checklist completion; cleared with plan reset. */
export const ELK_WEEKLY_TASKS_KEY = 'elk_weekly_tasks'

export type StoredGardenGoal = 'high_yield' | 'easy_care' | 'balanced'

export type StoredSunLevel = 'full_sun' | 'part_sun' | 'shade' | 'unsure'

/** One row within a bed: crop, width, optional notes (Area → Rows → Crop). */
export interface StoredGardenRow {
  id: string
  crop: string
  /** Row width in inches (optional). */
  widthInches: string
  /** Planning notes (spacing, variety, etc.). */
  notes: string
  /** In-ground / planted — drives Tasks (no repeat “sow” once true). */
  planted?: boolean
  /** Short garden log line (separate from planning notes). */
  gardenLog?: string
}

export interface StoredGardenArea {
  id: string
  name: string
  size: string
  sun: StoredSunLevel
  notes: string
  /** Short garden log for this bed (separate from planning notes). */
  gardenLog?: string
  /** Optional YYYY-MM-DD — when you hope to plant (local date, display-only). */
  plannedPlantingDate?: string
  /** Rows in this bed; legacy saves used flat `crops` only (migrated on load). */
  rows: StoredGardenRow[]
}

export type ElkGardenPersistedState = {
  crops: string[]
  location: string
  threats: Record<string, boolean>
  lastPlan: GardenPlanResponse | null
  completedWeeklyTasks: string[]
  goal: StoredGardenGoal
  areas: StoredGardenArea[]
  /** Which bed was last changed — Plan UI expands this by default on load. */
  lastEditedAreaId?: string
}

const GOALS = new Set<StoredGardenGoal>(['high_yield', 'easy_care', 'balanced'])
const SUN = new Set<StoredSunLevel>(['full_sun', 'part_sun', 'shade', 'unsure'])

function strArr(x: unknown): x is string[] {
  return Array.isArray(x) && x.every((i) => typeof i === 'string')
}

/** Restore saved plans even if an older blob omitted `weekly_plan`. */
export function parseStoredLastPlan(v: unknown): GardenPlanResponse | null {
  if (!v || typeof v !== 'object') return null
  const o = v as Record<string, unknown>
  if (typeof o.plan_summary !== 'string') return null
  if (
    !strArr(o.layout_strategy) ||
    !strArr(o.companion_planting) ||
    !strArr(o.watering_strategy) ||
    !strArr(o.threat_mitigation) ||
    !strArr(o.next_steps)
  ) {
    return null
  }
  const weekly_plan = strArr(o.weekly_plan) ? o.weekly_plan : []
  return {
    plan_summary: o.plan_summary,
    layout_strategy: o.layout_strategy,
    companion_planting: o.companion_planting,
    watering_strategy: o.watering_strategy,
    threat_mitigation: o.threat_mitigation,
    weekly_plan,
    next_steps: o.next_steps,
  }
}

function parseThreats(v: unknown): Record<string, boolean> {
  if (!v || typeof v !== 'object') return {}
  const out: Record<string, boolean> = {}
  for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
    if (typeof val === 'boolean') out[k] = val
  }
  return out
}

function parseGardenRow(
  o: unknown,
  fallbackId: string,
): StoredGardenRow | null {
  if (!o || typeof o !== 'object') return null
  const r = o as Record<string, unknown>
  const id = typeof r.id === 'string' ? r.id : fallbackId
  const planted = typeof r.planted === 'boolean' ? r.planted : false
  return {
    id,
    crop: typeof r.crop === 'string' ? r.crop : '',
    notes: typeof r.notes === 'string' ? r.notes : '',
    widthInches: typeof r.widthInches === 'string' ? r.widthInches : '',
    planted,
    gardenLog: typeof r.gardenLog === 'string' ? r.gardenLog : undefined,
  }
}

function parseAreas(v: unknown): StoredGardenArea[] {
  if (!Array.isArray(v)) return []
  const out: StoredGardenArea[] = []
  for (const row of v) {
    if (!row || typeof row !== 'object') continue
    const r = row as Record<string, unknown>
    if (typeof r.id !== 'string') continue
    const sun = r.sun
    if (typeof sun !== 'string' || !SUN.has(sun as StoredSunLevel)) continue

    let rows: StoredGardenRow[] = []
    if (Array.isArray(r.rows)) {
      let i = 0
      for (const item of r.rows) {
        const pr = parseGardenRow(item, `${r.id}_row_${i}`)
        if (pr) rows.push(pr)
        i += 1
      }
    }
    if (
      rows.length === 0 &&
      Array.isArray(r.crops) &&
      r.crops.every((x) => typeof x === 'string')
    ) {
      const legacy = r.crops as string[]
      rows = legacy.map((crop, i) => ({
        id: `${r.id}_mig_${i}`,
        crop,
        notes: '',
        widthInches: '',
        planted: false,
      }))
    }

    const plannedRaw = r.plannedPlantingDate
    const plannedPlantingDate =
      typeof plannedRaw === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(plannedRaw)
        ? plannedRaw
        : undefined

    out.push({
      id: r.id,
      name: typeof r.name === 'string' ? r.name : '',
      size: typeof r.size === 'string' ? r.size : '',
      sun: sun as StoredSunLevel,
      notes: typeof r.notes === 'string' ? r.notes : '',
      gardenLog:
        typeof r.gardenLog === 'string' ? r.gardenLog : undefined,
      plannedPlantingDate,
      rows,
    })
  }
  return out
}

function loadLegacyWeeklyTasks(): string[] {
  try {
    const raw = localStorage.getItem(ELK_WEEKLY_TASKS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed) || !parsed.every((x) => typeof x === 'string')) {
      return []
    }
    return parsed
  } catch {
    return []
  }
}

function parseCompletedWeekly(v: unknown): string[] | undefined {
  if (!Array.isArray(v)) return undefined
  if (!v.every((x) => typeof x === 'string')) return undefined
  return v
}

export function loadElkGardenState(): ElkGardenPersistedState {
  let rawParsed: unknown = null
  try {
    const raw = localStorage.getItem(ELK_GARDEN_STATE_KEY)
    if (raw) rawParsed = JSON.parse(raw) as unknown
  } catch {
    rawParsed = null
  }

  const base =
    rawParsed && typeof rawParsed === 'object'
      ? (rawParsed as Record<string, unknown>)
      : null

  const crops =
    base &&
    Array.isArray(base.crops) &&
    base.crops.every((c) => typeof c === 'string')
      ? (base.crops as string[])
      : []

  const location =
    base && typeof base.location === 'string' ? base.location : ''

  const threats = base ? parseThreats(base.threats) : {}

  const lastPlan =
    base && base.lastPlan !== undefined && base.lastPlan !== null
      ? parseStoredLastPlan(base.lastPlan)
      : null

  let completedWeeklyTasks: string[] = []
  if (base && 'completedWeeklyTasks' in base) {
    const parsed = parseCompletedWeekly(base.completedWeeklyTasks)
    if (parsed !== undefined) completedWeeklyTasks = parsed
    else completedWeeklyTasks = loadLegacyWeeklyTasks()
  } else {
    completedWeeklyTasks = loadLegacyWeeklyTasks()
  }

  const goalRaw = base?.goal
  const goal: StoredGardenGoal =
    typeof goalRaw === 'string' && GOALS.has(goalRaw as StoredGardenGoal)
      ? (goalRaw as StoredGardenGoal)
      : 'balanced'

  const areas = base ? parseAreas(base.areas) : []

  const lastEditedRaw =
    base && 'lastEditedAreaId' in base
      ? (base as Record<string, unknown>).lastEditedAreaId
      : undefined
  const lastEditedAreaId =
    typeof lastEditedRaw === 'string' ? lastEditedRaw : undefined

  return {
    crops,
    location,
    threats,
    lastPlan,
    completedWeeklyTasks,
    goal,
    areas,
    ...(lastEditedAreaId ? { lastEditedAreaId } : {}),
  }
}

export function saveElkGardenState(state: ElkGardenPersistedState): void {
  try {
    localStorage.setItem(ELK_GARDEN_STATE_KEY, JSON.stringify(state))
    localStorage.setItem(
      ELK_WEEKLY_TASKS_KEY,
      JSON.stringify(state.completedWeeklyTasks),
    )
  } catch {
    // ignore quota / private mode
  }
}
