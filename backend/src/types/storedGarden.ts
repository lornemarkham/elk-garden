/** Mirrors frontend `gardenStateStorage` types for task generation on the server. */

export type StoredGardenGoal = 'high_yield' | 'easy_care' | 'balanced'

export type StoredSunLevel = 'full_sun' | 'part_sun' | 'shade' | 'unsure'

export interface StoredGardenRow {
  id: string
  crop: string
  widthInches: string
  notes: string
  planted?: boolean
  gardenLog?: string
}

export interface StoredGardenArea {
  id: string
  name: string
  size: string
  sun: StoredSunLevel
  notes: string
  gardenLog?: string
  plannedPlantingDate?: string
  rows: StoredGardenRow[]
}
