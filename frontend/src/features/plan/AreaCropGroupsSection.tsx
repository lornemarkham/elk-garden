import type { StoredGardenArea } from '../canvas/gardenStateStorage'
import {
  dedupeCropListPreserveOrder,
  globalCropsNotInAnyArea,
} from './planAreaCrops'

const UNASSIGNED_TITLE = 'Unassigned crops (not placed in a garden area yet)'

export function AreaCropGroupsSection({
  areas,
  chips,
}: {
  areas: StoredGardenArea[]
  chips: string[]
}) {
  const globalOnly = globalCropsNotInAnyArea(chips, areas)

  if (areas.length === 0 && globalOnly.length === 0) return null

  return (
    <section aria-labelledby="area-crops-heading" className="space-y-4">
      {areas.length > 0 ? (
        <>
          <h2
            id="area-crops-heading"
            className="text-lg font-semibold tracking-tight text-stone-950"
          >
            Your garden by area
          </h2>
          <div className="space-y-4">
            {areas.map((a) => {
              const name = a.name.trim() || 'Unnamed area'
              const hasRowCrop = a.rows.some((r) => r.crop.trim().length > 0)
              return (
                <div
                  key={a.id}
                  className="rounded-xl bg-stone-50/90 px-4 py-3 ring-1 ring-stone-200"
                >
                  <h3 className="text-base font-semibold text-stone-900">{name}</h3>
                  {a.rows.length === 0 ? (
                    <p className="mt-2 text-sm text-stone-500">
                      No rows in this area yet.
                    </p>
                  ) : hasRowCrop ? (
                    <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-stone-800">
                      {a.rows.map((r, i) => {
                        const crop = r.crop.trim()
                        if (!crop) return null
                        const note = r.notes.trim()
                        const w = r.widthInches.trim()
                        return (
                          <li key={r.id}>
                            Row {i + 1} → {crop}
                            {w ? (
                              <span className="text-stone-600"> ({w} in)</span>
                            ) : null}
                            {note ? (
                              <span className="text-stone-500"> ({note})</span>
                            ) : null}
                          </li>
                        )
                      })}
                    </ul>
                  ) : (
                    <p className="mt-2 text-sm text-stone-500">
                      Rows added — assign a crop to each row when ready.
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        </>
      ) : null}

      {globalOnly.length > 0 ? (
        <div
          className={`rounded-xl bg-white px-4 py-3 ring-1 ring-stone-200 ${
            areas.length > 0 ? 'mt-4' : ''
          }`}
        >
          {areas.length > 0 ? (
            <h3 className="text-sm font-semibold text-stone-800">
              {UNASSIGNED_TITLE}
            </h3>
          ) : (
            <h2
              id="area-crops-heading"
              className="text-lg font-semibold tracking-tight text-stone-950"
            >
              {UNASSIGNED_TITLE}
            </h2>
          )}
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-stone-700">
            {dedupeCropListPreserveOrder(globalOnly).map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  )
}
