import type { StoredGardenArea } from '../types/storedGarden.js'
import { bucketForCrop } from './plantingTimelineVernon.js'

export type GardenAreaStatus =
  | 'not_started'
  | 'ready_to_plant'
  | 'fully_planted'
  | 'growing'

/** Fine-grained timing for recommendations and task ordering. */
export type RecommendedTimingKind =
  | 'not_started'
  | 'good_now'
  | 'best_2_3_weeks'
  | 'too_early_wait'
  | 'wait_warm_soil'
  | 'fully_planted'
  | 'growing'

export type AreaTimingDisplay = {
  status: GardenAreaStatus
  statusLabel: string
  /** Short “when to act” line — same as recommended timing message. */
  timingHint: string
}

const RECOMMENDED_LABEL: Record<RecommendedTimingKind, string> = {
  not_started: 'Add crops to rows first',
  good_now: 'Good to plant now',
  best_2_3_weeks: 'Best in the next 2–3 weeks',
  too_early_wait: 'Too early — wait ~2 weeks',
  wait_warm_soil: 'Wait for warm soil first',
  fully_planted: 'All rows planted — keep soil moist while things settle in',
  growing: 'Growing — keep watering and watching',
}

function rowsWithCrop(area: StoredGardenArea) {
  return area.rows.filter((r) => r.crop.trim().length > 0)
}

/** Public: use for headers and Tasks. */
export function recommendedTimingKind(
  area: StoredGardenArea,
): RecommendedTimingKind {
  const withCrop = rowsWithCrop(area)
  if (withCrop.length === 0) return 'not_started'
  const unplanted = withCrop.filter((r) => !r.planted)
  if (unplanted.length > 0) {
    const buckets = unplanted.map((r) => bucketForCrop(r.crop))
    if (buckets.some((b) => b === 'warm')) return 'wait_warm_soil'
    if (buckets.some((b) => b === 'later')) return 'too_early_wait'
    if (buckets.every((b) => b === 'now')) return 'good_now'
    return 'best_2_3_weeks'
  }
  const buckets = withCrop.map((r) => bucketForCrop(r.crop))
  if (buckets.some((b) => b === 'warm' || b === 'later')) return 'growing'
  return 'fully_planted'
}

export function recommendedTimingLabel(area: StoredGardenArea): string {
  return RECOMMENDED_LABEL[recommendedTimingKind(area)]
}

function parseLocalISODate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function startOfTodayLocal(): Date {
  const t = new Date()
  return new Date(t.getFullYear(), t.getMonth(), t.getDate())
}

/** Whole days from today to the planned local date (can be negative). */
export function daysFromTodayToPlanned(iso: string): number {
  const target = parseLocalISODate(iso)
  const today = startOfTodayLocal()
  return Math.round(
    (target.getTime() - today.getTime()) / (24 * 60 * 60 * 1000),
  )
}

function windowDaysForKind(kind: RecommendedTimingKind): {
  min: number
  max: number
} {
  switch (kind) {
    case 'good_now':
      return { min: -3, max: 14 }
    case 'best_2_3_weeks':
      return { min: 0, max: 21 }
    case 'too_early_wait':
      return { min: 10, max: 56 }
    case 'wait_warm_soil':
      return { min: 18, max: 90 }
    default:
      return { min: -9999, max: 9999 }
  }
}

export type PlannedAlignment = 'on_track' | 'early' | 'late'

export function plannedAlignment(
  area: StoredGardenArea,
): PlannedAlignment | null {
  const raw = area.plannedPlantingDate
  if (!raw || !/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null
  if (computeAreaTimingDisplay(area).status !== 'ready_to_plant') return null
  const kind = recommendedTimingKind(area)
  const w = windowDaysForKind(kind)
  const delta = daysFromTodayToPlanned(raw)
  if (delta < w.min) return 'early'
  if (delta > w.max) return 'late'
  return 'on_track'
}

export function plannedAlignmentBadgeClass(
  alignment: PlannedAlignment,
): string {
  switch (alignment) {
    case 'on_track':
      return 'bg-emerald-50 text-emerald-950 ring-emerald-200/80'
    case 'early':
      return 'bg-amber-50 text-amber-950 ring-amber-200/80'
    case 'late':
      return 'bg-rose-50 text-rose-950 ring-rose-200/80'
  }
}

/** e.g. "Apr 20" */
export function formatPlannedDateShort(
  iso: string,
  locale: string = 'en-US',
): string {
  const d = parseLocalISODate(iso)
  return d.toLocaleDateString(locale, { month: 'short', day: 'numeric' })
}

/**
 * Derived from row crops, planted flags, and simple crop timing buckets.
 * No persisted schedule — optional planned date is display + alignment only.
 */
export function computeAreaTimingDisplay(
  area: StoredGardenArea,
): AreaTimingDisplay {
  const withCrop = rowsWithCrop(area)
  if (withCrop.length === 0) {
    return {
      status: 'not_started',
      statusLabel: 'Not started',
      timingHint: recommendedTimingLabel(area),
    }
  }

  const unplanted = withCrop.filter((r) => !r.planted)
  if (unplanted.length > 0) {
    return {
      status: 'ready_to_plant',
      statusLabel: 'Ready to plant',
      timingHint: recommendedTimingLabel(area),
    }
  }

  const buckets = withCrop.map((r) => bucketForCrop(r.crop))
  const hasWarmOrLater = buckets.some((b) => b === 'warm' || b === 'later')
  if (hasWarmOrLater) {
    return {
      status: 'growing',
      statusLabel: 'Growing',
      timingHint: recommendedTimingLabel(area),
    }
  }

  return {
    status: 'fully_planted',
    statusLabel: 'All rows planted',
    timingHint: recommendedTimingLabel(area),
  }
}

/** Lower = sort earlier in Today / Up Next. */
export function taskSortPriorityForArea(area: StoredGardenArea): number {
  const d = computeAreaTimingDisplay(area)
  if (d.status === 'fully_planted') return 0
  if (d.status === 'ready_to_plant') {
    const k = recommendedTimingKind(area)
    if (k === 'good_now') return 0
    if (k === 'best_2_3_weeks') return 1
    if (k === 'too_early_wait' || k === 'wait_warm_soil') return 6
    return 3
  }
  if (d.status === 'growing') return 2
  if (d.status === 'not_started') return 5
  return 4
}

export function areaStatusBadgeClass(status: GardenAreaStatus): string {
  switch (status) {
    case 'not_started':
      return 'bg-stone-100 text-stone-700 ring-stone-200/90'
    case 'ready_to_plant':
      return 'bg-amber-50 text-amber-950 ring-amber-200/80'
    case 'fully_planted':
      return 'bg-emerald-50 text-emerald-950 ring-emerald-200/80'
    case 'growing':
      return 'bg-teal-50 text-teal-950 ring-teal-200/80'
    default:
      return 'bg-stone-100 text-stone-700 ring-stone-200/90'
  }
}
