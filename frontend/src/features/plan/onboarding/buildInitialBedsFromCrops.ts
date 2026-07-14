import type {
  StoredGardenBed,
  StoredGardenRow,
} from '../../canvas/gardenStateStorage'
import { dedupeCropListPreserveOrder } from '../planBedCrops'
import { bucketForCrop } from '../plantingTimelineVernon'

function newBedId() {
  return `bed_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
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
 * Seed garden beds + one row per crop for first-time onboarding.
 * Splits warm-season vs cool-season when both are present.
 */
export function buildInitialBedsFromCrops(crops: string[]): StoredGardenBed[] {
  const list = dedupeCropListPreserveOrder(crops).filter((c) => c.trim())
  if (list.length === 0) {
    return [
      {
        id: newBedId(),
        name: 'Garden bed',
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

  const beds: StoredGardenBed[] = []

  if (cool.length > 0) {
    beds.push({
      id: newBedId(),
      name: 'Cool-season bed',
      size: '4 × 8 ft',
      sun: 'part_sun',
      notes: '',
      rows: cool.map(rowFromCrop),
    })
  }
  if (warm.length > 0) {
    beds.push({
      id: newBedId(),
      name: 'Warm-season bed',
      size: '4 × 8 ft',
      sun: 'full_sun',
      notes: '',
      rows: warm.map(rowFromCrop),
    })
  }

  if (beds.length > 0) return beds

  return [
    {
      id: newBedId(),
      name: 'Garden bed',
      size: '4 × 8 ft',
      sun: 'full_sun',
      notes: '',
      rows: list.map(rowFromCrop),
    },
  ]
}
