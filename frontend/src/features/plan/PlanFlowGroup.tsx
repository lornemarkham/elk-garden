import type { ReactNode } from 'react'

export function PlanFlowGroup({
  title,
  hint,
  children,
}: {
  title: string
  hint?: string
  children: ReactNode
}) {
  return (
    <div className="rounded-2xl bg-stone-50/60 p-1 ring-1 ring-stone-200/80">
      <div className="px-3 pb-2 pt-3">
        <p className="text-sm font-semibold uppercase tracking-wide text-stone-600">
          {title}
        </p>
        {hint ? (
          <p className="mt-1 text-sm leading-relaxed text-stone-500">{hint}</p>
        ) : null}
      </div>
      <div className="space-y-3 px-1 pb-1">{children}</div>
    </div>
  )
}
