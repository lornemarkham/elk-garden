import { useEffect, useState } from 'react'
import { NavLink } from 'react-router-dom'
import clsx from 'clsx'
import {
  Bird,
  Carrot,
  CheckCircle2,
  Cherry,
  Circle,
  Citrus,
  Cloud,
  CloudSun,
  Coffee,
  Droplet,
  Leaf,
  Sparkles,
  Sprout,
  Sun,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { SectionContainer } from '../../components/SectionContainer'
import { GardenCameraCard } from '../../components/GardenCameraCard'
import { LiveSensorDevPanel } from '../../components/dev/LiveSensorDevPanel'
import { TaskList, type TaskListItem } from '../../components/TaskList'
import { HealthRing } from './HealthRing'
import {
  GARDEN_QUOTE,
  PLACEHOLDER_FOCUS,
  PLACEHOLDER_MOMENTS,
  PLACEHOLDER_WEATHER,
  PLACEHOLDER_ZONES,
  effortLabel,
  greetingForHour,
  healthLabel,
  moodLineForHour,
  type PlaceholderFocusItem,
  type PlaceholderZone,
  type ZoneIconKey,
} from './dashboardPlaceholder'

const GARDEN_HEALTH_SCORE = 88

const ZONE_ICON: Record<ZoneIconKey, LucideIcon> = {
  tomatoes: Cherry,
  greens: Leaf,
  roots: Carrot,
  melons: Citrus,
}

const MOMENT_ICON: Record<(typeof PLACEHOLDER_MOMENTS)[number]['icon'], LucideIcon> = {
  droplet: Droplet,
  sun: Sun,
  leaf: Leaf,
  cloud: Cloud,
}

const BACKLOG_TASKS: TaskListItem[] = [
  { id: 'backlog_stakes', title: 'Order more tomato stakes', completed: false },
  { id: 'backlog_shears', title: 'Sharpen the pruning shears', completed: false },
  { id: 'backlog_succession', title: 'Plan fall lettuce succession', completed: false },
]

const QUICK_NOTES: Array<{ id: string; label: string; loggedLabel: string }> = [
  { id: 'pests', label: 'Saw pests', loggedLabel: 'Noted — added to tomorrow.' },
  { id: 'stressed', label: 'Plants look stressed', loggedLabel: "Noted — keeping an eye on it." },
  { id: 'dry', label: 'Soil feels dry', loggedLabel: 'Noted — watering moved up.' },
]

function GreetingHero() {
  const now = new Date()
  const hour = now.getHours()
  const greeting = greetingForHour(hour)
  const mood = moodLineForHour(hour, PLACEHOLDER_WEATHER)
  const dateLabel = now.toLocaleDateString([], {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })

  return (
    <div className="relative mb-5 overflow-hidden rounded-[2rem] bg-gradient-to-br from-amber-50 via-rose-50 to-sky-100 p-6 ring-1 ring-stone-200/70 sm:mb-6 sm:p-8">
      <div
        className="absolute -right-12 -top-12 h-44 w-44 rounded-full bg-gradient-to-br from-amber-200/70 to-orange-300/40 blur-2xl"
        aria-hidden="true"
      />
      <div
        className="absolute -bottom-16 -left-10 h-40 w-40 rounded-full bg-gradient-to-br from-sky-200/60 to-emerald-200/40 blur-2xl"
        aria-hidden="true"
      />
      <div className="relative">
        <div className="flex items-center gap-2">
          <div className="grid h-7 w-7 place-items-center rounded-lg bg-white/80 shadow-sm ring-1 ring-stone-200">
            <Sprout className="h-3.5 w-3.5 text-emerald-700" aria-hidden="true" />
          </div>
          <p className="text-sm font-semibold tracking-tight text-stone-700">{dateLabel}</p>
        </div>
        <h1 className="mt-3 font-serif text-4xl tracking-tight text-stone-950 sm:text-5xl">
          {greeting}, Lorne.
        </h1>
        <p className="mt-2 max-w-prose text-lg italic leading-snug text-stone-700">{mood}</p>
        <div className="mt-5 flex flex-wrap items-center gap-2 text-sm">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/80 px-3 py-1.5 font-semibold text-stone-800 ring-1 ring-stone-200">
            <CloudSun className="h-4 w-4 text-sky-700" aria-hidden="true" />
            High {PLACEHOLDER_WEATHER.highF}° · Low {PLACEHOLDER_WEATHER.lowF}°
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/80 px-3 py-1.5 font-semibold text-stone-800 ring-1 ring-stone-200">
            <Droplet className="h-4 w-4 text-sky-700" aria-hidden="true" />
            {PLACEHOLDER_WEATHER.precipChancePct}% rain · watering window {PLACEHOLDER_WEATHER.wateringWindowLabel.toLowerCase()}
          </span>
        </div>
      </div>
    </div>
  )
}

function GardenPulseCard() {
  const watchZone = PLACEHOLDER_ZONES.find((z) => z.moistureLabel === 'Watch')
  return (
    <div className="mb-5 flex flex-col items-center gap-4 rounded-[1.75rem] bg-white p-5 text-center shadow-sm ring-1 ring-stone-200 sm:mb-6 sm:flex-row sm:gap-6 sm:p-6 sm:text-left">
      <HealthRing scorePct={GARDEN_HEALTH_SCORE} label={healthLabel(GARDEN_HEALTH_SCORE)} />
      <div>
        <p className="text-lg font-semibold leading-snug text-stone-950">
          Every bed checked in steady this morning.
          {watchZone ? ` Just keep an eye on the ${watchZone.name.toLowerCase()} today.` : ''}
        </p>
        <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-sm font-bold text-emerald-950 ring-1 ring-emerald-100">
          <Coffee className="h-4 w-4" aria-hidden="true" />
          {effortLabel(GARDEN_HEALTH_SCORE)}
        </p>
      </div>
    </div>
  )
}

function FocusItemRow({
  item,
  completed,
  justCompleted,
  onToggle,
}: {
  item: PlaceholderFocusItem
  completed: boolean
  justCompleted: boolean
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={completed}
      className={clsx(
        'flex w-full items-start gap-3 rounded-2xl p-4 text-left shadow-sm ring-1 transition',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 focus-visible:ring-offset-stone-50',
        completed ? 'bg-emerald-50/50 ring-emerald-200' : 'bg-white ring-stone-200 hover:bg-stone-50',
        justCompleted && 'animate-task-complete-pulse ring-emerald-300',
      )}
    >
      <span className="mt-0.5 shrink-0">
        {completed ? (
          <CheckCircle2
            className={clsx('h-7 w-7 text-emerald-700', justCompleted && 'animate-task-check-pop')}
            aria-hidden="true"
          />
        ) : (
          <Circle className="h-7 w-7 text-stone-400" aria-hidden="true" />
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-start justify-between gap-2">
          <span className={clsx('font-semibold leading-snug', completed ? 'text-stone-700' : 'text-stone-950')}>
            {item.title}
          </span>
          <span className="shrink-0 text-xs font-semibold text-stone-500">{item.minutesLabel}</span>
        </span>
        <span className="mt-1 block text-sm leading-relaxed text-stone-600">{item.why}</span>
      </span>
    </button>
  )
}

function ZoneGalleryCard({ zone }: { zone: PlaceholderZone }) {
  const Icon = ZONE_ICON[zone.icon]
  const isWatch = zone.moistureLabel === 'Watch'
  return (
    <NavLink
      to={`/zones/${zone.id}`}
      className="flex w-[72%] shrink-0 snap-start flex-col overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-stone-200 transition hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 focus-visible:ring-offset-stone-50 sm:w-60"
    >
      <div className={clsx('flex items-center gap-2.5 bg-gradient-to-br px-4 py-3.5', zone.gradient)}>
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/80 shadow-sm">
          <Icon className="h-4 w-4 text-stone-800" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <p className="truncate font-bold leading-snug text-stone-950">{zone.name}</p>
          <p className="truncate text-xs text-stone-700/80">{zone.cropSummary}</p>
        </div>
      </div>
      <div className="flex-1 space-y-3 p-4">
        <p className="text-sm leading-relaxed text-stone-700">{zone.statusLine}</p>
        <div>
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-stone-500">
            <span>Moisture</span>
            <span className={isWatch ? 'text-amber-700' : 'text-emerald-700'}>{zone.moistureLabel}</span>
          </div>
          <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-stone-100">
            <div
              className={clsx('h-full rounded-full', isWatch ? 'bg-amber-400' : 'bg-emerald-500')}
              style={{ width: `${zone.moisturePct}%` }}
            />
          </div>
        </div>
      </div>
    </NavLink>
  )
}

function MomentsTimeline() {
  return (
    <ol className="space-y-2">
      {PLACEHOLDER_MOMENTS.map((m) => {
        const Icon = MOMENT_ICON[m.icon]
        return (
          <li
            key={m.id}
            className="flex items-start gap-3 rounded-2xl bg-white px-4 py-3 ring-1 ring-stone-200"
          >
            <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-stone-50 ring-1 ring-stone-100">
              <Icon className="h-4 w-4 text-stone-600" aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm leading-relaxed text-stone-800">{m.message}</span>
              <span className="mt-0.5 block text-xs text-stone-500">{m.time}</span>
            </span>
          </li>
        )
      })}
    </ol>
  )
}

export function DashboardPage() {
  const [focusCompleted, setFocusCompleted] = useState<Record<string, boolean>>({})
  const [focusPulseId, setFocusPulseId] = useState<string | null>(null)
  const [backlog, setBacklog] = useState<TaskListItem[]>(BACKLOG_TASKS)
  const [backlogPulseIds, setBacklogPulseIds] = useState<string[]>([])
  const [loggedNoteId, setLoggedNoteId] = useState<string | null>(null)
  const [noteFeedback, setNoteFeedback] = useState<string | null>(null)

  const toggleFocus = (id: string) => {
    setFocusCompleted((prev) => {
      const nowCompleted = !prev[id]
      if (nowCompleted) {
        setFocusPulseId(id)
        window.setTimeout(() => setFocusPulseId((p) => (p === id ? null : p)), 1200)
      }
      return { ...prev, [id]: nowCompleted }
    })
  }

  const toggleBacklog = (id: string) => {
    setBacklog((prev) => prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t)))
    setBacklogPulseIds((prev) => [...new Set([...prev, id])])
    window.setTimeout(() => setBacklogPulseIds((prev) => prev.filter((x) => x !== id)), 1200)
  }

  const onQuickNote = (note: (typeof QUICK_NOTES)[number]) => {
    setLoggedNoteId(note.id)
    setNoteFeedback(note.loggedLabel)
    window.setTimeout(() => setLoggedNoteId((prev) => (prev === note.id ? null : prev)), 1600)
  }

  useEffect(() => {
    if (!noteFeedback) return
    const t = window.setTimeout(() => setNoteFeedback(null), 2400)
    return () => window.clearTimeout(t)
  }, [noteFeedback])

  return (
    <div className="pt-2">
      <LiveSensorDevPanel />
      <GreetingHero />
      <GardenPulseCard />

      <SectionContainer title="Today, gently" subtitle="Three small things — nothing urgent.">
        <div className="space-y-2.5">
          {PLACEHOLDER_FOCUS.map((item) => (
            <FocusItemRow
              key={item.id}
              item={item}
              completed={!!focusCompleted[item.id]}
              justCompleted={focusPulseId === item.id}
              onToggle={() => toggleFocus(item.id)}
            />
          ))}
        </div>
      </SectionContainer>

      <SectionContainer title="Your beds" subtitle="Tap a bed for the full picture.">
        <div className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
          {PLACEHOLDER_ZONES.map((zone) => (
            <ZoneGalleryCard key={zone.id} zone={zone} />
          ))}
        </div>
      </SectionContainer>

      <SectionContainer title="A quiet moment" subtitle="From last night's camera.">
        <div className="flex items-start gap-3 rounded-2xl bg-gradient-to-br from-violet-50 to-sky-50 p-4 ring-1 ring-violet-100">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white shadow-sm ring-1 ring-violet-100">
            <Bird className="h-5 w-5 text-violet-700" aria-hidden="true" />
          </div>
          <div>
            <p className="font-semibold leading-snug text-stone-950">
              A little visitor passed through overnight
            </p>
            <p className="mt-1 text-sm leading-relaxed text-stone-700">
              Movement near the tomato bed around 2:10 AM — nothing seems disturbed.
            </p>
            <a
              href="#garden-camera"
              className="mt-2 inline-block text-sm font-semibold text-violet-800 underline-offset-2 hover:underline"
            >
              Peek at the camera ↓
            </a>
          </div>
        </div>
      </SectionContainer>

      <SectionContainer title="Tell the garden something" subtitle="A quick note can become tomorrow's task.">
        <div className="flex flex-wrap gap-2">
          {QUICK_NOTES.map((note) => (
            <button
              key={note.id}
              type="button"
              onClick={() => onQuickNote(note)}
              className={clsx(
                'rounded-2xl px-4 py-3 text-sm font-semibold shadow-sm ring-1 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 focus-visible:ring-offset-stone-50',
                loggedNoteId === note.id
                  ? 'bg-emerald-50 text-emerald-950 ring-emerald-200'
                  : 'bg-white text-stone-900 ring-stone-200 hover:bg-stone-50',
              )}
            >
              {loggedNoteId === note.id ? '✓ Noted' : note.label}
            </button>
          ))}
        </div>
        {noteFeedback ? (
          <p
            className="mt-3 rounded-2xl bg-emerald-50/70 px-4 py-2.5 text-sm font-semibold text-emerald-950 ring-1 ring-emerald-200"
            role="status"
          >
            {noteFeedback}
          </p>
        ) : null}
      </SectionContainer>

      <SectionContainer title="This morning, so far" subtitle="A few signals from the garden.">
        <MomentsTimeline />
      </SectionContainer>

      <SectionContainer title="Garden Camera" subtitle="Peek into what's happening outside.">
        <div id="garden-camera">
          <GardenCameraCard />
        </div>
      </SectionContainer>

      <SectionContainer title="Everything else" subtitle="No rush — these can wait.">
        <TaskList items={backlog} onToggle={toggleBacklog} completedPulseIds={backlogPulseIds} />
      </SectionContainer>

      <p className="mb-2 flex items-center justify-center gap-1.5 pb-6 text-center text-sm italic text-stone-400">
        <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
        {GARDEN_QUOTE}
      </p>
    </div>
  )
}
