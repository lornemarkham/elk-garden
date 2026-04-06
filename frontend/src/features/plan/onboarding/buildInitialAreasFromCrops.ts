import type {
  StoredGardenArea,
  StoredGardenRow,
} from '../../canvas/gardenStateStorage'
import { dedupeCropListPreserveOrder } from '../planAreaCrops'
import { bucketForCrop } from '../plantingTimelineVernon'

function newAreaId() {
  return `area_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

function newRowId() {
  return `row_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

function rowFromCrop(crop: string): StoredGardenRow {
  return {
    id: newRowId(),
    crop,
    widthInches: '',
    notes: '',
    planted: false,
  }
}

/**
 * Seed garden areas + one row per crop for first-time onboarding.
 * Splits warm-season vs cool-season when both are present.
 */
export function buildInitialAreasFromCrops(crops: string[]): StoredGardenArea[] {
  const list = dedupeCropListPreserveOrder(crops).filter((c) => c.trim())
  if (list.length === 0) {
    return [
      {
        id: newAreaId(),
        name: 'Garden area',
        size: '',
        sun: 'unsure',
        notes: '',
        rows: [],
      },
    ]
  }

  const cool: string[] = []
  const warm: string[] = []
  for (const c of list) {
    const b = bucketForCrop(c)
    if (b === 'warm' || b === 'later') warm.push(c)
    else cool.push(c)
  }

  const areas: StoredGardenArea[] = []

  if (cool.length > 0) {
    areas.push({
      id: newAreaId(),
      name: 'Cool-season area',
      size: '4 × 8 ft',
      sun: 'part_sun',
      notes: '',
      rows: cool.map(rowFromCrop),
    })
  }
  if (warm.length > 0) {
    areas.push({
      id: newAreaId(),
      name: 'Warm-season area',
      size: '4 × 8 ft',
      sun: 'full_sun',
      notes: '',
      rows: warm.map(rowFromCrop),
    })
  }

  if (areas.length > 0) return areas

  return [
    {
      id: newAreaId(),
      name: 'Garden area',
      size: '4 × 8 ft',
      sun: 'full_sun',
      notes: '',
      rows: list.map(rowFromCrop),
    },
  ]
}
