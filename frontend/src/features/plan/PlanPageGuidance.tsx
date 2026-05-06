/** Short orientation copy for the Plan tab — draft vs ELK output, no pressure. */
export function PlanPageGuidance() {
  return (
    <div className="rounded-2xl bg-stone-100/70 p-4 ring-1 ring-stone-200/80 sm:p-5">
      <p className="text-sm font-semibold text-stone-800">Start here</p>
      <p className="mt-2 text-sm leading-relaxed text-stone-600">
        This page is for your <span className="font-medium text-stone-800">garden draft</span>
        — crops, beds, place, and what you&apos;re planning around. When you&apos;re ready,{' '}
        <span className="font-medium text-stone-800">Ask ELK</span> turns that draft into a
        seasonal plan and tasks. Nothing has to be perfect; you can adjust and run it again
        anytime.
      </p>
    </div>
  )
}
