import type { StoredGardenBed } from '../canvas/gardenStateStorage'

/** At least one crop OR at least one garden bed — enough to request a useful plan. */
export function hasMinimumPlanInput(
  crops: string[],
  beds: StoredGardenBed[],
): boolean {
  return crops.length >= 1 || beds.length >= 1
}

/**
 * True when inputs are barely above the minimum (ELK may infer more detail).
 * Used for transparency only — not for blocking.
 */
export function computeFallbackAssumptionsLikely(
  crops: string[],
  beds: StoredGardenBed[],
  location: string,
): boolean {
  if (location.trim().length > 0) return false
  if (beds.some((ar) => ar.rows.some((row) => row.crop.trim().length > 0)))
    return false
  const c = crops.length
  const a = beds.length
  return (c === 1 && a === 0) || (a === 1 && c === 0)
}
