import { useMemo, useState } from 'react'
import type { GardenPlanResponse } from '@shared/gardenPlanContract'
import type { StoredGardenBed } from '../canvas/gardenStateStorage'
import { BedCropGroupsSection } from './BedCropGroupsSection'
import { NextStepsSection } from './NextStepsSection'
import { PlanCollapsibleSection } from './PlanCollapsibleSection'
import { finalizeNextStepsForDisplay } from './planNextStepsFilter'
import { SpringPlantingBucketsSection } from './SpringPlantingBucketsSection'
import { SuggestedBedsFromInput } from './SuggestedBedsFromInput'

export function SavedPlanResults({
  plan,
  chips,
  beds,
  userCrops,
  onAddBed,
}: {
  plan: GardenPlanResponse
  chips: string[]
  beds: StoredGardenBed[]
  userCrops: string[]
  onAddBed: (presetId: string) => void
}) {
  const nextSteps = useMemo(
    () => finalizeNextStepsForDisplay(plan.next_steps, userCrops),
    [plan.next_steps, userCrops],
  )

  const [suggestionsOpen, setSuggestionsOpen] = useState(false)
  const suggestionCount = nextSteps.length

  return (
    <div className="space-y-8">
      <BedCropGroupsSection beds={beds} chips={chips} />
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
          <SuggestedBedsFromInput userCrops={userCrops} onAddBed={onAddBed} />
          <NextStepsSection steps={nextSteps} />
        </div>
      </PlanCollapsibleSection>
    </div>
  )
}
