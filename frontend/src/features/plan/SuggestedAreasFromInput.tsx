import { Plus } from 'lucide-react'
import { Card } from '../../components/Card'
import { splitUserCropsForPlantBuckets } from './splitUserCropsForBuckets'

const PRESET_COOL = 'greens'
const PRESET_WARM = 'tomato'

export function SuggestedAreasFromInput({
  userCrops,
  onAddArea,
}: {
  userCrops: string[]
  onAddArea: (presetId: string) => void
}) {
  const { plantNow, waitWarm } = splitUserCropsForPlantBuckets(userCrops)
  if (plantNow.length === 0 && waitWarm.length === 0) return null

  return (
    <section aria-labelledby="suggested-areas-heading" className="space-y-4">
      <h2
        id="suggested-areas-heading"
        className="text-lg font-semibold tracking-tight text-stone-950"
      >
        Suggested areas
      </h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {plantNow.length > 0 ? (
          <Card className="p-4 ring-stone-200">
            <h3 className="text-base font-semibold text-stone-900">
              Greens / cool-season bed
            </h3>
            <p className="mt-2 text-sm text-stone-700">
              For: {plantNow.join(', ')}
            </p>
            <button
              type="button"
              onClick={() => onAddArea(PRESET_COOL)}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-stone-900 px-4 py-2.5 text-sm font-semibold text-white ring-1 ring-stone-900 hover:bg-stone-800"
            >
              <Plus className="h-4 w-4" aria-hidden />
              Add area
            </button>
          </Card>
        ) : null}
        {waitWarm.length > 0 ? (
          <Card className="p-4 ring-stone-200">
            <h3 className="text-base font-semibold text-stone-900">
              Warm-season bed
            </h3>
            <p className="mt-2 text-sm text-stone-700">
              For: {waitWarm.join(', ')}
            </p>
            <button
              type="button"
              onClick={() => onAddArea(PRESET_WARM)}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-stone-900 px-4 py-2.5 text-sm font-semibold text-white ring-1 ring-stone-900 hover:bg-stone-800"
            >
              <Plus className="h-4 w-4" aria-hidden />
              Add area
            </button>
          </Card>
        ) : null}
      </div>
    </section>
  )
}
