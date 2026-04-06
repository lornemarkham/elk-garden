import { Loader2, Sparkles } from 'lucide-react'

export function AskElkCtaBar({
  planLoading,
  planError,
  onAsk,
  hasSavedPlan,
  canAsk,
  minimumInputHint,
}: {
  planLoading: boolean
  planError: string | null
  onAsk: () => void
  /** When true, copy explains that re-running replaces the saved plan. */
  hasSavedPlan: boolean
  /** False when draft has no crop and no area — Ask ELK stays disabled. */
  canAsk: boolean
  /** Shown when canAsk is false. */
  minimumInputHint: string
}) {
  return (
    <section
      className="rounded-2xl border border-emerald-200/70 bg-emerald-50/35 p-6 ring-1 ring-emerald-200/50 sm:p-8"
      aria-labelledby="ask-elk-heading"
    >
      <div className="mx-auto max-w-xl text-center">
        <h2
          id="ask-elk-heading"
          className="text-xl font-semibold tracking-tight text-stone-950"
        >
          Ask ELK
        </h2>
        <p className="mt-2 text-base leading-relaxed text-stone-600">
          Ask ELK will build or update your saved plan using your current draft inputs above
          (crops, goals, location, threats, areas). Plan tasks in the Tasks tab are refreshed
          from the new plan.
        </p>
        {hasSavedPlan ? (
          <p className="mt-3 text-sm leading-relaxed text-stone-500">
            You already have a saved plan — running again replaces it with a new one from your
            current draft.
          </p>
        ) : (
          <p className="mt-3 text-sm leading-relaxed text-stone-500">
            First time: your draft is sent to ELK; the result is saved on this device only.
          </p>
        )}
        {!canAsk ? (
          <p
            className="mx-auto mt-4 max-w-xl rounded-xl bg-amber-50/90 px-4 py-3 text-sm leading-relaxed text-amber-950 ring-1 ring-amber-200/90"
            role="status"
          >
            {minimumInputHint}
          </p>
        ) : null}
      </div>
      {planError ? (
        <p
          className="mx-auto mt-5 max-w-xl rounded-xl bg-rose-50 px-4 py-3 text-center text-sm leading-relaxed text-rose-950 ring-1 ring-rose-200"
          role="alert"
        >
          {planError}
        </p>
      ) : null}
      <div className="mx-auto mt-6 max-w-xl">
        <button
          type="button"
          onClick={() => void onAsk()}
          disabled={planLoading || !canAsk}
          aria-busy={planLoading}
          aria-disabled={!canAsk}
          className="flex min-h-[3rem] w-full items-center justify-center gap-2 rounded-2xl bg-emerald-700 px-4 py-3.5 text-lg font-semibold text-white shadow-sm ring-1 ring-emerald-800 hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {planLoading ? (
            <Loader2
              className="h-6 w-6 shrink-0 animate-spin"
              aria-hidden="true"
            />
          ) : (
            <Sparkles className="h-6 w-6 shrink-0" aria-hidden="true" />
          )}
          {planLoading ? 'Planning…' : 'Ask ELK'}
        </button>
      </div>
    </section>
  )
}
