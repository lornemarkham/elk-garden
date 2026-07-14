import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import clsx from 'clsx'
import { CheckCircle2, ChevronDown } from 'lucide-react'
import { PrimaryPageIntro } from '../../components/PrimaryPageIntro'
import { SectionContainer } from '../../components/SectionContainer'
import { TaskList } from '../../components/TaskList'
import { GardenModeSelector } from '../../components/GardenModeSelector'
import { useGarden } from '../../lib/useGarden'
import {
  ELK_GARDEN_STATE_KEY,
  loadElkGardenState,
  saveElkGardenState,
  type ElkGardenPersistedState,
  type StoredGardenBed,
} from '../canvas/gardenStateStorage'
import { loadElkGardenPlan, ELK_GARDEN_PLAN_KEY } from '../plan/elkGardenPlanStorage'
import { fetchGeneratedTasks } from '../plan/tasksApi'
import { unionCropsFromState } from '../plan/planBedCrops'
import {
  loadPlanTasks,
  ensureTomatoesDemoTask,
  hasTomatoesInPlanInput,
  mergePlanTaskCompletions,
  savePlanTasks,
  togglePlanTask,
  type PlanTaskRecord,
} from '../plan/planTasksStorage'
import type { TaskListItem } from '../../components/TaskList'
import {
  bedStatusBadgeClass,
  computeBedTimingDisplay,
  formatPlannedDateShort,
  plannedAlignment,
  plannedAlignmentBadgeClass,
} from '../plan/bedTimingStatus'
import {
  bedIdForTask,
  groupTasksByBed,
  type BedTaskGroup,
} from './taskBedGroups'

function toListItems(records: PlanTaskRecord[]): TaskListItem[] {
  return records.map((t) => ({
    id: t.id,
    title: t.title,
    supportiveNote: t.supportiveNote,
    completed: t.completed,
    why: t.why,
    watchFor: t.watchFor,
    doneRight: t.doneRight,
  }))
}

function firstIncompleteFromGroups(
  todayGroups: BedTaskGroup[],
  upNextGroups: BedTaskGroup[],
): PlanTaskRecord | null {
  for (const g of todayGroups) {
    if (g.tasks.length > 0) return g.tasks[0]!
  }
  for (const g of upNextGroups) {
    if (g.tasks.length > 0) return g.tasks[0]!
  }
  return null
}

function taskDoneMessage(message: string): string {
  const cleaned = message.trim()
  if (!cleaned) return 'Done — task complete. Nice work.'
  return `Done — ${cleaned.charAt(0).toLowerCase()}${cleaned.slice(1)}. Nice work.`
}

function TaskBedTimingIntro({
  bed,
  bedLabel,
}: {
  bed: StoredGardenBed | undefined
  bedLabel: string
}) {
  const timing = bed ? computeBedTimingDisplay(bed) : null
  const plannedRaw = bed?.plannedPlantingDate
  const plannedOk = plannedRaw && /^\d{4}-\d{2}-\d{2}$/.test(plannedRaw)
  const align = bed && plannedOk ? plannedAlignment(bed) : null
  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <h4 className="text-[11px] font-semibold uppercase tracking-wide text-stone-500">
          {bedLabel}
        </h4>
        {timing ? (
          <span
            className={clsx(
              'inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold leading-none ring-1',
              bedStatusBadgeClass(timing.status),
            )}
          >
            {timing.statusLabel}
          </span>
        ) : null}
      </div>
      {timing ? (
        <p className="mt-1 text-xs leading-snug text-stone-600">
          <span className="font-medium text-stone-700">Recommended: </span>
          {timing.timingHint}
        </p>
      ) : null}
      {plannedOk && plannedRaw ? (
        <p className="mt-0.5 text-xs leading-snug text-stone-500">
          Planned: {formatPlannedDateShort(plannedRaw)}
          {align ? (
            <span
              className={clsx(
                'ml-2 inline-flex rounded-full px-1.5 py-0.5 text-[10px] font-semibold ring-1',
                plannedAlignmentBadgeClass(align),
              )}
            >
              {align === 'on_track'
                ? 'On track'
                : align === 'early'
                  ? 'Early'
                  : 'Late'}
            </span>
          ) : null}
        </p>
      ) : null}
    </div>
  )
}

