import type { StoredGardenArea } from '../canvas/gardenStateStorage'

/** At least one crop OR at least one garden area — enough to request a useful plan. */
export function hasMinimumPlanInput(
  crops: string[],
  areas: StoredGardenArea[],
): boolean {
  return crops.length >= 1 || areas.length >= 1
}

/**
 * True when inputs are barely above the minimum (ELK may infer more detail).
 * Used for transparency only — not for blocking.
 */
export function computeFallbackAssumptionsLikely(
  crops: string[],
  areas: StoredGardenArea[],
  location: string,
): boolean {
  if (location.trim().length > 0) return false
  if (areas.some((ar) => ar.rows.some((row) => row.crop.trim().length > 0)))
    return false
  const c = crops.length
  const a = areas.length
  return (c === 1 && a === 0) || (a === 1 && c === 0)
}
