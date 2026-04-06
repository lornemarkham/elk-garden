import { Card } from '../../components/Card'
import { splitUserCropsForPlantBuckets } from './splitUserCropsForBuckets'

export function SpringPlantingBucketsSection({
  userCrops,
}: {
  userCrops: string[]
}) {
  const { plantNow, waitWarm } = splitUserCropsForPlantBuckets(userCrops)

  return (
    <section aria-labelledby="spring-buckets-heading" className="space-y-4">
      <h2
        id="spring-buckets-heading"
        className="text-lg font-semibold tracking-tight text-stone-950"
      >
        Planting timing
      </h2>
      <p className="text-sm text-stone-600">
        Early-spring Vernon, BC — only your crops are listed below.
      </p>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="overflow-hidden p-0 ring-stone-200">
          <div className="border-b border-stone-100 bg-stone-50/90 px-4 py-3">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-stone-800">
              Plant Now
            </h3>
          </div>
          <ul className="px-4 py-3 text-sm text-stone-800">
            {plantNow.length > 0 ? (
              plantNow.map((c) => (
                <li key={c} className="py-1">
                  {c}
                </li>
              ))
            ) : (
              <li className="text-stone-500">—</li>
            )}
          </ul>
        </Card>

        <Card className="overflow-hidden p-0 ring-stone-200">
          <div className="border-b border-stone-100 bg-stone-50/90 px-4 py-3">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-stone-800">
              Wait for Warmer Weather
            </h3>
          </div>
          <ul className="px-4 py-3 text-sm text-stone-800">
            {waitWarm.length > 0 ? (
              waitWarm.map((c) => (
                <li key={c} className="py-1">
                  {c}
                </li>
              ))
            ) : (
              <li className="text-stone-500">
                Nothing yet — all your crops can be planted now.
              </li>
            )}
          </ul>
        </Card>
      </div>
    </section>
  )
}
