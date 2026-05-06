import clsx from 'clsx'
import { ChevronDown } from 'lucide-react'
import type { ReactNode } from 'react'

export function PlanCollapsibleSection({
  id,
  title,
  summaryLine,
  open,
  onOpenChange,
  children,
}: {
  id?: string
  title: string
  summaryLine: string
  open: boolean
  onOpenChange: (open: boolean) => void
  children: ReactNode
}) {
  return (
    <section
      id={id}
      className="overflow-hidden rounded-2xl bg-white/80 ring-1 ring-stone-200/90"
      aria-label={title}
    >
      <button
        type="button"
        onClick={() => onOpenChange(!open)}
        aria-expanded={open}
        className="flex w-full touch-manipulation items-start gap-3 px-4 py-4 text-left sm:items-center sm:px-5"
      >
        <ChevronDown
          className={clsx(
            'mt-0.5 h-5 w-5 shrink-0 text-stone-500 transition-transform duration-200 sm:mt-0',
            open && 'rotate-180',
          )}
          aria-hidden
        />
        <div className="min-w-0 flex-1">
          <p className="text-base font-semibold tracking-tight text-stone-950">
            {title}
          </p>
          {!open ? (
            <p className="mt-1 text-sm leading-snug text-stone-600">
              {summaryLine}
            </p>
          ) : null}
        </div>
      </button>
      {open ? (
        <div className="border-t border-stone-100 px-4 pb-4 pt-1 sm:px-5 sm:pb-5">
          {children}
        </div>
      ) : null}
    </section>
  )
}
