export function stepReferencesUserCrop(
  step: string,
  userCrops: string[],
): boolean {
  const L = step.toLowerCase()
  return userCrops.some((c) => {
    const n = c.toLowerCase().trim()
    if (n.length < 2) return false
    if (L.includes(n)) return true
    return n.split(/\s+/).some((w) => w.length > 2 && L.includes(w))
  })
}

/** Natural-language list: "a and b" / "a, b, and c". */
export function formatCropList(crops: string[]): string {
  const n = crops.map((c) => c.trim()).filter(Boolean)
  if (n.length === 0) return ''
  if (n.length === 1) return n[0]
  if (n.length === 2) return `${n[0]} and ${n[1]}`
  return `${n.slice(0, -1).join(', ')}, and ${n[n.length - 1]}`
}

const OLD_PREP_TEMPLATE =
  /^Prepare soil and sow or transplant (.+?) when timing matches your garden\.?$/i

/** Merge per-crop lines that share the same template into one line with a crop list. */
function mergeSamePrepTemplateSteps(steps: string[]): string[] {
  const crops: string[] = []
  const rest: string[] = []
  for (const s of steps) {
    const t = s.trim()
    const m = t.match(OLD_PREP_TEMPLATE)
    if (m) crops.push(m[1].trim())
    else rest.push(t)
  }
  const out: string[] = []
  if (crops.length >= 1) {
    out.push(
      `Sow ${formatCropList(crops)} in prepared soil when timing matches your garden.`,
    )
  }
  return [...out, ...rest]
}

/** Keep only lines that mention at least one of the user's crops (strict mode). */
export function filterNextStepsForUserCrops(
  steps: string[],
  userCrops: string[],
): string[] {
  if (userCrops.length === 0) return []
  const seen = new Set<string>()
  const out: string[] = []
  for (const step of steps) {
    const t = step.trim()
    if (!t || seen.has(t)) continue
    if (!stepReferencesUserCrop(t, userCrops)) continue
    seen.add(t)
    out.push(t)
  }
  return mergeSamePrepTemplateSteps(out).slice(0, 5)
}

/** If the model returned no matching lines, build short steps from the user's list only. */
export function buildNextStepsFromUserCropsOnly(
  userCrops: string[],
  _minCount: number,
): string[] {
  const crops = userCrops.map((c) => c.trim()).filter(Boolean)
  if (crops.length === 0) return []

  const list = formatCropList(crops)
  const out: string[] = [
    'Loosen soil in the beds you’ll use and pull any weeds.',
    crops.length === 1
      ? `Sow ${crops[0]} when the soil is workable.`
      : `Sow ${list} when the soil is workable.`,
    'Water lightly after sowing; keep the top inch moist until seeds sprout.',
  ]

  return out.slice(0, 5)
}

export function finalizeNextStepsForDisplay(
  planSteps: string[],
  userCrops: string[],
): string[] {
  const filtered = filterNextStepsForUserCrops(planSteps, userCrops)
  if (filtered.length >= 3) return filtered.slice(0, 5)
  const fallback = buildNextStepsFromUserCropsOnly(userCrops, 3)
  const merged = [...filtered]
  for (const f of fallback) {
    if (merged.length >= 5) break
    if (!merged.includes(f)) merged.push(f)
  }
  return mergeSamePrepTemplateSteps(merged).slice(0, 5)
}
