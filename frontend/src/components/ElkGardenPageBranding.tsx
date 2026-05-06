import { Sprout } from 'lucide-react'

/** Non-sticky page branding — scrolls with content (not a header bar). */
export function ElkGardenPageBranding() {
  return (
    <div className="mb-5 flex items-center gap-2.5 sm:mb-6">
      <div
        className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white shadow-sm ring-1 ring-stone-200"
        aria-hidden="true"
      >
        <Sprout className="h-4 w-4 text-emerald-700" />
      </div>
      <p className="text-sm font-semibold tracking-tight text-stone-900">
        ELK Garden
      </p>
    </div>
  )
}
