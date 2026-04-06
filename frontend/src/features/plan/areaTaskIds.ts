import type { StoredGardenArea } from '../canvas/gardenStateStorage'

/**
 * Map stable task ids from `buildGardenTasksFromState` to an area id when known.
 */
export function areaIdForTask(
  taskId: string,
  areas: StoredGardenArea[],
): string | null {
  const ids = new Set(areas.map((a) => a.id))
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
