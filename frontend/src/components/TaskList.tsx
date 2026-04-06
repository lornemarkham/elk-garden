import clsx from 'clsx'
import { CheckCircle2, Circle } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useGarden } from '../lib/useGarden'
import { taskToggleMessage } from '../lib/mode/mode'

export interface TaskListItem {
  id: string
  title: string
  supportiveNote?: string
  completed: boolean
  /** Optional assistant guidance (muted subtext). */
  why?: string
  watchFor?: string
  doneRight?: string
}

function TaskGuidanceLines({
  why,
  watchFor,
  doneRight,
}: {
  why?: string
  watchFor?: string
  doneRight?: string
}) {
  const rows: Array<{ label: string; text: string }> = []
  if (why?.trim()) rows.push({ label: 'Why:', text: why.trim() })
  if (watchFor?.trim())
    rows.push({ label: 'Watch for:', text: watchFor.trim() })
  if (doneRight?.trim())
    rows.push({ label: 'Done right:', text: doneRight.trim() })
  if (rows.length === 0) return null
  return (
    <div className="mt-2 space-y-1 border-t border-stone-100/90 pt-2">
      {rows.map((row) => (
        <p
          key={row.label}
          className="text-sm leading-snug text-stone-500"
        >
          <span className="font-medium text-stone-600">{row.label}</span>{' '}
          {row.text}
        </p>
      ))}
    </div>
  )
}

export function TaskList({
  items,
  onToggle,
}: {
  items: TaskListItem[]
  onToggle: (taskId: string) => void
}) {
  const { gardenMode } = useGarden()
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => {
    if (!toast) return
    const t = window.setTimeout(() => setToast(null), 1800)
    return () => window.clearTimeout(t)
  }, [toast])

  return (
    <div className="space-y-4">
      <div className="sr-only" role="status" aria-live="polite">
        {toast ?? ''}
      </div>
      {items.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => {
            onToggle(t.id)
            setToast(taskToggleMessage(gardenMode, !t.completed))
          }}
          className={clsx(
            'w-full text-left',
            'flex items-start gap-4 rounded-2xl p-3.5 shadow-sm ring-1',
            'transition duration-200 motion-reduce:transition-none',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 focus-visible:ring-offset-stone-50',
            t.completed
              ? 'bg-emerald-50/45 ring-emerald-200'
              : 'bg-white ring-stone-200 hover:bg-stone-50',
          )}
        >
          <div className="mt-0.5">
            {t.completed ? (
              <CheckCircle2
                className={clsx(
                  'h-8 w-8 text-emerald-700',
                  'transition duration-200 motion-reduce:transition-none',
                  'motion-safe:scale-105',
                )}
                aria-hidden="true"
              />
            ) : (
              <Circle className="h-8 w-8 text-stone-400" aria-hidden="true" />
            )}
          </div>
          <div className="min-w-0">
            <p
              className={clsx(
                'text-base font-semibold tracking-tight',
                'transition duration-200 motion-reduce:transition-none',
                t.completed
                  ? 'text-stone-700 line-through opacity-80'
                  : 'text-stone-950',
              )}
            >
              {t.title}
            </p>
            {t.supportiveNote ? (
              <p className="mt-1 text-base leading-relaxed text-stone-700">
                {t.supportiveNote}
              </p>
            ) : null}
            <TaskGuidanceLines
              why={t.why}
              watchFor={t.watchFor}
              doneRight={t.doneRight}
            />
          </div>
        </button>
      ))}
    </div>
  )
}