function StartHereSection({
  task,
  beds,
  onToggle,
  completedPulseIds,
}: {
  task: PlanTaskRecord
  beds: StoredGardenBed[]
  onToggle: (id: string) => void
  completedPulseIds?: string[]
}) {
  const bedId = bedIdForTask(task.id, beds)
  const bed =
    bedId != null ? beds.find((a) => a.id === bedId) : undefined
  const bedLabel =
    bed != null ? bed.name.trim() || 'Unnamed bed' : 'All garden'

  return (
    <section
      className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm ring-1 ring-stone-200 sm:p-6"
      aria-labelledby="start-here-heading"
    >
      <p
        id="start-here-heading"
        className="text-xs font-semibold uppercase tracking-wide text-stone-500"
      >
        Top priority
      </p>
      <p className="mt-1.5 text-sm leading-relaxed text-stone-700">
        Your next gentle step — tap the card when you&apos;re finished, or come
        back to it later.
      </p>
      <div className="mt-4 space-y-2">
        <TaskBedTimingIntro bed={bed} bedLabel={bedLabel} />
        <TaskList
          items={toListItems([task])}
          onToggle={onToggle}
          variant="featured"
          completedPulseIds={completedPulseIds}
        />
      </div>
    </section>
  )
}

function TaskSectionByBed({
  heading,
  subheading,
  groups,
  beds,
  emptyHint,
  onToggle,
  completedPulseIds,
}: {
  heading: string
  subheading?: string
  groups: BedTaskGroup[]
  beds: StoredGardenBed[]
  emptyHint: string
  onToggle: (id: string) => void
  completedPulseIds?: string[]
}) {
  return (
    <div className="space-y-2">
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-stone-500">
          {heading}
        </h3>
        {subheading ? (
          <p className="mt-1 text-sm leading-relaxed text-stone-600">
            {subheading}
          </p>
        ) : null}
      </div>
      {groups.length === 0 ? (
        <p className="rounded-2xl bg-stone-50/80 px-3 py-3 text-sm leading-relaxed text-stone-600 ring-1 ring-stone-200/80">
          {emptyHint}
        </p>
      ) : (
        <div className="space-y-5">
          {groups.map((g) => {
            const bed =
              g.bedId != null
                ? beds.find((a) => a.id === g.bedId)
                : undefined
            return (
              <div key={g.key} className="space-y-2">
                <TaskBedTimingIntro bed={bed} bedLabel={g.bedLabel} />
                <TaskList
                  items={toListItems(g.tasks)}
                  onToggle={onToggle}
                  completedPulseIds={completedPulseIds}
                />
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function bedRowPlantingProgress(bed: StoredGardenBed): {
  total: number
  planted: number
  pct: number
  allPlanted: boolean
  summaryLine: string
} {
  const total = bed.rows.length
  const planted = bed.rows.filter((r) => r.planted).length
  const pct = total > 0 ? Math.round((planted / total) * 100) : 0
  const summaryLine =
    total === 0
      ? 'No rows yet'
      : `${planted} / ${total} rows planted (${pct}%)`
  const allPlanted = total > 0 && planted === total
  return { total, planted, pct, allPlanted, summaryLine }
}

export function TasksPage() {
  const { isLoading, error, gardenMode, setGardenMode, toggleTask } = useGarden()

  const [elkState, setElkState] = useState<ElkGardenPersistedState>(loadElkGardenState)
  const [planRecord, setPlanRecord] = useState(() => loadElkGardenPlan())

  const refreshFromStorage = useCallback(() => {
    setElkState(loadElkGardenState())
    setPlanRecord(loadElkGardenPlan())
  }, [])

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (
        e.key === ELK_GARDEN_STATE_KEY ||
        e.key === ELK_GARDEN_PLAN_KEY
      ) {
        refreshFromStorage()
      }
    }
    const onFocus = () => refreshFromStorage()
    window.addEventListener('storage', onStorage)
    window.addEventListener('focus', onFocus)
    return () => {
      window.removeEventListener('storage', onStorage)
      window.removeEventListener('focus', onFocus)
    }
  }, [refreshFromStorage])

  const plan = planRecord?.plan ?? null

  const userCrops = useMemo(
    () => unionCropsFromState(elkState.crops, elkState.beds),
    [elkState.crops, elkState.beds],
  )

  const [generated, setGenerated] = useState<PlanTaskRecord[] | null>(null)

  const [tasks, setTasks] = useState<PlanTaskRecord[]>(() => loadPlanTasks())
  const [taskFeedback, setTaskFeedback] = useState<string | null>(null)
  const [pendingCompletedTaskIds, setPendingCompletedTaskIds] = useState<
    string[]
  >([])
  const [recentCompletedTaskIds, setRecentCompletedTaskIds] = useState<
    string[]
  >([])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const g = await fetchGeneratedTasks({
          plan,
          beds: elkState.beds,
          threats: elkState.threats,
          userCrops,
        })
        if (!cancelled) setGenerated(g)
      } catch (e) {
        console.error('[tasks] fetchGeneratedTasks', e)
        if (!cancelled) setGenerated(null)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [plan, elkState.beds, elkState.threats, userCrops])

  useEffect(() => {
    if (generated === null) return
    setTasks((prev) => {
      const next = ensureTomatoesDemoTask(
        mergePlanTaskCompletions(generated, prev),
        hasTomatoesInPlanInput({ crops: userCrops, beds: elkState.beds }),
      )
      savePlanTasks(next)
      return next
    })
  }, [generated, userCrops, elkState.beds])

  useEffect(() => {
    if (!taskFeedback) return
    const t = window.setTimeout(() => setTaskFeedback(null), 2400)
    return () => window.clearTimeout(t)
  }, [taskFeedback])

  const setRowPlanted = useCallback(
    (bedId: string, rowId: string, planted: boolean) => {
      setElkState((prev) => {
        const next: ElkGardenPersistedState = {
          ...prev,
          lastEditedBedId: bedId,
          beds: prev.beds.map((a) =>
            a.id !== bedId
              ? a
              : {
                  ...a,
                  rows: a.rows.map((r) =>
                    r.id === rowId ? { ...r, planted } : r,
                  ),
                },
          ),
        }
        saveElkGardenState(next)
        return next
      })
    },
    [],
  )

  const setBedGardenLog = useCallback((bedId: string, gardenLog: string) => {
    setElkState((prev) => {
      const next: ElkGardenPersistedState = {
        ...prev,
        lastEditedBedId: bedId,
        beds: prev.beds.map((a) =>
          a.id === bedId ? { ...a, gardenLog } : a,
        ),
      }
      saveElkGardenState(next)
      return next
    })
  }, [])

  const setRowGardenLog = useCallback(
    (bedId: string, rowId: string, gardenLog: string) => {
      setElkState((prev) => {
        const next: ElkGardenPersistedState = {
          ...prev,
          lastEditedBedId: bedId,
          beds: prev.beds.map((a) =>
            a.id !== bedId
              ? a
              : {
                  ...a,
                  rows: a.rows.map((r) =>
                    r.id === rowId ? { ...r, gardenLog } : r,
                  ),
                },
          ),
        }
        saveElkGardenState(next)
        return next
      })
    },
    [],
  )

  const onToggleTask = useCallback((taskId: string) => {
    if (pendingCompletedTaskIds.includes(taskId)) return

    const task = tasks.find((t) => t.id === taskId)
    if (!task) return

    if (task.completed) {
      setTasks((prev) => {
        const next = togglePlanTask(prev, taskId)
        savePlanTasks(next)
        return next
      })
      setRecentCompletedTaskIds((prev) => prev.filter((id) => id !== taskId))
      return
    }

    const result =
      taskId === 'task_water_tomatoes' ? toggleTask(taskId) : null
    setTaskFeedback(taskDoneMessage(result?.message ?? `${task.title} done`))
    setPendingCompletedTaskIds((prev) => [...new Set([...prev, taskId])])

    window.setTimeout(() => {
      setTasks((prev) => {
        const next = ensureTomatoesDemoTask(
          togglePlanTask(prev, taskId),
          hasTomatoesInPlanInput({ crops: userCrops, beds: elkState.beds }),
        )
        savePlanTasks(next)
        return next
      })
      setRecentCompletedTaskIds((prev) => [...new Set([...prev, taskId])])
      setPendingCompletedTaskIds((prev) => prev.filter((id) => id !== taskId))
    }, 2600)
  }, [elkState.beds, pendingCompletedTaskIds, tasks, toggleTask, userCrops])

  const justCompletedTaskIds = useMemo(
    () => [...new Set([...pendingCompletedTaskIds, ...recentCompletedTaskIds])],
    [pendingCompletedTaskIds, recentCompletedTaskIds],
  )

  const pendingCompletedSet = useMemo(
    () => new Set(pendingCompletedTaskIds),
    [pendingCompletedTaskIds],
  )
  const visibleTasks = useMemo(
    () =>
      tasks.map((t) =>
        pendingCompletedSet.has(t.id) ? { ...t, completed: true } : t,
      ),
    [tasks, pendingCompletedSet],
  )
  const visibleTaskById = useMemo(
    () => new Map(visibleTasks.map((t) => [t.id, t])),
    [visibleTasks],
  )
  const showCompletedStateInGroups = useCallback(
    (groups: BedTaskGroup[]) =>
      groups.map((g) => ({
        ...g,
        tasks: g.tasks.map((t) => visibleTaskById.get(t.id) ?? t),
      })),
    [visibleTaskById],
  )

  const incomplete = tasks.filter((t) => !t.completed)
  const done = tasks.filter((t) => t.completed)

  const today = incomplete.filter((t) => (t.section ?? 'up_next') === 'today')
  const upNext = incomplete.filter((t) => (t.section ?? 'up_next') === 'up_next')

  const todayGroups = useMemo(
    () => groupTasksByBed(today, elkState.beds),
    [today, elkState.beds],
  )
  const upNextGroups = useMemo(
    () => groupTasksByBed(upNext, elkState.beds),
    [upNext, elkState.beds],
  )
  const doneGroups = useMemo(
    () => groupTasksByBed(done, elkState.beds),
    [done, elkState.beds],
  )

  const startHereTask = useMemo(
    () => firstIncompleteFromGroups(todayGroups, upNextGroups),
    [todayGroups, upNextGroups],
  )
  const visibleStartHereTask = startHereTask
    ? visibleTaskById.get(startHereTask.id) ?? startHereTask
    : null

  const remainingIncomplete = useMemo(() => {
    if (!startHereTask) return incomplete
    return incomplete.filter((t) => t.id !== startHereTask.id)
  }, [incomplete, startHereTask])

  const upNextCombinedGroups = useMemo(
    () => groupTasksByBed(remainingIncomplete, elkState.beds),
    [remainingIncomplete, elkState.beds],
  )
  const visibleUpNextCombinedGroups = useMemo(
    () => showCompletedStateInGroups(upNextCombinedGroups),
    [showCompletedStateInGroups, upNextCombinedGroups],
  )
  const visibleDoneGroups = useMemo(
    () => showCompletedStateInGroups(doneGroups),
    [showCompletedStateInGroups, doneGroups],
  )

  const upNextEmptyHint = useMemo(() => {
    if (startHereTask && remainingIncomplete.length === 0) {
      return 'Nothing queued after that — a short list is easier to enjoy. Ask ELK on the Plan tab when you want more steps.'
    }
    return 'Work through these when you have time — the order is flexible.'
  }, [startHereTask, remainingIncomplete.length])

  const [expandedBedId, setExpandedBedId] = useState<string | null>(null)
  const bedsExpandInitRef = useRef(false)
  const prevLastEditedForBedsRef = useRef(elkState.lastEditedBedId)

  useEffect(() => {
    if (elkState.beds.length === 0) {
      setExpandedBedId(null)
      return
    }
    if (!bedsExpandInitRef.current) {
      bedsExpandInitRef.current = true
      const lid = elkState.lastEditedBedId
      setExpandedBedId(
        lid && elkState.beds.some((a) => a.id === lid)
          ? lid
          : elkState.beds[0]!.id,
      )
      return
    }
    setExpandedBedId((prev) => {
      if (prev !== null && elkState.beds.some((a) => a.id === prev)) return prev
      if (prev === null) return null
      const lid = elkState.lastEditedBedId
      if (lid && elkState.beds.some((a) => a.id === lid)) return lid
      return elkState.beds[0]!.id
    })
  }, [elkState.beds, elkState.lastEditedBedId])

  useEffect(() => {
    const lid = elkState.lastEditedBedId
    if (
      bedsExpandInitRef.current &&
      lid &&
      lid !== prevLastEditedForBedsRef.current &&
      elkState.beds.some((a) => a.id === lid)
    ) {
      setExpandedBedId(lid)
    }
    prevLastEditedForBedsRef.current = lid
  }, [elkState.lastEditedBedId, elkState.beds])

  const handleGardenBedToggle = useCallback((bedId: string) => {
    let nextExpanded: string | null = null
    setExpandedBedId((prev) => {
      nextExpanded = prev === bedId ? null : bedId
      return nextExpanded
    })
    if (nextExpanded !== null) {
      const expandedId = nextExpanded
      setElkState((s) => {
        if (s.lastEditedBedId === expandedId) return s
        const out: ElkGardenPersistedState = {
          ...s,
          lastEditedBedId: expandedId,
        }
        saveElkGardenState(out)
        return out
      })
    }
  }, [])

  const hasGardenBeds = elkState.beds.length > 0

  if (isLoading) {
    return (
      <div className="py-6">
        <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-stone-200">
          <p className="text-base font-semibold text-stone-900">Loading…</p>
          <p className="mt-2 text-sm leading-relaxed text-stone-600">
            One moment.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="pt-2">
      <PrimaryPageIntro
        title="Tasks"
        description="A clear first step, then the rest when you’re ready, plus what you’ve already finished. Tap a step when it’s done — tap again to undo."
      />
      {error ? (
        <div className="mb-6 rounded-2xl bg-amber-50/90 px-4 py-3.5 text-sm leading-relaxed text-amber-950 ring-1 ring-amber-200/80 sm:px-5">
          Demo garden preview didn’t load — your saved garden beds and tasks
          below are still on this device.
        </div>
      ) : null}
      {taskFeedback ? (
        <div
          className="mb-6 flex items-center gap-3 rounded-2xl bg-emerald-50/80 px-4 py-3 text-sm font-bold text-emerald-950 shadow-sm ring-1 ring-emerald-200 sm:text-base"
          role="status"
          aria-live="polite"
        >
          <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-700" />
          <span>{taskFeedback}</span>
        </div>
      ) : null}

      <SectionContainer
        title="Your garden steps"
        subtitle="One thing to begin with, then the rest when you’re ready — no need to treat it like a rigid checklist."
      >
        {tasks.length === 0 ? (
          <p className="rounded-2xl bg-stone-50/80 px-4 py-4 text-sm leading-relaxed text-stone-600 ring-1 ring-stone-200/80">
            No tasks yet. On the{' '}
            <span className="font-medium text-stone-800">Plan</span> tab, shape
            your draft and run Ask ELK — your steps will land here, starting
            with a clear &quot;Start here&quot; when there&apos;s something to
            do.
          </p>
        ) : (
          <div className="space-y-8">
            {visibleStartHereTask ? (
              <StartHereSection
                task={visibleStartHereTask}
                beds={elkState.beds}
                onToggle={onToggleTask}
                completedPulseIds={justCompletedTaskIds}
              />
            ) : (
              <p
                className="rounded-2xl bg-emerald-50/55 px-4 py-4 text-sm leading-relaxed text-emerald-950 ring-1 ring-emerald-200/80"
                role="status"
              >
                You&apos;re all caught up — every step on your list is done for
                now. When you&apos;re ready for more, update the Plan tab and
                run Ask ELK again.
              </p>
            )}
            {startHereTask != null || remainingIncomplete.length > 0 ? (
              <TaskSectionByBed
                heading="Up next"
                subheading="Everything after your first step — work through it at your own pace."
                groups={visibleUpNextCombinedGroups}
                beds={elkState.beds}
                emptyHint={upNextEmptyHint}
                onToggle={onToggleTask}
                completedPulseIds={justCompletedTaskIds}
              />
            ) : null}
            <TaskSectionByBed
              heading="Done today"
              subheading="Completed steps stay visible here so you can see the progress you made."
              groups={visibleDoneGroups}
              beds={elkState.beds}
              emptyHint="Nothing here yet. Finished steps land here — tap to undo if you need to."
              onToggle={onToggleTask}
              completedPulseIds={justCompletedTaskIds}
            />
          </div>
        )}
      </SectionContainer>

      {hasGardenBeds ? (
        <SectionContainer
          title="Garden beds & rows"
          subtitle="Track what’s in the ground and quick notes from the field."
        >
          <div className="space-y-3 sm:space-y-4">
            {elkState.beds.map((a) => (
              <GardenBedCard
                key={a.id}
                bed={a}
                expanded={expandedBedId === a.id}
                onToggle={() => handleGardenBedToggle(a.id)}
                onPlantedChange={setRowPlanted}
                onBedLogChange={setBedGardenLog}
                onRowLogChange={setRowGardenLog}
              />
            ))}
          </div>
        </SectionContainer>
      ) : (
        <SectionContainer
          title="Garden beds & rows"
          subtitle="Add garden beds on the Plan tab to track planting here."
        >
          <p className="rounded-2xl bg-stone-50/80 px-4 py-4 text-sm leading-relaxed text-stone-600 ring-1 ring-stone-200/80">
            No beds yet. Open{' '}
            <span className="font-medium text-stone-800">Garden Plan</span> and
            add an bed — then you can mark rows planted and jot notes.
          </p>
        </SectionContainer>
      )}

      <SectionContainer
        title="Garden mode"
        subtitle="Pick what you want the app to optimize for."
      >
        <GardenModeSelector value={gardenMode} onChange={setGardenMode} />
      </SectionContainer>
    </div>
  )
}

function GardenBedCard({
  bed,
  expanded,
  onToggle,
  onPlantedChange,
  onBedLogChange,
  onRowLogChange,
}: {
  bed: StoredGardenBed
  expanded: boolean
  onToggle: () => void
  onPlantedChange: (bedId: string, rowId: string, planted: boolean) => void
  onBedLogChange: (bedId: string, gardenLog: string) => void
  onRowLogChange: (bedId: string, rowId: string, gardenLog: string) => void
}) {
  const label = bed.name.trim() || 'Unnamed bed'
  const progress = bedRowPlantingProgress(bed)
  return (
    <div
      className={clsx(
        'overflow-hidden rounded-2xl shadow-sm ring-1',
        progress.allPlanted
          ? 'bg-emerald-50/60 ring-emerald-200/90'
          : 'bg-white ring-stone-200',
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        className={clsx(
          'flex w-full items-start justify-between gap-3 px-4 py-3 text-left transition',
          progress.allPlanted ? 'hover:bg-emerald-50/80' : 'hover:bg-stone-50/80',
        )}
        aria-expanded={expanded}
      >
        <span className="min-w-0 flex-1">
          <span className="block text-base font-semibold text-stone-950">
            {label}
          </span>
          {progress.total > 0 ? (
            <div
              className="mt-2 h-1 w-full max-w-md rounded-full bg-stone-200/90"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={progress.pct}
              aria-label={`${progress.pct}% of rows planted`}
            >
              <div
                className="h-full rounded-full bg-emerald-500/75"
                style={{ width: `${progress.pct}%` }}
              />
            </div>
          ) : null}
          <span className="mt-1.5 block text-sm text-stone-600">
            {progress.summaryLine}
          </span>
          {progress.allPlanted ? (
            <span className="mt-2 flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-emerald-900">
                Fully planted
              </span>
              <span className="inline-flex rounded-full bg-teal-50 px-2 py-0.5 text-[10px] font-semibold text-teal-950 ring-1 ring-teal-200/80">
                Growing
              </span>
            </span>
          ) : null}
          {expanded && bed.size.trim() ? (
            <span className="mt-1 block text-sm text-stone-500">
              {bed.size.trim()}
            </span>
          ) : null}
        </span>
        <ChevronDown
          className={clsx(
            'mt-0.5 h-5 w-5 shrink-0 text-stone-500 transition-transform',
            expanded && 'rotate-180',
          )}
        />
      </button>
      {expanded ? (
        <div className="border-t border-stone-100 pb-4 pt-1">
          <label className="block text-xs font-semibold uppercase tracking-wide text-stone-500">
            Bed log
          </label>
          <textarea
            value={bed.gardenLog ?? ''}
            onChange={(e) => onBedLogChange(bed.id, e.target.value)}
            rows={2}
            placeholder="e.g. Deer tracks seen near this bed"
            className="mt-1 w-full resize-y rounded-xl border-0 bg-stone-50 px-3 py-2 text-sm leading-relaxed text-stone-900 ring-1 ring-stone-200 placeholder:text-stone-400 focus:ring-2 focus:ring-emerald-600"
          />
          {bed.rows.length > 0 ? (
            <div className="mt-4 space-y-3 border-t border-stone-100 pt-3">
              {bed.rows.map((r, i) => {
                const crop = r.crop.trim() || 'Empty row'
                return (
                  <div
                    key={r.id}
                    className="rounded-xl bg-stone-50/90 p-3 ring-1 ring-stone-200/80"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-stone-900">
                          Row {i + 1}
                          {r.crop.trim() ? (
                            <span className="font-normal text-stone-600">
                              {' '}
                              · {crop}
                            </span>
                          ) : null}
                        </p>
                        {r.planted ? (
                          <span className="mt-1 inline-block rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-900">
                            Planted
                          </span>
                        ) : (
                          <span className="mt-1 inline-block rounded-full bg-stone-200/80 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-stone-600">
                            Planned
                          </span>
                        )}
                      </div>
                      <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-stone-800">
                        <input
                          type="checkbox"
                          checked={!!r.planted}
                          onChange={(e) =>
                            onPlantedChange(bed.id, r.id, e.target.checked)
                          }
                          className="h-4 w-4 rounded border-stone-300 text-emerald-700 focus:ring-emerald-600"
                        />
                        Planted
                      </label>
                    </div>
                    <label className="mt-2 block text-[10px] font-semibold uppercase tracking-wide text-stone-500">
                      Row log
                    </label>
                    <textarea
                      value={r.gardenLog ?? ''}
                      onChange={(e) =>
                        onRowLogChange(bed.id, r.id, e.target.value)
                      }
                      rows={2}
                      placeholder="e.g. Planted today · peas sprouting"
                      className="mt-1 w-full resize-y rounded-lg border-0 bg-white px-2 py-1.5 text-xs leading-relaxed text-stone-900 ring-1 ring-stone-200 placeholder:text-stone-400 focus:ring-2 focus:ring-emerald-600"
                    />
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="mt-3 text-sm text-stone-500">No rows in this bed yet.</p>
          )}
        </div>
      ) : null}
    </div>
  )
}
