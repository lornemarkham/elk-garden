export type GardenGoal = 'high_yield' | 'easy_care' | 'balanced'

export type SunLevel = 'full_sun' | 'part_sun' | 'shade' | 'unsure'

export const THREATS = [
  { id: 'deer', label: 'Deer' },
  { id: 'rabbits', label: 'Rabbits' },
  { id: 'insects', label: 'Insects' },
  { id: 'heat', label: 'Heat' },
  { id: 'dry_soil', label: 'Dry soil' },
] as const

export const GOAL_LABELS: Record<GardenGoal, string> = {
  easy_care: 'Easy & low effort',
  high_yield: 'High yield',
  balanced: 'Balanced',
}

export const SUN_TO_API: Record<
  SunLevel,
  'full sun' | 'part sun' | 'shade' | 'unsure'
> = {
  full_sun: 'full sun',
  part_sun: 'part sun',
  shade: 'shade',
  unsure: 'unsure',
}

export const AREA_PRESETS: Array<{
  id: string
  label: string
  name: string
  size: string
  sun: SunLevel
  notes: string
}> = [
  {
    id: 'tomato',
    label: 'Tomato bed',
    name: 'Tomato bed',
    size: '4 × 8 ft',
    sun: 'full_sun',
    notes: '',
  },
  {
    id: 'greens',
    label: 'Greens bed',
    name: 'Greens bed',
    size: '3 × 6 ft',
    sun: 'part_sun',
    notes: '',
  },
  {
    id: 'herb',
    label: 'Herb garden',
    name: 'Herb garden',
    size: '2 × 4 ft',
    sun: 'full_sun',
    notes: '',
  },
  {
    id: 'raised',
    label: 'Raised bed',
    name: 'Raised bed',
    size: '',
    sun: 'unsure',
    notes: '',
  },
  {
    id: 'custom',
    label: 'Custom',
    name: '',
    size: '',
    sun: 'unsure',
    notes: '',
  },
]
