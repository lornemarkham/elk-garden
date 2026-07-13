export const GARDEN_CAMERAS = [
  { id: 'garden_east', label: 'Garden East' },
  { id: 'garden_west', label: 'Garden West' },
] as const

export type GardenCameraId = (typeof GARDEN_CAMERAS)[number]['id']

/** Tags available in the observation form. */
export const OBSERVATION_TAGS = [
  'watering',
  'growth',
  'pest',
  'animal',
  'harvest',
] as const

export type CameraObservationTag = (typeof OBSERVATION_TAGS)[number]

export const OBSERVATION_TAG_LABEL: Record<CameraObservationTag, string> = {
  watering: 'Watering',
  growth: 'Growth',
  pest: 'Pest',
  animal: 'Animal',
  harvest: 'Harvest',
}

export function gardenCameraLabel(id: GardenCameraId): string {
  return GARDEN_CAMERAS.find((c) => c.id === id)?.label ?? id
}

export function confidenceLabel(pct: number): string {
  if (pct < 34) return 'Low'
  if (pct < 67) return 'Medium'
  return 'High'
}
