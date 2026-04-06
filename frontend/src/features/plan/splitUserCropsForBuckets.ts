import { bucketForCrop, type TimelineBucketId } from './plantingTimelineVernon'

/**
 * Split the user’s crops into two planning buckets (no crops added beyond their list).
 */
export function splitUserCropsForPlantBuckets(userCrops: string[]): {
  plantNow: string[]
  waitWarm: string[]
} {
  const plantNow: string[] = []
  const waitWarm: string[] = []
  for (const c of userCrops) {
    const t = c.trim()
    if (!t) continue
    const b: TimelineBucketId = bucketForCrop(t)
    if (b === 'warm' || b === 'later') waitWarm.push(t)
    else plantNow.push(t)
  }
  return { plantNow, waitWarm }
}
