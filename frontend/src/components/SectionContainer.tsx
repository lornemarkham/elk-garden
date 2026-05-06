import type { ReactNode } from 'react'

export function SectionContainer({
  title,
  subtitle,
  children,
  rightSlot,
}: {
  title: string
  subtitle?: string
  children: ReactNode
  rightSlot?: ReactNode
}) {
  return (
    <section className="pb-8 pt-0 sm:pb-10">
      <div className="mb-5 flex items-start justify-between gap-3 sm:mb-6">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-stone-950">
            {title}
          </h2>
          {subtitle ? (
            <p className="mt-1.5 max-w-prose text-base leading-relaxed text-stone-600">
              {subtitle}
            </p>
          ) : null}
        </div>
        {rightSlot ? <div className="shrink-0">{rightSlot}</div> : null}
      </div>
      {children}
    </section>
  )
}

