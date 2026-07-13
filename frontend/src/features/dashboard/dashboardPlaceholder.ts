/** Placeholder content for the magical dashboard redesign — no live sensor wiring. */

export type ZoneIconKey = 'tomatoes' | 'greens' | 'roots' | 'melons'

export interface PlaceholderZone {
  id: string
  name: string
  cropSummary: string
  icon: ZoneIconKey
  gradient: string
  moisturePct: number
  moistureLabel: string
  statusLine: string
}

export const PLACEHOLDER_ZONES: PlaceholderZone[] = [
  {
    id: 'zone_tomatoes',
    name: 'Tomatoes & Basil',
    cropSummary: 'Raised bed, full sun',
    icon: 'tomatoes',
    gradient: 'from-rose-200 via-orange-200 to-amber-100',
    moisturePct: 58,
    moistureLabel: 'Good',
    statusLine: 'Warming up nicely with the morning sun.',
  },
  {
    id: 'zone_greens',
    name: 'Lettuce & Kale',
    cropSummary: 'In-ground, partial shade',
    icon: 'greens',
    gradient: 'from-emerald-200 via-lime-100 to-emerald-50',
    moisturePct: 70,
    moistureLabel: 'Good',
    statusLine: 'Tender and happy in the shade.',
  },
  {
    id: 'zone_roots',
    name: 'Carrots & Beets',
    cropSummary: 'In-ground, mulched',
    icon: 'roots',
    gradient: 'from-amber-200 via-stone-100 to-orange-50',
    moisturePct: 64,
    moistureLabel: 'Good',
    statusLine: 'Quietly growing underground, no fuss.',
  },
  {
    id: 'zone_melons',
    name: 'Melons & Squash',
    cropSummary: 'Container, full sun',
    icon: 'melons',
    gradient: 'from-yellow-200 via-amber-100 to-lime-50',
    moisturePct: 49,
    moistureLabel: 'Watch',
    statusLine: 'Stretching out fast — keep an eye on water today.',
  },
]

export interface PlaceholderFocusItem {
  id: string
  title: string
  why: string
  minutesLabel: string
}

export const PLACEHOLDER_FOCUS: PlaceholderFocusItem[] = [
  {
    id: 'focus_water_tomatoes',
    title: 'Give the tomatoes a drink this evening',
    why: 'Soil is drying faster than usual with the warm afternoons.',
    minutesLabel: '~10 min',
  },
  {
    id: 'focus_weed_greens',
    title: 'Pull a few weeds near the greens',
    why: 'A quick pass keeps them from crowding out the lettuce.',
    minutesLabel: '~5 min',
  },
  {
    id: 'focus_check_squash',
    title: 'Check under the squash leaves',
    why: 'Just a gentle look for pests — nothing urgent yet.',
    minutesLabel: '~5 min',
  },
]

export interface PlaceholderMoment {
  id: string
  time: string
  message: string
  icon: 'droplet' | 'sun' | 'leaf' | 'cloud'
}

export const PLACEHOLDER_MOMENTS: PlaceholderMoment[] = [
  {
    id: 'moment_1',
    time: '6:12 AM',
    message: 'Soil sensor: tomato bed holding steady at 42% moisture.',
    icon: 'droplet',
  },
  {
    id: 'moment_2',
    time: '6:40 AM',
    message: 'Sunrise — the garden is waking up.',
    icon: 'sun',
  },
  {
    id: 'moment_3',
    time: '7:05 AM',
    message: 'Greens looking crisp after a cool, quiet night.',
    icon: 'leaf',
  },
  {
    id: 'moment_4',
    time: '7:30 AM',
    message: 'Light clouds rolling in — good cover before the afternoon sun.',
    icon: 'cloud',
  },
]

export const GARDEN_QUOTE = 'Mulch is a love letter to your soil.'

export interface WeatherPlaceholder {
  conditionLabel: string
  highF: number
  lowF: number
  precipChancePct: number
  wateringWindowLabel: string
}

export const PLACEHOLDER_WEATHER: WeatherPlaceholder = {
  conditionLabel: 'Clear and cool',
  highF: 78,
  lowF: 54,
  precipChancePct: 20,
  wateringWindowLabel: 'This evening, after 6pm',
}

export function greetingForHour(hour: number): string {
  if (hour < 5) return 'Still dark out'
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  if (hour < 21) return 'Good evening'
  return 'Good night'
}

export function moodLineForHour(hour: number, weather: WeatherPlaceholder): string {
  if (hour < 5) return 'The garden is resting — quiet and still.'
  if (hour < 12) {
    return `${weather.lowF}° and ${weather.conditionLabel.toLowerCase()} — dew still on the tomato leaves.`
  }
  if (hour < 17) return `${weather.highF}° and ${weather.conditionLabel.toLowerCase()} — a good afternoon to wander the rows.`
  if (hour < 21) return 'The light is going gold over the beds.'
  return 'Everything is settling in for the night.'
}

export function healthLabel(scorePct: number): string {
  if (scorePct >= 85) return 'Thriving'
  if (scorePct >= 65) return 'Steady'
  return 'Needs a look'
}

export function effortLabel(scorePct: number): string {
  if (scorePct >= 85) return 'Low-effort day — enjoy your coffee'
  if (scorePct >= 65) return 'Easy day — a few small things to notice'
  return 'A little extra attention today'
}
