import type { ReactNode } from 'react'
import { ElkGardenPageBranding } from './ElkGardenPageBranding'

export type PrimaryPageIntroProps = {
  /** Page `h1` — same scale on all primary tabs. */
  title: string
  /** Optional muted supporting copy under the title. */
  description?: ReactNode
  /** Optional right column (e.g. Plan “Clear saved garden data”). */
  action?: ReactNode
}

/**
 * Shared intro for primary app tabs (Dashboard, Plan, Tasks):
 * branding row, title, optional description, optional action.
 */
export function PrimaryPageIntro({
  title,
  description,
  action,
}: PrimaryPageIntroProps) {
  return (
    <header className="mb-8">
      <ElkGardenPageBranding />
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-3xl font-semibold tracking-tight text-stone-950">
            {title}
          </h1>
          {description ? (
            <div className="mt-2 text-base leading-relaxed text-stone-700 sm:text-lg">
              {description}
            </div>
          ) : null}
        </div>
        {action ? (
          <div className="flex shrink-0 flex-col items-stretch sm:items-end">
            {action}
          </div>
        ) : null}
      </div>
    </header>
  )
}
