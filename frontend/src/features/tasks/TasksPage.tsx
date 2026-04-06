import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import clsx from 'clsx'
import { ChevronDown } from 'lucide-react'
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
import { groupTasksByArea, type AreaTaskGroup } from './taskAreaGroups'

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

function TaskSectionByArea({
  heading,
  groups,
  areas,
  emptyHint,
  onToggle,
}: {
  heading: string
  groups: AreaTaskGroup[]
  areas: StoredGardenArea[]
  emptyHint: string
  onToggle: (id: string) => void
}) {
  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-stone-500">
        {heading}
      </h3>
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
            const timing = area ? computeAreaTimingDisplay(area) : null
            const plannedRaw = area?.plannedPlantingDate
            const plannedOk =
              plannedRaw && /^\d{4}-\d{2}-\d{2}$/.test(plannedRaw)
            const align =
              area && plannedOk ? plannedAlignment(area) : null
            return (
              <div key={g.key} className="space-y-2">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="text-[11px] font-semibold uppercase tracking-wide text-stone-500">
                      {g.areaLabel}
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
                      <span className="font-medium text-stone-700">
                        Recommended:{' '}
                      </span>
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
                <TaskList items={toListItems(g.tasks)} onToggle={onToggle} />
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
  const { isLoading, error, gardenMode, setGardenMode } = useGarden()

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
    setTasks((prev) => mergePlanTaskCompletions(generated, prev))
  }, [generated])

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
    setTasks((prev) => {
      const next = togglePlanTask(prev, taskId)
      savePlanTasks(next)
      return next
    })
  }, [])

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

  const todayEmptyHint = useMemo(() => {
    const messages = [
      'Garden looks good today 👍 — nothing urgent in your list.',
      'Quick check: moisture and growth. Nothing due today.',
      'You’re on track. Enjoy a lighter day.',
      'All clear for today — a quick walk-through still helps.',
    ]
    const d = new Date()
    const seed = d.getFullYear() * 400 + d.getMonth() * 31 + d.getDate()
    return messages[seed % messages.length]
  }, [])

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
      <div className="px-4 py-6">
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
    <div className="pt-4">
      {error ? (
        <div className="mx-4 mb-4 rounded-2xl bg-amber-50/90 px-4 py-3 text-sm leading-relaxed text-amber-950 ring-1 ring-amber-200/80">
          Demo garden preview didn’t load — your saved garden areas and tasks
          below are still on this device.
        </div>
      ) : null}

      <SectionContainer
        title="Today / Tasks"
        subtitle="Mark off what you finish. Tasks refresh when you change areas on the Plan tab or mark rows planted here."
      >
        <div className="space-y-8">
          <TaskSectionByArea
            heading="Today"
            groups={todayGroups}
            areas={elkState.areas}
            emptyHint={todayEmptyHint}
            onToggle={onToggleTask}
          />
          <TaskSectionByArea
            heading="Up Next"
            groups={upNextGroups}
            areas={elkState.areas}
            emptyHint="No queued tasks. Generate or update your plan to pull in more steps."
            onToggle={onToggleTask}
          />
          <TaskSectionByArea
            heading="Done"
            groups={doneGroups}
            areas={elkState.areas}
            emptyHint="Completed tasks land here. Tap a task to undo if you tapped by mistake."
            onToggle={onToggleTask}
          />
        </div>
      </SectionContainer>

      {hasGardenAreas ? (
        <SectionContainer
          title="Garden areas & rows"
          subtitle="Track what’s in the ground and quick notes from the field."
        >
          <div className="space-y-2">
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
        <div className="border-t border-stone-100 px-4 pb-4 pt-1">
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
