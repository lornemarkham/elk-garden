import type { GardenPlanResponse } from '../shared/gardenPlanContract.js'
import type { StoredGardenArea } from '../types/storedGarden.js'
import type { PlanTaskRecord, TaskSection } from './planTaskTypes.js'
import { areaIdForTask } from './areaTaskIds'
import {
  computeAreaTimingDisplay,
  recommendedTimingKind,
  taskSortPriorityForArea,
} from './areaTimingStatus'
import { THREATS } from './planConstants'
import { filterNextStepsForUserCrops } from './planNextStepsFilter'
import { bucketForCrop } from './plantingTimelineVernon'
import {
  appendTimingLine,
  earlyGrowthTimingHint,
  midGrowthTimingHint,
  peaSupportTimingHint,
  whyThinSpacing,
  withPlantTiming,
  withPrepTiming,
  withWaterTiming,
} from './taskTimingHints'
import { guidanceForTaskId } from './taskGuidance'

const GARDEN_ID = 'garden_elk_home'

function slugPart(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40)
}

function dedupeCropsCaseInsensitive(crops: string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const c of crops) {
    const t = c.trim()
    if (!t) continue
    const k = t.toLowerCase()
    if (seen.has(k)) continue
    seen.add(k)
    out.push(t)
  }
  return out
}

/** 1-based row numbers for display, e.g. "Row 2" or "Rows 1–3" or "Rows 1, 4". */
function formatRowLabel(zeroBasedIndices: number[]): string {
  if (zeroBasedIndices.length === 0) return ''
  const nums = [...new Set(zeroBasedIndices.map((i) => i + 1))].sort(
    (a, b) => a - b,
  )
  if (nums.length === 1) return `Row ${nums[0]}`
  if (nums.length === 2) return `Rows ${nums[0]} and ${nums[1]}`
  let consecutive = true
  for (let i = 1; i < nums.length; i++) {
    if (nums[i] !== nums[i - 1] + 1) {
      consecutive = false
      break
    }
  }
  if (consecutive) {
    return `Rows ${nums[0]}–${nums[nums.length - 1]}`
  }
  return `Rows ${nums.join(', ')}`
}

function joinCropsNatural(crops: string[]): string {
  const u = dedupeCropsCaseInsensitive(crops)
  if (u.length === 0) return ''
  if (u.length === 1) return u[0]
  if (u.length === 2) return `${u[0]} and ${u[1]}`
  return `${u.slice(0, -1).join(', ')}, and ${u[u.length - 1]}`
}

function needsPeaSupport(crops: string[]): boolean {
  return crops.some((c) => /\bpea(s)?\b/i.test(c.trim()))
}

/** Simple rule: crops often sown dense and thinned later. */
function cropSuggestsThinning(crop: string): boolean {
  return /\b(carrot|beet|beets|radish|lettuce|spinach|kale|chard|arugula|mustard|turnip|parsnip|broccoli|greens|mesclun|kohlrabi)\b/i.test(
    crop.trim(),
  )
}

type Draft = {
  id: string
  section: TaskSection
  title: string
  supportiveNote?: string
}

/**
 * Context-aware, grouped garden tasks tied to garden areas and rows.
 * IDs stay stable per area for grouped actions (completions survive regeneration).
 */
