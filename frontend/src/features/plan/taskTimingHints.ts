import type { TimelineBucketId } from './plantingTimelineVernon'
import { bucketForCrop } from './plantingTimelineVernon'

/** Join base note + timing / “why” lines for task supportive notes. */
export function appendTimingLine(
  base: string | undefined,
  timing: string,
): string {
  const b = base?.trim()
  if (!b) return timing
  return `${b}\n\n${timing}`
}

export function plantingTimingHintForCrops(crops: string[]): string {
  const buckets = crops.map(bucketForCrop).filter(Boolean) as TimelineBucketId[]
  if (buckets.length === 0) return 'This week — check your seed packet for exact timing'

  if (buckets.every((b) => b === 'now')) return 'Do this today — safe to plant now'
  if (buckets.every((b) => b === 'now' || b === 'soon'))
    return 'This week — window is open'
  if (buckets.some((b) => b === 'warm'))
    return 'In the next few weeks — wait for steady warm weather for heat lovers'
  if (buckets.some((b) => b === 'later'))
    return 'This week or next — still early for some crops here'
  return 'This week — good time to plant'
}

export function waterTimingHint(): string {
  return 'In the next few days — keep soil evenly moist (do this today if top inch is dry)'
}

export function prepTimingHint(): string {
  return 'This week — do before you sow or transplant'
}

export function peaSupportTimingHint(): string {
  return 'This week — add once vines are a few inches tall'
}

/** Early growth — checking for germination. */
export function earlyGrowthTimingHint(): string {
  return 'This week — sprouts often take 7–14 days'
}

/** Mid growth — spacing / thinning. */
export function midGrowthTimingHint(): string {
  return 'This week — catch crowding early'
}

/** Occasional “why” for thinning tasks — not every task uses this. */
export function whyThinSpacing(): string {
  return 'Why: thinning crowded rows gives roots and leaves room to grow.'
}

export function withPlantTiming(
  baseNote: string | undefined,
  crops: string[],
): string {
  return appendTimingLine(baseNote, plantingTimingHintForCrops(crops))
}

export function withWaterTiming(baseNote: string | undefined): string {
  return appendTimingLine(baseNote, waterTimingHint())
}

export function withPrepTiming(baseNote: string | undefined): string {
  return appendTimingLine(baseNote, prepTimingHint())
}
