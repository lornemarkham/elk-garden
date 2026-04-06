export function NextStepsSection({ steps }: { steps: string[] }) {
  if (steps.length === 0) return null

  return (
    <section aria-labelledby="next-steps-heading">
      <h2
        id="next-steps-heading"
        className="text-lg font-semibold tracking-tight text-stone-950"
      >
        Next steps
      </h2>
      <ol className="mt-4 space-y-2.5">
        {steps.map((step, i) => (
          <li
            key={i}
            className="flex gap-3 rounded-xl bg-stone-50/90 px-4 py-3 text-sm leading-snug text-stone-800 ring-1 ring-stone-200"
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-stone-200 text-xs font-bold text-stone-700">
              {i + 1}
            </span>
            <span className="pt-0.5">{step}</span>
          </li>
        ))}
      </ol>
    </section>
  )
}