export function buildGardenTasksFromState(params: {
  plan: GardenPlanResponse | null
  areas: StoredGardenArea[]
  threats: Record<string, boolean>
  userCrops: string[]
}): PlanTaskRecord[] {
  const { plan, areas, threats, userCrops } = params
  const drafts: Draft[] = []
  const titleSeen = new Set<string>()

  const add = (
    section: TaskSection,
    id: string,
    title: string,
    supportiveNote?: string,
  ) => {
    const t = title.trim()
    if (!t) return
    const k = t.toLowerCase()
    if (titleSeen.has(k)) return
    titleSeen.add(k)
    drafts.push({ id, section, title: t, supportiveNote })
  }

  const hasRowCrop = areas.some((a) =>
    a.rows.some((r) => r.crop.trim().length > 0),
  )

  const firstNamedArea = areas.find((x) =>
    x.rows.some((r) => r.crop.trim()),
  )
  const firstAreaLabel = firstNamedArea?.name.trim() || ''

  for (const a of areas) {
    const areaLabel = a.name.trim() || 'this area'
    const rowsWithCrop: {
      idx: number
      rowId: string
      crop: string
      planted: boolean
    }[] = []
    for (let i = 0; i < a.rows.length; i++) {
      const gr = a.rows[i]
      const crop = gr.crop.trim()
      if (!crop) continue
      rowsWithCrop.push({
        idx: i,
        rowId: gr.id,
        crop,
        planted: !!gr.planted,
      })
    }

    const unplanted = rowsWithCrop.filter((r) => !r.planted)
    const planted = rowsWithCrop.filter((r) => r.planted)

    if (unplanted.length > 0) {
      const crops = unplanted.map((r) => r.crop)
      const indices = unplanted.map((r) => r.idx)
      const rowTag = formatRowLabel(indices)
      const cropStr = joinCropsNatural(crops)
      const timingKind = recommendedTimingKind(a)
      const deferPlanting =
        timingKind === 'too_early_wait' || timingKind === 'wait_warm_soil'
      if (!deferPlanting) {
        add(
          'today',
          `plant_${a.id}`,
          unplanted.length === 1
            ? `Plant ${cropStr} — ${areaLabel}, ${rowTag}`
            : `Plant ${cropStr} — ${areaLabel} (${rowTag})`,
          withPlantTiming(
            'Depth and spacing: follow your seed packet.',
            crops,
          ),
        )
      } else {
        add(
          'up_next',
          `wait_plant_${a.id}`,
          `Hold off planting ${areaLabel} — still early for these crops`,
          'Prep soil if you like — sow when the timing window opens.',
        )
      }
      add(
        'up_next',
        `prep_soil_${a.id}`,
        unplanted.length === 1
          ? `Prep soil — ${areaLabel}, ${rowTag}`
          : `Prep soil — ${areaLabel} (${rowTag})`,
        withPrepTiming(
          'Weed, loosen the top few inches, clear debris.',
        ),
      )
    }

    if (planted.length > 0) {
      const crops = planted.map((r) => r.crop)
      const indices = planted.map((r) => r.idx)
      const rowTag = formatRowLabel(indices)
      const cropStr = joinCropsNatural(crops)
      const waterNote = appendTimingLine(
        withWaterTiming(
          'Light, even water — don’t wash seeds away.',
        ),
        'Newly planted — keep soil moist for the next few days.',
      )
      add(
        'today',
        `water_planted_${a.id}`,
        planted.length === 1
          ? `Water ${rowTag} in ${areaLabel} — ${cropStr}`
          : `Water ${rowTag} in ${areaLabel} — ${cropStr}`,
        waterNote,
      )
      const growthEarlyNote = appendTimingLine(
        earlyGrowthTimingHint(),
        'Sprouts may take 7–14 days depending on crop and weather.',
      )
      add(
        'up_next',
        `check_growth_${a.id}`,
        planted.length === 1
          ? `Watch for sprouts — ${cropStr}, ${rowTag} in ${areaLabel}`
          : `Watch for sprouts — ${rowTag} in ${areaLabel} (${cropStr})`,
        growthEarlyNote,
      )
      const wantsThin =
        planted.length >= 2 ||
        planted.some((r) => cropSuggestsThinning(r.crop))
      if (wantsThin) {
        add(
          'up_next',
          `thin_spacing_${a.id}`,
          planted.length === 1
            ? `Thin or space ${cropStr} in ${areaLabel} if crowded`
            : `Check spacing in ${areaLabel} (${rowTag}) — thin if crowded`,
          appendTimingLine(midGrowthTimingHint(), whyThinSpacing()),
        )
      }
    }

    if (needsPeaSupport(rowsWithCrop.map((r) => r.crop))) {
      add(
        'up_next',
        `pea_support_${a.id}`,
        `Add pea supports in ${areaLabel} when vines need them`,
        peaSupportTimingHint(),
      )
    }
  }

  const activeThreats = THREATS.filter((t) => threats[t.id])
  const placeHint = firstAreaLabel || 'your garden areas'

  if (hasRowCrop) {
    const wantsDeer = activeThreats.some((t) => t.id === 'deer')
    const wantsRabbit = activeThreats.some((t) => t.id === 'rabbits')
    if (wantsDeer || wantsRabbit) {
      add(
        'today',
        'threat_wildlife_garden',
        wantsDeer && wantsRabbit
          ? `Walk ${placeHint} — scan for deer or rabbit sign`
          : wantsDeer
            ? `Check ${placeHint} for deer — tracks, browse, fence gaps`
            : `Check ${placeHint} for rabbit damage on low stems and seedlings`,
        'Do this today — early catches problems.',
      )
    }
    if (activeThreats.some((t) => t.id === 'insects')) {
      add(
        'up_next',
        `threat_insects_${firstNamedArea?.id ?? 'garden'}`,
        `Scan leaves in ${placeHint} for insect damage`,
        'This week — catch issues before they spread.',
      )
    }
    if (activeThreats.some((t) => t.id === 'heat')) {
      add(
        'up_next',
        `threat_heat_${firstNamedArea?.id ?? 'garden'}`,
        `On hot afternoons, check ${placeHint} for wilting`,
        'This week — water stressed plants first.',
      )
    }
    if (activeThreats.some((t) => t.id === 'dry_soil')) {
      add(
        'today',
        `threat_dry_${firstNamedArea?.id ?? 'garden'}`,
        `Check soil moisture in ${placeHint} before watering`,
        appendTimingLine(
          'Do this today — avoid guessing from the surface alone.',
          'Dig down an inch — dry on top can still be moist below.',
        ),
      )
    }
  }

  if (plan) {
    let pi = 0
    for (const line of [
      ...filterNextStepsForUserCrops(plan.next_steps, userCrops),
      ...filterNextStepsForUserCrops(plan.weekly_plan, userCrops),
    ]) {
      const t = line.trim()
      if (!t) continue
      add('up_next', `plan_${pi}_${slugPart(t)}`, t)
      pi += 1
      if (pi > 6) break
    }
  }

  if (!hasRowCrop) {
    const greens = areas.find((a) => /green|salad|lettuce/i.test(a.name))
    const warm = areas.find((a) => /tomato|pepper|warm|sun|south/i.test(a.name))
    const chipCrops = dedupeCropsCaseInsensitive(userCrops)
    const forGreens = chipCrops.filter((c) => {
      const b = bucketForCrop(c)
      return greens && b !== 'warm' && b !== 'later'
    })
    const forWarm = chipCrops.filter((c) => {
      const b = bucketForCrop(c)
      return warm && (b === 'warm' || b === 'later')
    })
    if (forGreens.length > 0 && greens) {
      const greensLabel = greens.name.trim() || 'your greens area'
      add(
        'up_next',
        `chip_group_greens_${greens.id}`,
        forGreens.length === 1
          ? `Sow ${forGreens[0]} in ${greensLabel} — this week when ready`
          : `Sow ${joinCropsNatural(forGreens)} in ${greensLabel} — this week when ready`,
        withPlantTiming('Match timing to weather and soil.', forGreens),
      )
    }
    if (forWarm.length > 0 && warm) {
      const warmLabel = warm.name.trim() || 'your warm-season area'
      add(
        'up_next',
        `chip_group_warm_${warm.id}`,
        forWarm.length === 1
          ? `Plan ${forWarm[0]} for ${warmLabel} — after frost risk drops`
          : `Plan ${joinCropsNatural(forWarm)} for ${warmLabel} — after frost risk drops`,
        withPlantTiming('Heat lovers need warm soil — watch the forecast.', forWarm),
      )
    }
  }

  const hasGardenContext =
    areas.length > 0 || userCrops.some((c) => c.trim()) || !!plan

  const todayCount = () => drafts.filter((d) => d.section === 'today').length

  const ensureTodayFeelsUseful = () => {
    if (!hasGardenContext) return
    let n = todayCount()
    if (n >= 2) return

    const fillers: Array<{
      id: string
      title: string
      supportiveNote?: string
    }> = [
      {
        id: 'daily_moisture_rows',
        title: hasRowCrop
          ? 'Before watering — check moisture in newly planted rows'
          : 'Check soil moisture where you’ll plant soon',
        supportiveNote: 'Do this today — poke down an inch before you soak.',
      },
      {
        id: 'daily_garden_walk',
        title: 'Walk the garden — scan for pests, damage, and dry spots',
        supportiveNote: 'Do this today — five minutes beats a surprise later.',
      },
      {
        id: 'daily_review_planted',
        title: 'Review planted rows — water or supports needed?',
        supportiveNote: 'This week — quick pass keeps small issues small.',
      },
    ]

    for (const f of fillers) {
      if (todayCount() >= 2) break
      add('today', f.id, f.title, f.supportiveNote)
    }
  }

  ensureTodayFeelsUseful()

  if (todayCount() === 0 && hasGardenContext) {
    add(
      'today',
      'daily_fallback',
      'Today: quick garden pass — moisture, pests, what’s new',
      'Do this today — even a short look counts.',
    )
  }

  function sortKeyForDraft(d: Draft): number {
    const aid = areaIdForTask(d.id, areas)
    if (!aid) {
      if (
        d.id === 'daily_moisture_rows' &&
        areas.some(
          (a) => computeAreaTimingDisplay(a).status === 'fully_planted',
        )
      ) {
        return -2
      }
      return 40
    }
    const area = areas.find((x) => x.id === aid)
    if (!area) return 40
    return taskSortPriorityForArea(area)
  }

  drafts.sort((a, b) => {
    const sa = a.section === 'today' ? 0 : 1
    const sb = b.section === 'today' ? 0 : 1
    if (sa !== sb) return sa - sb
    return sortKeyForDraft(a) - sortKeyForDraft(b)
  })

  return drafts.slice(0, 30).map((d) => ({
    id: d.id,
    gardenId: GARDEN_ID,
    title: d.title,
    supportiveNote: d.supportiveNote,
    completed: false,
    section: d.section,
    ...guidanceForTaskId(d.id),
  }))
}
