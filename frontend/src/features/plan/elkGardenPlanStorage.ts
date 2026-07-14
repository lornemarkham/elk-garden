import type { GardenPlanResponse } from '@shared/gardenPlanContract'
import { parseStoredLastPlan } from '../canvas/gardenStateStorage'

export const ELK_GARDEN_PLAN_KEY = 'elk_garden_plan'

/** One row in a bed at save time. */
export type PlanRowSnapshot = {
  crop: string
  notes: string
  widthInches: string
}

/** One bed/zone at save time (rows preferred; crops is legacy flat list). */
export type PlanBedSnapshot = {
  name: string
  rows?: PlanRowSnapshot[]
  crops?: string[]
}

/** Inputs at the moment Ask ELK ran — used for transparency and provenance. */
export type PlanInputsSnapshot = {
  crops: string[]
  location: string
  goalLabel: string
  threatLabels: string[]
  bedNames: string[]
  /** Per-bed crop assignments when present. */
  bedGroups?: PlanBedSnapshot[]
  /** Vernon BC timeline was applicable in UI (draft had a location). */
  seasonalRulesShownInUi: boolean
  /** Sparse draft — ELK may infer beyond what you typed. */
  fallbackAssumptionsLikely: boolean
}

export type ElkGardenPlanRecord = {
  savedAt: string
  plan: GardenPlanResponse
  inputsSnapshot?: PlanInputsSnapshot
}

export function loadElkGardenPlan(): ElkGardenPlanRecord | null {
  try {
    const raw = localStorage.getItem(ELK_GARDEN_PLAN_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as unknown
    if (!parsed || typeof parsed !== 'object') return null
    const o = parsed as Record<string, unknown>
    const plan = parseStoredLastPlan(o.plan)
    if (!plan) return null
    const savedAt =
      typeof o.savedAt === 'string' ? o.savedAt : new Date().toISOString()
    const inputsSnapshot = parseInputsSnapshot(o.inputsSnapshot)
    return { savedAt, plan, inputsSnapshot }
  } catch {
    return null
  }
}

function parseInputsSnapshot(v: unknown): PlanInputsSnapshot | undefined {
  if (!v || typeof v !== 'object') return undefined
  const o = v as Record<string, unknown>
  const crops =
    Array.isArray(o.crops) && o.crops.every((x) => typeof x === 'string')
      ? o.crops
      : undefined
  if (crops === undefined) return undefined
  const location = typeof o.location === 'string' ? o.location : ''
  // `bedNames`/`bedGroups` replaced the legacy `areaNames`/`areaGroups` keys when
  // Area was renamed to Bed; fall back so older saved plans still show their snapshot.
  const bedNamesRaw = 'bedNames' in o ? o.bedNames : o.areaNames
  const bedNames =
    Array.isArray(bedNamesRaw) && bedNamesRaw.every((x) => typeof x === 'string')
      ? bedNamesRaw
      : []
  const bedGroupsRaw = 'bedGroups' in o ? o.bedGroups : o.areaGroups
  let bedGroups: PlanBedSnapshot[] | undefined
  if (Array.isArray(bedGroupsRaw)) {
    const g: PlanBedSnapshot[] = []
    for (const row of bedGroupsRaw) {
      if (!row || typeof row !== 'object') continue
      const r = row as Record<string, unknown>
      const name = typeof r.name === 'string' ? r.name : ''
      const cropsLegacy =
        Array.isArray(r.crops) && r.crops.every((x) => typeof x === 'string')
          ? (r.crops as string[])
          : undefined
      let rows: PlanRowSnapshot[] | undefined
      if (Array.isArray(r.rows)) {
        const pr: PlanRowSnapshot[] = []
        for (const item of r.rows) {
          if (!item || typeof item !== 'object') continue
          const x = item as Record<string, unknown>
          pr.push({
            crop: typeof x.crop === 'string' ? x.crop : '',
            notes: typeof x.notes === 'string' ? x.notes : '',
            widthInches:
              typeof x.widthInches === 'string' ? x.widthInches : '',
          })
        }
        if (pr.length > 0) rows = pr
      }
      g.push({
        name,
        rows,
        crops: cropsLegacy,
      })
    }
    if (g.length > 0) bedGroups = g
  }
  const seasonalRulesShownInUi =
    typeof o.seasonalRulesShownInUi === 'boolean'
      ? o.seasonalRulesShownInUi
      : location.trim().length > 0
  const fallbackAssumptionsLikely =
    typeof o.fallbackAssumptionsLikely === 'boolean'
      ? o.fallbackAssumptionsLikely
      : false
  return {
    crops,
    location,
    goalLabel: typeof o.goalLabel === 'string' ? o.goalLabel : '',
    threatLabels:
      Array.isArray(o.threatLabels) &&
      o.threatLabels.every((x) => typeof x === 'string')
        ? o.threatLabels
        : [],
    bedNames,
    bedGroups,
    seasonalRulesShownInUi,
    fallbackAssumptionsLikely,
  }
}

export function saveElkGardenPlanRecord(record: ElkGardenPlanRecord): void {
  try {
    localStorage.setItem(ELK_GARDEN_PLAN_KEY, JSON.stringify(record))
  } catch {
    // ignore
  }
}
