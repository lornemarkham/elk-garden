/** Clamp to dashboard sunlight range. */
function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, Math.round(n)))
}

/**
 * Adjust zone sunlight from Open-Meteo cloud cover.
 * Low cloud cover raises sunlight %; high cloud cover lowers it.
 */
export function sunlightPctFromCloudCover(baseSunlight: number, cloudCoverPct: number): number {
  const cloud = clamp(cloudCoverPct, 0, 100)
  const delta = Math.round(14 - cloud * 0.42)
  return clamp(baseSunlight + delta, 25, 96)
}
