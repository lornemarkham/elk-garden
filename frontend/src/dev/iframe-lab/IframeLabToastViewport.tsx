import type { IframeLabToastItem } from './useIframeLabToastQueue'

export function IframeLabToastViewport({ toasts }: { toasts: IframeLabToastItem[] }) {
  if (toasts.length === 0) return null

  return (
    <div
      className="pointer-events-none fixed bottom-4 right-4 z-[9999] flex max-w-[min(22rem,calc(100vw-2rem))] flex-col gap-2"
      aria-live="polite"
      aria-relevant="additions"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          className="pointer-events-auto rounded-lg border border-stone-500/40 bg-stone-800/95 px-3 py-2 text-xs leading-snug text-stone-100 shadow-lg [color-scheme:dark]"
        >
          {t.message}
        </div>
      ))}
    </div>
  )
}
