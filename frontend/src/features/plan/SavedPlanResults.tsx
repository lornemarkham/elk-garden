import { useMemo, useState } from 'react'
import type { GardenPlanResponse } from '@shared/gardenPlanContract'
import type { StoredGardenArea } from '../canvas/gardenStateStorage'
import { AreaCropGroupsSection } from './AreaCropGroupsSection'
import { NextStepsSection } from './NextStepsSection'
import { PlanCollapsibleSection } from './PlanCollapsibleSection'
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

  const [suggestionsOpen, setSuggestionsOpen] = useState(false)
  const suggestionCount = nextSteps.length

  return (
    <div className="space-y-8">
      <AreaCropGroupsSection areas={areas} chips={chips} />
      <SpringPlantingBucketsSection userCrops={userCrops} />
      <PlanCollapsibleSection
        id="saved-plan-suggestions"
        title="Suggested beds & next steps"
        summaryLine={
          suggestionCount === 0
            ? 'Ideas from ELK — open when you want more to explore.'
            : `${suggestionCount} next-step ${suggestionCount === 1 ? 'idea' : 'ideas'} plus optional bed suggestions from ELK.`
        }
        open={suggestionsOpen}
        onOpenChange={setSuggestionsOpen}
      >
        <div className="space-y-8 pt-2">
          <SuggestedAreasFromInput userCrops={userCrops} onAddArea={onAddArea} />
          <NextStepsSection steps={nextSteps} />
        </div>
      </PlanCollapsibleSection>
    </div>
  )
}
