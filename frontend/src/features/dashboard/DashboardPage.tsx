import clsx from 'clsx'
import { PrimaryPageIntro } from '../../components/PrimaryPageIntro'
import { AlertTriangle, CheckCircle2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { SectionContainer } from '../../components/SectionContainer'
import { TaskList, type TaskListItem } from '../../components/TaskList'
import { useGarden } from '../../lib/useGarden'
import {
  ELK_PLAN_TASKS_KEY,
  ensureTomatoesDemoTask,
  loadPlanTasks,
  savePlanTasks,
  togglePlanTask,
} from '../plan/planTasksStorage'
import type { DashboardAlertSeverity } from './dashboardViewModel'
import { getDashboardViewModel } from './dashboardViewModel'
import { NavLink } from 'react-router-dom'
import type { Garden, GardenMode, GardenProfile, WeatherSummary, Zone } from '../../types'
import type { GardenObservationEvent } from '../../lib/garden/GardenStore'

type QuickObservationTag = 'pests' | 'stressed' | 'soil_dry'

const quickFeedbackCopy: Record<
  GardenObservationEvent,
  { logged: string; duplicate: string }
> = {
  pests: {
    logged: 'Logged: pests spotted',
    duplicate: 'Already logged — task is in your list',
  },
  stressed: {
    logged: 'Logged: plant stress',
    duplicate: 'Already logged — task is in your list',
  },
  dry: {
    logged: 'Logged: soil dry',
    duplicate: 'Already logged — task is in your list',
  },
}

function observationZoneSignal(zoneName: string, recommendation: string) {
  if (!zoneName.includes('Tomatoes')) return null
  if (recommendation.startsWith('Pests spotted')) return 'Pest watch'
  if (recommendation.startsWith('Plants showing stress')) return 'Stress watch'
  return null
}

function moistureLabel(m: Zone['moistureStatus']): string {
  if (m === 'dry') return 'Dry'
  if (m === 'wet') return 'Wet'
  return 'Good'
}

function moistureClass(m: Zone['moistureStatus']): string {
  if (m === 'dry') return 'text-amber-800'
  if (m === 'wet') return 'text-sky-800'
  return 'text-emerald-800'
}

function alertRowClass(severity: DashboardAlertSeverity): string {
  switch (severity) {
    case 'critical':
      return 'border-l-[5px] border-l-rose-500 bg-rose-50/55 ring-rose-200/85'
    case 'warning':
      return 'border-l-[5px] border-l-amber-400 bg-amber-50/85 ring-amber-200/85'
    case 'info':
      return 'border-l-[5px] border-l-sky-400 bg-sky-50/75 ring-sky-200/90'
  }
}

export function DashboardPage() {
  const { garden, weather, profile, isLoading, error } = useGarden()

  if (isLoading) {
    return (
      <div className="py-6">
        <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-stone-200">
          <p className="text-base font-semibold text-stone-900">
            Getting things ready…
          </p>
          <p className="mt-2 text-sm leading-relaxed text-stone-600">
            One moment while we check today’s garden picture.
          </p>
        </div>
      </div>
    )
  }

  if (error || !garden) {
    return (
      <div className="py-6">
        <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-stone-200">
          <div className="flex items-start gap-3">
            <div
              className="grid h-10 w-10 place-items-center rounded-2xl bg-rose-50 ring-1 ring-rose-200"
              aria-hidden="true"
            >
              <AlertTriangle className="h-5 w-5 text-rose-900" />
            </div>
            <div>
              <p className="text-base font-semibold text-stone-900">
                We hit a small snag
              </p>
              <p className="mt-2 text-sm leading-relaxed text-stone-600">
                {error ?? 'Please try again.'}
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!weather) {
    return (
      <div className="py-6">
        <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-stone-200">
          <p className="text-base font-semibold text-stone-900">
            Getting today’s weather…
          </p>
          <p className="mt-2 text-sm leading-relaxed text-stone-600">
            One moment.
          </p>
        </div>
      </div>
    )
  }

  return (
    <DashboardContent
      garden={garden}
      weather={weather}
      profile={profile}
    />
  )
}

function DashboardContent({
  garden,
  weather,
  profile,
}: {
  garden: Garden
  weather: WeatherSummary
  profile: GardenProfile | null
}) {
  const {
    gardenMode,
    setGardenMode,
    toggleTask,
    simulateTomato24Hours,
    reportObservation,
  } = useGarden()

  const mode: GardenMode = gardenMode

  const vm = useMemo(
    () => getDashboardViewModel(garden, weather, profile, mode),
    [garden, weather, profile, mode],
  )

  const todayRecommendations = useMemo(
    () => vm.recommendations.slice(0, 3),
    [vm.recommendations],
  )

  const [planTasks, setPlanTasks] = useState(loadPlanTasks)
  const [taskFeedback, setTaskFeedback] = useState<string | null>(null)
  const [completedGhosts, setCompletedGhosts] = useState<
    Record<string, TaskListItem>
  >({})
  const [completedPulseIds, setCompletedPulseIds] = useState<string[]>([])
  const [updatedZoneId, setUpdatedZoneId] = useState<string | null>(null)
  const [quickLogToast, setQuickLogToast] = useState<string | null>(null)
  const [loggedQuickTag, setLoggedQuickTag] = useState<string | null>(null)
  const [quickInlineFeedback, setQuickInlineFeedback] = useState<string | null>(
    null,
  )

  useEffect(() => {
    const sync = () => setPlanTasks(loadPlanTasks())
    const onStorage = (e: StorageEvent) => {
      if (e.key === ELK_PLAN_TASKS_KEY) sync()
    }
    window.addEventListener('storage', onStorage)
    window.addEventListener('focus', sync)
    return () => {
      window.removeEventListener('storage', onStorage)
      window.removeEventListener('focus', sync)
    }
  }, [])

  useEffect(() => {
    if (!taskFeedback) return
    const t = window.setTimeout(() => setTaskFeedback(null), 2200)
    return () => window.clearTimeout(t)
  }, [taskFeedback])

  useEffect(() => {
    if (!quickLogToast) return
    const t = window.setTimeout(() => setQuickLogToast(null), 1600)
    return () => window.clearTimeout(t)
  }, [quickLogToast])

  useEffect(() => {
    if (!quickInlineFeedback) return
    const t = window.setTimeout(() => setQuickInlineFeedback(null), 2400)
    return () => window.clearTimeout(t)
  }, [quickInlineFeedback])

  useEffect(() => {
    if (!loggedQuickTag) return
    const t = window.setTimeout(() => setLoggedQuickTag(null), 1500)
    return () => window.clearTimeout(t)
  }, [loggedQuickTag])

  const taskListItems = useMemo(() => {
    const forGardenToday = planTasks.filter(
      (t) =>
        t.gardenId === garden.id &&
        !t.completed &&
        (t.section === 'today' || t.section === undefined),
    )
    const gardenTasks = vm.tasks.map((t) => ({
      id: t.id,
      title: t.title,
      supportiveNote: t.supportiveNote,
      completed: t.completed,
    }))
    const planTaskItems = forGardenToday.slice(0, 5).map((t) => ({
      id: t.id,
      title: t.title,
      completed: t.completed,
    }))
    const ghostItems = Object.values(completedGhosts)
    const seen = new Set<string>()
    return [...ghostItems, ...gardenTasks, ...planTaskItems].filter((t) => {
      if (seen.has(t.id)) return false
      seen.add(t.id)
      return true
    })
  }, [planTasks, garden.id, vm.tasks, completedGhosts])

  const showCompletionFeedback = ({
    item,
    message,
    zoneId,
    exitTask,
  }: {
    item: TaskListItem
    message: string
    zoneId?: string | null
    exitTask: boolean
  }) => {
    setTaskFeedback(message)
    setCompletedPulseIds((prev) => [...new Set([...prev, item.id])])
    if (exitTask) {
      setCompletedGhosts((prev) => ({
        ...prev,
        [item.id]: { ...item, completed: true },
      }))
    }
    if (zoneId) setUpdatedZoneId(zoneId)

    window.setTimeout(() => {
      setCompletedPulseIds((prev) => prev.filter((id) => id !== item.id))
      if (zoneId) setUpdatedZoneId((prev) => (prev === zoneId ? null : prev))
    }, 1200)

    if (exitTask) {
      window.setTimeout(() => {
        setCompletedGhosts((prev) => {
          const { [item.id]: _done, ...rest } = prev
          return rest
        })
      }, 2600)
    }
  }

  const onTaskToggle = (id: string) => {
    const fromPlan = planTasks.some(
      (t) => t.id === id && t.gardenId === garden.id,
    )
    const visibleTask = taskListItems.find((t) => t.id === id)
    if (vm.tasks.some((t) => t.id === id)) {
      const result = toggleTask(id)
      if (fromPlan) {
        setPlanTasks((prev) => {
          const next = ensureTomatoesDemoTask(togglePlanTask(prev, id), true)
          savePlanTasks(next)
          return next
        })
      }
      if (result?.completed && visibleTask) {
        showCompletionFeedback({
          item: visibleTask,
          message: result.message,
          zoneId: result.log.zoneId,
          exitTask:
            result.log.taskType === 'water' ||
            result.log.taskType === 'hold-water',
        })
      } else if (result) {
        setTaskFeedback(result.message)
      }
    } else if (fromPlan) {
      const planTask = planTasks.find(
        (t) => t.id === id && t.gardenId === garden.id,
      )
      setPlanTasks((prev) => {
        const next = togglePlanTask(prev, id)
        savePlanTasks(next)
        return next
      })
      if (planTask && !planTask.completed && visibleTask) {
        const message = `${planTask.title} done`
        console.info('[elk-garden] task completed', {
          zoneId: null,
          taskType: 'other',
          timestamp: new Date().toISOString(),
          previousState: { taskCompleted: planTask.completed },
          newState: { taskCompleted: true },
        })
        showCompletionFeedback({
          item: visibleTask,
          message,
          zoneId: null,
          exitTask: true,
        })
      }
    }
  }

  const onQuickInput = (
    label: string,
    tag: QuickObservationTag,
    event: GardenObservationEvent,
  ) => {
    console.info('[elk-garden] observation', { tag, label })
    const result = reportObservation(event)
    setLoggedQuickTag(tag)
    setQuickInlineFeedback(
      result.added
        ? quickFeedbackCopy[event].logged
        : quickFeedbackCopy[event].duplicate,
    )
    setQuickLogToast(result.added ? quickFeedbackCopy[event].logged : quickFeedbackCopy[event].duplicate)
  }

  const onSimulate24Hours = () => {
    simulateTomato24Hours()
    setPlanTasks((prev) => {
      const next = ensureTomatoesDemoTask(prev, true)
      savePlanTasks(next)
      return next
    })
  }

  return (
    <div className="pt-2">
      <PrimaryPageIntro
        title="Dashboard"
        description="Skim alerts and today’s priorities first — the rest can wait."
      />

      {taskFeedback ? (
        <div
          className="mb-5 flex items-center gap-3 rounded-2xl bg-emerald-50/80 px-4 py-3 text-sm font-bold text-emerald-950 shadow-sm ring-1 ring-emerald-200 animate-task-complete-pulse sm:text-base"
          role="status"
          aria-live="polite"
        >
          <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-700 animate-task-check-pop" />
          <span>{taskFeedback}</span>
        </div>
      ) : null}

      <div className="mb-5 sm:mb-6">
        <div className="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-stone-200 sm:p-4">
          <p className="text-sm font-semibold text-stone-900">Garden mode</p>
          <div
            className="mt-2 grid grid-cols-2 gap-2 rounded-2xl bg-stone-100 p-1.5 ring-1 ring-stone-200 sm:mt-3 sm:p-2"
            role="group"
            aria-label="Garden mode"
          >
            <button
              type="button"
              onClick={() => setGardenMode('calm_supportive')}
              className={
                mode === 'calm_supportive'
                  ? 'rounded-2xl bg-white px-3 py-2.5 text-sm font-semibold text-stone-950 shadow-sm ring-1 ring-stone-200 sm:px-4 sm:py-3 sm:text-base'
                  : 'rounded-2xl px-3 py-2.5 text-sm font-semibold text-stone-700 hover:bg-white/70 sm:px-4 sm:py-3 sm:text-base'
              }
              aria-pressed={mode === 'calm_supportive'}
            >
              Kathy 🌿
            </button>
            <button
              type="button"
              onClick={() => setGardenMode('production')}
              className={
                mode === 'production'
                  ? 'rounded-2xl bg-white px-3 py-2.5 text-sm font-semibold text-stone-950 shadow-sm ring-1 ring-stone-200 sm:px-4 sm:py-3 sm:text-base'
                  : 'rounded-2xl px-3 py-2.5 text-sm font-semibold text-stone-700 hover:bg-white/70 sm:px-4 sm:py-3 sm:text-base'
              }
              aria-pressed={mode === 'production'}
            >
              Lorne 🔧
            </button>
          </div>
        </div>
      </div>

      <section className="pb-6 sm:pb-8">
        <h2 className="text-xs font-bold uppercase tracking-wide text-stone-500">
          Alerts
        </h2>
        {vm.alerts.length === 0 ? (
          <div className="mt-2 rounded-2xl bg-stone-50/80 px-4 py-3 text-sm leading-relaxed text-stone-600 ring-1 ring-stone-200/80">
            <p className="font-semibold text-stone-800">
              Waiting for sensor feedback.
            </p>
            <p className="mt-1">
              This prototype demonstrates how future garden signals can create
              real-time alerts, recommendations, and tasks. Signals can come
              from moisture sensors, cameras, weather feeds, and human garden
              observations. Humans are sensors too.
            </p>
          </div>
        ) : (
          <ul className="mt-2 space-y-2">
            {vm.alerts.map((a) => (
              <li
                key={a.id}
                className={clsx(
                  'rounded-r-2xl py-3 pl-4 pr-4 text-sm font-bold leading-snug text-stone-950 ring-1 sm:text-base',
                  alertRowClass(a.severity),
                )}
              >
                {a.message}
              </li>
            ))}
          </ul>
        )}
      </section>

      <SectionContainer
        title="Today"
        subtitle="Sensor-driven recommendations and tasks will show up here when a signal needs attention."
      >
        {todayRecommendations.length === 0 ? (
          <p className="rounded-2xl bg-white px-4 py-3 text-sm font-medium leading-relaxed text-stone-600 shadow-sm ring-1 ring-stone-200">
            Sensor-driven recommendations will appear here.
          </p>
        ) : (
          <div className="space-y-2 sm:space-y-3">
            {todayRecommendations.map((r) => (
              <details
                key={r.id}
                className="rounded-2xl bg-white shadow-sm ring-1 ring-stone-200"
              >
                <summary className="flex cursor-pointer list-none items-start justify-between gap-3 p-4 [&::-webkit-details-marker]:hidden">
                  <span className="text-left text-base font-bold leading-snug text-stone-950">
                    {r.title}
                  </span>
                  <span className="shrink-0 text-sm font-semibold text-stone-600">
                    {r.estimatedTimeLabel}
                  </span>
                </summary>
                <div className="space-y-3 border-t border-stone-100 px-4 pb-4 pt-3 text-sm leading-relaxed text-stone-700">
                  <p>{r.why}</p>
                  <p className="font-semibold text-stone-900">{r.nextStep}</p>
                  {r.expanders?.length ? (
                    <div className="space-y-2 pt-1">
                      {r.expanders.map((e) => (
                        <details
                          key={e.title}
                          className="rounded-2xl bg-stone-50/80 p-3 ring-1 ring-stone-200"
                        >
                          <summary className="cursor-pointer text-sm font-semibold text-stone-900 [&::-webkit-details-marker]:hidden">
                            {e.title}
                          </summary>
                          <p className="mt-2 text-sm leading-relaxed text-stone-700">
                            {e.body}
                          </p>
                        </details>
                      ))}
                    </div>
                  ) : null}
                </div>
              </details>
            ))}
          </div>
        )}
      </SectionContainer>

      <SectionContainer title="Zone status" subtitle="Moisture at a glance — tap a zone for detail.">
        <div className="grid gap-2 sm:grid-cols-2">
          {vm.zones.map((z) => {
              const zoneSignal = observationZoneSignal(z.name, z.recommendation)
              return (
                <NavLink
                  key={z.id}
                  to={`/zones/${z.id}`}
                  className={clsx(
                    'flex flex-col gap-1 rounded-2xl bg-white px-4 py-3 shadow-sm ring-1 ring-stone-200 transition hover:bg-stone-50/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 focus-visible:ring-offset-stone-50',
                    updatedZoneId === z.id &&
                      'animate-task-complete-pulse bg-emerald-50/70 ring-emerald-300',
                  )}
                >
                  <span className="font-semibold leading-snug text-stone-950">
                    {z.name}
                  </span>
                  <span className="text-sm font-bold leading-snug text-stone-800">
                    <span className={clsx(moistureClass(z.moistureStatus))}>
                      {moistureLabel(z.moistureStatus)}
                    </span>
                    {zoneSignal ? (
                      <>
                        <span className="font-normal text-stone-400"> • </span>
                        <span className="text-amber-900">{zoneSignal}</span>
                      </>
                    ) : null}
                    {!zoneSignal &&
                    (z.health === 'watch' || z.health === 'action') ? (
                      <>
                        <span className="font-normal text-stone-400"> • </span>
                        <span className="text-amber-900">Signal received</span>
                      </>
                    ) : null}
                  </span>
                  {z.health === 'watch' || z.health === 'action' ? (
                    <span className="mt-1 text-sm leading-snug text-stone-600">
                      {z.recommendation}
                    </span>
                  ) : null}
                </NavLink>
              )
          })}
        </div>
      </SectionContainer>

      <SectionContainer
        title="All tasks"
        subtitle="Backlog and reminders — nothing here is automatically urgent."
      >
        <div className="sr-only" role="status" aria-live="polite">
          {taskFeedback ?? ''}
        </div>
        {taskListItems.length === 0 ? (
          <p className="rounded-2xl bg-white px-4 py-3 text-sm font-medium leading-relaxed text-stone-600 shadow-sm ring-1 ring-stone-200">
            No sensor-created tasks yet. Use the Fake Sensor Panel to simulate
            garden activity.
          </p>
        ) : (
          <TaskList
            items={taskListItems}
            onToggle={onTaskToggle}
            completedPulseIds={completedPulseIds}
            exitingTaskIds={Object.keys(completedGhosts)}
          />
        )}
      </SectionContainer>

      <SectionContainer title="Report something" subtitle="What did you notice?">
        <div className="sr-only" role="status" aria-live="polite">
          {quickLogToast ?? ''}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onQuickInput('Saw pests', 'pests', 'pests')}
            className={clsx(
              'rounded-2xl px-4 py-3 text-sm font-semibold shadow-sm ring-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 focus-visible:ring-offset-stone-50',
              loggedQuickTag === 'pests'
                ? 'bg-emerald-50 text-emerald-950 ring-emerald-200'
                : 'bg-white text-stone-900 ring-stone-200 hover:bg-stone-50',
            )}
          >
            {loggedQuickTag === 'pests' ? '✓ Logged' : 'Saw pests'}
          </button>
          <button
            type="button"
            onClick={() => onQuickInput('Plants stressed', 'stressed', 'stressed')}
            className={clsx(
              'rounded-2xl px-4 py-3 text-sm font-semibold shadow-sm ring-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 focus-visible:ring-offset-stone-50',
              loggedQuickTag === 'stressed'
                ? 'bg-emerald-50 text-emerald-950 ring-emerald-200'
                : 'bg-white text-stone-900 ring-stone-200 hover:bg-stone-50',
            )}
          >
            {loggedQuickTag === 'stressed' ? '✓ Logged' : 'Plants stressed'}
          </button>
          <button
            type="button"
            onClick={() => onQuickInput('Soil dry', 'soil_dry', 'dry')}
            className={clsx(
              'rounded-2xl px-4 py-3 text-sm font-semibold shadow-sm ring-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 focus-visible:ring-offset-stone-50',
              loggedQuickTag === 'soil_dry'
                ? 'bg-emerald-50 text-emerald-950 ring-emerald-200'
                : 'bg-white text-stone-900 ring-stone-200 hover:bg-stone-50',
            )}
          >
            {loggedQuickTag === 'soil_dry' ? '✓ Logged' : 'Soil dry'}
          </button>
        </div>
        {quickInlineFeedback ? (
          <p
            className="mt-3 rounded-2xl bg-emerald-50/70 px-4 py-2.5 text-sm font-semibold text-emerald-950 ring-1 ring-emerald-200"
            role="status"
          >
            {quickInlineFeedback}
          </p>
        ) : null}
        <button
          type="button"
          onClick={onSimulate24Hours}
          className="mt-3 rounded-2xl bg-stone-100 px-4 py-2.5 text-xs font-semibold text-stone-700 ring-1 ring-stone-200 hover:bg-stone-200/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 focus-visible:ring-offset-stone-50"
        >
          Dev test: simulate 24h
        </button>
      </SectionContainer>

      {/*
        "View insights & full detail" — hidden until the full insights experience ships.
      */}
    </div>
  )
}
