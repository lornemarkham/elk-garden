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
  type StoredGardenArea,
} from '../canvas/gardenStateStorage'
import { loadElkGardenPlan, ELK_GARDEN_PLAN_KEY } from '../plan/elkGardenPlanStorage'
import { fetchGeneratedTasks } from '../plan/tasksApi'
import { unionCropsFromState } from '../plan/planAreaCrops'
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
  areaStatusBadgeClass,
  computeAreaTimingDisplay,
  formatPlannedDateShort,
  plannedAlignment,
  plannedAlignmentBadgeClass,
} from '../plan/areaTimingStatus'
import {
  areaIdForTask,
  groupTasksByArea,
  type AreaTaskGroup,
} from './taskAreaGroups'

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
  todayGroups: AreaTaskGroup[],
  upNextGroups: AreaTaskGroup[],
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

function TaskAreaTimingIntro({
  area,
  areaLabel,
}: {
  area: StoredGardenArea | undefined
  areaLabel: string
}) {
  const timing = area ? computeAreaTimingDisplay(area) : null
  const plannedRaw = area?.plannedPlantingDate
  const plannedOk = plannedRaw && /^\d{4}-\d{2}-\d{2}$/.test(plannedRaw)
  const align = area && plannedOk ? plannedAlignment(area) : null
  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <h4 className="text-[11px] font-semibold uppercase tracking-wide text-stone-500">
          {areaLabel}
        </h4>
        {timing ? (
          <span
            className={clsx(
              'inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold leading-none ring-1',
              areaStatusBadgeClass(timing.status),
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
  areas,
  onToggle,
  completedPulseIds,
}: {
  task: PlanTaskRecord
  areas: StoredGardenArea[]
  onToggle: (id: string) => void
  completedPulseIds?: string[]
}) {
  const areaId = areaIdForTask(task.id, areas)
  const area =
    areaId != null ? areas.find((a) => a.id === areaId) : undefined
  const areaLabel =
    area != null ? area.name.trim() || 'Unnamed area' : 'All garden'

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
        <TaskAreaTimingIntro area={area} areaLabel={areaLabel} />
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

function TaskSectionByArea({
  heading,
  subheading,
  groups,
  areas,
  emptyHint,
  onToggle,
  completedPulseIds,
}: {
  heading: string
  subheading?: string
  groups: AreaTaskGroup[]
  areas: StoredGardenArea[]
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
            const area =
              g.areaId != null
                ? areas.find((a) => a.id === g.areaId)
                : undefined
            return (
              <div key={g.key} className="space-y-2">
                <TaskAreaTimingIntro area={area} areaLabel={g.areaLabel} />
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

function areaRowPlantingProgress(area: StoredGardenArea): {
  total: number
  planted: number
  pct: number
  allPlanted: boolean
  summaryLine: string
} {
  const total = area.rows.length
  const planted = area.rows.filter((r) => r.planted).length
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
    () => unionCropsFromState(elkState.crops, elkState.areas),
    [elkState.crops, elkState.areas],
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
          areas: elkState.areas,
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
  }, [plan, elkState.areas, elkState.threats, userCrops])

  useEffect(() => {
    if (generated === null) return
    setTasks((prev) => {
      const next = ensureTomatoesDemoTask(
        mergePlanTaskCompletions(generated, prev),
        hasTomatoesInPlanInput({ crops: userCrops, areas: elkState.areas }),
      )
      savePlanTasks(next)
      return next
    })
  }, [generated, userCrops, elkState.areas])

  useEffect(() => {
    if (!taskFeedback) return
    const t = window.setTimeout(() => setTaskFeedback(null), 2400)
    return () => window.clearTimeout(t)
  }, [taskFeedback])

  const setRowPlanted = useCallback(
    (areaId: string, rowId: string, planted: boolean) => {
      setElkState((prev) => {
        const next: ElkGardenPersistedState = {
          ...prev,
          lastEditedAreaId: areaId,
          areas: prev.areas.map((a) =>
            a.id !== areaId
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

  const setAreaGardenLog = useCallback((areaId: string, gardenLog: string) => {
    setElkState((prev) => {
      const next: ElkGardenPersistedState = {
        ...prev,
        lastEditedAreaId: areaId,
        areas: prev.areas.map((a) =>
          a.id === areaId ? { ...a, gardenLog } : a,
        ),
      }
      saveElkGardenState(next)
      return next
    })
  }, [])

  const setRowGardenLog = useCallback(
    (areaId: string, rowId: string, gardenLog: string) => {
      setElkState((prev) => {
        const next: ElkGardenPersistedState = {
          ...prev,
          lastEditedAreaId: areaId,
          areas: prev.areas.map((a) =>
            a.id !== areaId
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
          hasTomatoesInPlanInput({ crops: userCrops, areas: elkState.areas }),
        )
        savePlanTasks(next)
        return next
      })
      setRecentCompletedTaskIds((prev) => [...new Set([...prev, taskId])])
      setPendingCompletedTaskIds((prev) => prev.filter((id) => id !== taskId))
    }, 2600)
  }, [elkState.areas, pendingCompletedTaskIds, tasks, toggleTask, userCrops])

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
    (groups: AreaTaskGroup[]) =>
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
    () => groupTasksByArea(today, elkState.areas),
    [today, elkState.areas],
  )
  const upNextGroups = useMemo(
    () => groupTasksByArea(upNext, elkState.areas),
    [upNext, elkState.areas],
  )
  const doneGroups = useMemo(
    () => groupTasksByArea(done, elkState.areas),
    [done, elkState.areas],
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
    () => groupTasksByArea(remainingIncomplete, elkState.areas),
    [remainingIncomplete, elkState.areas],
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

  const [expandedAreaId, setExpandedAreaId] = useState<string | null>(null)
  const areasExpandInitRef = useRef(false)
  const prevLastEditedForAreasRef = useRef(elkState.lastEditedAreaId)

  useEffect(() => {
    if (elkState.areas.length === 0) {
      setExpandedAreaId(null)
      return
    }
    if (!areasExpandInitRef.current) {
      areasExpandInitRef.current = true
      const lid = elkState.lastEditedAreaId
      setExpandedAreaId(
        lid && elkState.areas.some((a) => a.id === lid)
          ? lid
          : elkState.areas[0]!.id,
      )
      return
    }
    setExpandedAreaId((prev) => {
      if (prev !== null && elkState.areas.some((a) => a.id === prev)) return prev
      if (prev === null) return null
      const lid = elkState.lastEditedAreaId
      if (lid && elkState.areas.some((a) => a.id === lid)) return lid
      return elkState.areas[0]!.id
    })
  }, [elkState.areas, elkState.lastEditedAreaId])

  useEffect(() => {
    const lid = elkState.lastEditedAreaId
    if (
      areasExpandInitRef.current &&
      lid &&
      lid !== prevLastEditedForAreasRef.current &&
      elkState.areas.some((a) => a.id === lid)
    ) {
      setExpandedAreaId(lid)
    }
    prevLastEditedForAreasRef.current = lid
  }, [elkState.lastEditedAreaId, elkState.areas])

  const handleGardenAreaToggle = useCallback((areaId: string) => {
    let nextExpanded: string | null = null
    setExpandedAreaId((prev) => {
      nextExpanded = prev === areaId ? null : areaId
      return nextExpanded
    })
    if (nextExpanded !== null) {
      const expandedId = nextExpanded
      setElkState((s) => {
        if (s.lastEditedAreaId === expandedId) return s
        const out: ElkGardenPersistedState = {
          ...s,
          lastEditedAreaId: expandedId,
        }
        saveElkGardenState(out)
        return out
      })
    }
  }, [])

  const hasGardenAreas = elkState.areas.length > 0

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
          Demo garden preview didn’t load — your saved garden areas and tasks
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
                areas={elkState.areas}
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
              <TaskSectionByArea
                heading="Up next"
                subheading="Everything after your first step — work through it at your own pace."
                groups={visibleUpNextCombinedGroups}
                areas={elkState.areas}
                emptyHint={upNextEmptyHint}
                onToggle={onToggleTask}
                completedPulseIds={justCompletedTaskIds}
              />
            ) : null}
            <TaskSectionByArea
              heading="Done today"
              subheading="Completed steps stay visible here so you can see the progress you made."
              groups={visibleDoneGroups}
              areas={elkState.areas}
              emptyHint="Nothing here yet. Finished steps land here — tap to undo if you need to."
              onToggle={onToggleTask}
              completedPulseIds={justCompletedTaskIds}
            />
          </div>
        )}
      </SectionContainer>

      {hasGardenAreas ? (
        <SectionContainer
          title="Garden areas & rows"
          subtitle="Track what’s in the ground and quick notes from the field."
        >
          <div className="space-y-3 sm:space-y-4">
            {elkState.areas.map((a) => (
              <GardenAreaCard
                key={a.id}
                area={a}
                expanded={expandedAreaId === a.id}
                onToggle={() => handleGardenAreaToggle(a.id)}
                onPlantedChange={setRowPlanted}
                onAreaLogChange={setAreaGardenLog}
                onRowLogChange={setRowGardenLog}
              />
            ))}
          </div>
        </SectionContainer>
      ) : (
        <SectionContainer
          title="Garden areas & rows"
          subtitle="Add garden areas on the Plan tab to track planting here."
        >
          <p className="rounded-2xl bg-stone-50/80 px-4 py-4 text-sm leading-relaxed text-stone-600 ring-1 ring-stone-200/80">
            No areas yet. Open{' '}
            <span className="font-medium text-stone-800">Garden Plan</span> and
            add an area — then you can mark rows planted and jot notes.
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

function GardenAreaCard({
  area,
  expanded,
  onToggle,
  onPlantedChange,
  onAreaLogChange,
  onRowLogChange,
}: {
  area: StoredGardenArea
  expanded: boolean
  onToggle: () => void
  onPlantedChange: (areaId: string, rowId: string, planted: boolean) => void
  onAreaLogChange: (areaId: string, gardenLog: string) => void
  onRowLogChange: (areaId: string, rowId: string, gardenLog: string) => void
}) {
  const label = area.name.trim() || 'Unnamed area'
  const progress = areaRowPlantingProgress(area)
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
          {expanded && area.size.trim() ? (
            <span className="mt-1 block text-sm text-stone-500">
              {area.size.trim()}
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
            Area log
          </label>
          <textarea
            value={area.gardenLog ?? ''}
            onChange={(e) => onAreaLogChange(area.id, e.target.value)}
            rows={2}
            placeholder="e.g. Deer tracks seen near this area"
            className="mt-1 w-full resize-y rounded-xl border-0 bg-stone-50 px-3 py-2 text-sm leading-relaxed text-stone-900 ring-1 ring-stone-200 placeholder:text-stone-400 focus:ring-2 focus:ring-emerald-600"
          />
          {area.rows.length > 0 ? (
            <div className="mt-4 space-y-3 border-t border-stone-100 pt-3">
              {area.rows.map((r, i) => {
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
                            onPlantedChange(area.id, r.id, e.target.checked)
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
                        onRowLogChange(area.id, r.id, e.target.value)
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
            <p className="mt-3 text-sm text-stone-500">No rows in this area yet.</p>
          )}
        </div>
      ) : null}
    </div>
  )
}
