/**
 * Early April — Vernon, BC (approx. zone 5–6 interior).
 * Practical buckets for what to sow/transplant now vs after soil warms.
 */

export type TimelineBucketId = 'now' | 'soon' | 'later' | 'warm'

export const TIMELINE_ORDER: TimelineBucketId[] = [
  'now',
  'soon',
  'later',
  'warm',
]

export const TIMELINE_HEADINGS: Record<TimelineBucketId, string> = {
  now: 'Plant Now',
  soon: 'Plant Soon',
  later: 'Plant Later',
  warm: 'Wait for Warm Weather',
}

export const TIMELINE_HINTS: Record<TimelineBucketId, string> = {
  now: 'Cool soil, light frosts still possible — hardy greens, roots, and peas.',
  soon: 'Soil is warming; hardy transplants and second successions.',
  later: 'After last frost risk drops — heat lovers except the hottest crops.',
  warm: 'Night temperatures reliably mild — frost-sensitive fruiting crops.',
}

/** Reference crops for Vernon early April — “what you could plant” this session. */
export const REFERENCE_PLANT_NOW: string[] = [
  'Lettuce',
  'Spinach',
  'Radish',
  'Carrots',
  'Beets',
  'Peas',
  'Green onions',
  'Cilantro',
  'Parsley',
  'Potatoes',
]

export const REFERENCE_PLANT_SOON: string[] = [
  'Kale',
  'Swiss chard',
  'Broccoli (transplants)',
  'Cabbage (transplants)',
  'Onion sets',
]

export const REFERENCE_PLANT_LATER: string[] = [
  'Sweet corn',
  'Pumpkins & winter squash',
  'Sweet potatoes (slips)',
]

export const REFERENCE_WARM_WEATHER: string[] = [
  'Tomatoes',
  'Peppers',
  'Basil',
  'Beans',
  'Cucumbers',
  'Squash',
  'Melons',
]

const WARM_ALIASES = [
  'tomato',
  'tomatoes',
  'pepper',
  'peppers',
  'basil',
  'bean',
  'beans',
  'cucumber',
  'cucumbers',
  'squash',
  'zucchini',
  'melon',
  'melons',
  'eggplant',
  'sweet potato',
  'sweet potatoes',
]

const SOON_ALIASES = [
  'kale',
  'chard',
  'broccoli',
  'cabbage',
  'brussels',
  'cauliflower',
  'onion set',
  'onions',
]

const LATER_ALIASES = ['corn', 'pumpkin', 'pumpkins', 'sweet potato', 'winter squash']

const NOW_ALIASES = [
  'lettuce',
  'spinach',
  'radish',
  'carrot',
  'carrots',
  'beet',
  'beets',
  'pea',
  'peas',
  'green onion',
  'scallion',
  'cilantro',
  'parsley',
  'potato',
  'potatoes',
  'arugula',
  'mustard greens',
  'bok choy',
  'pak choi',
]

function norm(s: string): string {
  return s.toLowerCase().trim()
}

/** Best-effort bucket for a single crop label from the user’s list. */
export function bucketForCrop(crop: string): TimelineBucketId {
  const n = norm(crop)
  if (!n) return 'later'

  const hit = (aliases: string[]) =>
    aliases.some((a) => n.includes(a) || a.includes(n))

  if (hit(WARM_ALIASES)) return 'warm'
  if (hit(LATER_ALIASES)) return 'later'
  if (hit(SOON_ALIASES)) return 'soon'
  if (hit(NOW_ALIASES)) return 'now'

  // Unknown crop: keep on user’s list only — treat as cool-season for display split
  return 'now'
}

export function userCropsInBucket(
  bucket: TimelineBucketId,
  userCrops: string[],
): string[] {
  return userCrops.filter((c) => bucketForCrop(c) === bucket)
}
