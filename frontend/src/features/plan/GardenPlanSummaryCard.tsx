import type { GardenGoal } from './planConstants'
import { GOAL_LABELS } from './planConstants'
import { loadPlanTasks } from './planTasksStorage'

export function GardenPlanSummaryCard({
  bedCount,
  cropCount,
  locationText,
  goal,
  hasElkPlan,
  canAskElk,
  onViewLayout,
  onEditBasics,
}: {
  bedCount: number
  cropCount: number
  locationText: string
  goal: GardenGoal
  /** Whether a generated plan is currently loaded (Ask ELK has run). */
  hasElkPlan: boolean
  /** Draft has enough for Ask ELK (≥1 crop or ≥1 bed). */
  canAskElk: boolean
  onViewLayout: () => void
  onEditBasics: () => void
}) {
  const taskCount = loadPlanTasks().length
  const goalLabel = GOAL_LABELS[goal]
  const locationDisplay = locationText.trim() || 'Not set yet'

  const missingForAsk =
    !canAskElk
      ? 'Add at least one crop or one garden bed to use Ask ELK.'
      : null

  let nextStep: string
  if (!canAskElk) {
    nextStep = 'Add a crop or a bed in your draft below.'
  } else if (!hasElkPlan) {
    nextStep = 'When your draft feels good enough, use Ask ELK to generate a plan.'
  } else if (taskCount > 0) {
    nextStep = `You have ${taskCount} task${taskCount === 1 ? '' : 's'} on the Tasks tab — or tweak the draft and ask ELK again.`
  } else {
    nextStep = 'Open the Tasks tab for your list, or update the draft and run Ask ELK again.'
  }

  let tasksHint: string
  if (!hasElkPlan) {
    tasksHint = 'After Ask ELK, tasks appear on the Tasks page.'
  } else if (taskCount > 0) {
    tasksHint = `${taskCount} task${taskCount === 1 ? '' : 's'} saved on this device.`
  } else {
    tasksHint = 'Plan saved on this device — check Tasks for your list.'
  }

  return (
    <section
      className="rounded-2xl bg-emerald-50/50 p-4 ring-1 ring-emerald-200/70 sm:p-5"
      aria-labelledby="garden-summary-heading"
    >
      <h2
        id="garden-summary-heading"
        className="text-lg font-semibold tracking-tight text-stone-950"
      >
        Draft snapshot
      </h2>
      <p className="mt-1 text-sm leading-relaxed text-stone-600">
        What&apos;s filled in now, and the most useful next step.
      </p>

      {missingForAsk ? (
        <p
          className="mt-3 rounded-xl bg-amber-50/90 px-3 py-2.5 text-sm font-medium leading-snug text-amber-950 ring-1 ring-amber-200/80"
          role="status"
        >
          {missingForAsk}
        </p>
      ) : null}

      <p className="mt-3 text-sm leading-snug text-stone-800">
        <span className="font-semibold text-stone-900">Suggested next step: </span>
        {nextStep}
      </p>

      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
        <div className="rounded-xl bg-white/70 px-3 py-2.5 ring-1 ring-stone-200/80">
          <dt className="font-medium text-stone-500">Beds</dt>
          <dd className="mt-0.5 font-semibold text-stone-900">
            {bedCount === 0
              ? 'None yet'
              : `${bedCount} ${bedCount === 1 ? 'bed' : 'beds'}`}
          </dd>
        </div>
        <div className="rounded-xl bg-white/70 px-3 py-2.5 ring-1 ring-stone-200/80">
          <dt className="font-medium text-stone-500">Crops</dt>
          <dd className="mt-0.5 font-semibold text-stone-900">
            {cropCount === 0
              ? 'None yet'
              : `${cropCount} ${cropCount === 1 ? 'crop' : 'crops'}`}
          </dd>
        </div>
        <div className="rounded-xl bg-white/70 px-3 py-2.5 ring-1 ring-stone-200/80 sm:col-span-2">
          <dt className="font-medium text-stone-500">Place</dt>
          <dd className="mt-0.5 font-semibold text-stone-900">
            {locationDisplay}
          </dd>
        </div>
        <div className="rounded-xl bg-white/70 px-3 py-2.5 ring-1 ring-stone-200/80 sm:col-span-2">
          <dt className="font-medium text-stone-500">Garden goal</dt>
          <dd className="mt-0.5 font-semibold text-stone-900">{goalLabel}</dd>
        </div>
        <div className="rounded-xl bg-white/70 px-3 py-2.5 ring-1 ring-stone-200/80 sm:col-span-2">
          <dt className="font-medium text-stone-500">Tasks</dt>
          <dd className="mt-0.5 font-semibold text-stone-900">{tasksHint}</dd>
        </div>
      </dl>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <button
          type="button"
          onClick={onViewLayout}
          className="inline-flex min-h-[2.75rem] items-center justify-center rounded-2xl bg-stone-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm ring-1 ring-stone-900 hover:bg-stone-800"
        >
          View layout
        </button>
        <button
          type="button"
          onClick={onEditBasics}
          className="inline-flex min-h-[2.75rem] items-center justify-center rounded-2xl bg-white px-4 py-2.5 text-sm font-semibold text-stone-800 ring-1 ring-stone-300 hover:bg-stone-50"
        >
          Edit basics
        </button>
      </div>
    </section>
  )
}
