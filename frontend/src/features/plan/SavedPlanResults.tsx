import { useMemo } from 'react'
import type { GardenPlanResponse } from '@shared/gardenPlanContract'
import type { StoredGardenArea } from '../canvas/gardenStateStorage'
import { AreaCropGroupsSection } from './AreaCropGroupsSection'
import { NextStepsSection } from './NextStepsSection'
import { finalizeNextStepsForDisplay } from './planNextStepsFilter'
import { SpringPlantingBucketsSection } from './SpringPlantingBucketsSection'
import { SuggestedAreasFromInput } from './SuggestedAreasFromInput'

export function SavedPlanResults({
  plan,
  chips,
  areas,
  userCrops,
  onAddArea,
}: {
  plan: GardenPlanResponse
  chips: string[]
  areas: StoredGardenArea[]
  userCrops: string[]
  onAddArea: (presetId: string) => void
}) {
  const nextSteps = useMemo(
    () => finalizeNextStepsForDisplay(plan.next_steps, userCrops),
    [plan.next_steps, userCrops],
  )

  return (
    <div className="space-y-8">
      <AreaCropGroupsSection areas={areas} chips={chips} />
      <SpringPlantingBucketsSection userCrops={userCrops} />
      <SuggestedAreasFromInput userCrops={userCrops} onAddArea={onAddArea} />
      <NextStepsSection steps={nextSteps} />
    </div>
  )
}
