import type { StoredGardenBed } from '../types/storedGarden.js'

/**
 * Map stable task ids from `buildGardenTasksFromState` to an bed id when known.
 */
export function bedIdForTask(
  taskId: string,
  beds: StoredGardenBed[],
): string | null {
  const ids = new Set(beds.map((a) => a.id))
  const prefixes = [
    'water_planted_',
    'prep_soil_',
    'wait_plant_',
    'thin_spacing_',
    'check_growth_',
    'pea_support_',
    'chip_group_greens_',
    'chip_group_warm_',
    'threat_insects_',
    'threat_heat_',
    'threat_dry_',
    'plant_',
  ] as const
  for (const p of prefixes) {
    if (taskId.startsWith(p)) {
      const rest = taskId.slice(p.length)
      if (rest && ids.has(rest)) return rest
      return null
    }
  }
  return null
}
