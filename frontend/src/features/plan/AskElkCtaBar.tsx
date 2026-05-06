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
          Everything above is your garden draft. Ask ELK turns it into a plan and tasks you can
          use on the Tasks tab — stored on this device only. Start simple and iterate: update the
          draft and ask again whenever you want a fresh plan.
        </p>
        {hasSavedPlan ? (
          <p className="mt-3 text-sm leading-relaxed text-stone-500">
            You already have a generated plan below. Running Ask ELK again replaces it with a
            new one from your current draft.
          </p>
        ) : null}
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
        {!hasSavedPlan ? (
          <p className="mt-3 text-center text-sm leading-relaxed text-stone-500">
            After Ask ELK finishes, your generated plan appears in the section below.
          </p>
        ) : null}
      </div>
    </section>
  )
}
