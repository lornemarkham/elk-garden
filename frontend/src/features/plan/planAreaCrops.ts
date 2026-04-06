import type { StoredGardenArea } from '../canvas/gardenStateStorage'

/** First occurrence wins; trims; case-insensitive duplicate removal. */
export function dedupeCropListPreserveOrder(items: string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const raw of items) {
    const t = raw.trim()
    if (!t) continue
    const k = t.toLowerCase()
    if (seen.has(k)) continue
    seen.add(k)
    out.push(t)
  }
  return out
}

/** All crops the user cares about: global chips plus every crop assigned to a bed (deduped). */
export function unionCropsFromState(
  chips: string[],
  areas: StoredGardenArea[],
): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  const add = (raw: string) => {
    const t = raw.trim()
    if (!t) return
    const key = t.toLowerCase()
    if (seen.has(key)) return
    seen.add(key)
    out.push(t)
  }
  for (const c of chips) add(c)
  for (const a of areas) {
    for (const r of a.rows) add(r.crop)
  }
  return out
}

/** Crops listed globally but not assigned to any area (by case-insensitive match). */
export function globalCropsNotInAnyArea(
  chips: string[],
  areas: StoredGardenArea[],
): string[] {
  const inArea = new Set<string>()
  for (const a of areas) {
    for (const r of a.rows) {
      const t = r.crop.trim()
      if (t) inArea.add(t.toLowerCase())
    }
  }
  return dedupeCropListPreserveOrder(
    chips.filter((c) => {
      const t = c.trim()
      if (!t) return false
      return !inArea.has(t.toLowerCase())
    }),
  )
}
