import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from 'react'
import clsx from 'clsx'
import { X } from 'lucide-react'
import type { GardenPlanResponse } from '@shared/gardenPlanContract'
import { fetchGardenPlan } from '../../canvas/gardenPlanApi'
import {
  saveElkGardenState,
  type ElkGardenPersistedState,
  type StoredGardenArea,
} from '../../canvas/gardenStateStorage'
import {
  saveElkGardenPlanRecord,
  type PlanInputsSnapshot,
} from '../elkGardenPlanStorage'
import { fetchGeneratedTasks } from '../tasksApi'
import {
  GOAL_LABELS,
  SUN_TO_API,
  THREATS,
  type GardenGoal,
} from '../planConstants'
import { computeFallbackAssumptionsLikely } from '../planMinimumInput'
import { dedupeCropListPreserveOrder } from '../planAreaCrops'
import {
  loadPlanTasks,
  mergePlanTaskCompletions,
  savePlanTasks,
} from '../planTasksStorage'
import { Card } from '../../../components/Card'
import { buildInitialAreasFromCrops } from './buildInitialAreasFromCrops'

const DEFAULT_LOCATION = 'Vernon, BC'

const GOAL_OPTIONS: Array<{
  id: GardenGoal
  description: string
}> = [
  {
    id: 'easy_care',
    description: 'Keep maintenance relaxed and forgiving.',
  },
  {
    id: 'high_yield',
    description: 'Prioritize harvest size and productivity.',
  },
  {
    id: 'balanced',
    description: 'Mix experimentation with steady progress.',
  },
]

const EXAMPLE_CROPS = 'tomatoes, carrots, lettuce'

export type OnboardingFlowProps = {
  onBuildSuccess?: () => void
}

export function OnboardingFlow({ onBuildSuccess }: OnboardingFlowProps) {
  const chipFeedbackId = useId()
  const chipShakeWrapRef = useRef<HTMLDivElement>(null)
  const chipFeedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  )
  const [step, setStep] = useState(1)
  const [goal, setGoal] = useState<GardenGoal>('balanced')
  const [locationText, setLocationText] = useState(DEFAULT_LOCATION)
  const [chipInput, setChipInput] = useState('')
  const [chips, setChips] = useState<string[]>([])
  const [chipAddFeedback, setChipAddFeedback] = useState<string | null>(null)
  const [chipDuplicateShakeNonce, setChipDuplicateShakeNonce] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const clearChipFeedbackTimer = () => {
    if (chipFeedbackTimerRef.current) {
      clearTimeout(chipFeedbackTimerRef.current)
      chipFeedbackTimerRef.current = null
    }
  }

  const showChipDuplicateFeedback = (message: string) => {
    clearChipFeedbackTimer()
    setChipAddFeedback(message)
    setChipDuplicateShakeNonce((n) => n + 1)
    chipFeedbackTimerRef.current = setTimeout(() => {
      setChipAddFeedback(null)
      chipFeedbackTimerRef.current = null
    }, 2800)
  }

  const handleChipInputChange = (v: string) => {
    clearChipFeedbackTimer()
    setChipAddFeedback(null)
    setChipInput(v)
  }

  useEffect(() => {
    if (chipDuplicateShakeNonce === 0) return
    const el = chipShakeWrapRef.current
    if (!el) return
    el.classList.remove('animate-chip-input-shake')
    void el.offsetWidth
    el.classList.add('animate-chip-input-shake')
    const t = window.setTimeout(() => {
      el.classList.remove('animate-chip-input-shake')
    }, 400)
    return () => window.clearTimeout(t)
  }, [chipDuplicateShakeNonce])

  useEffect(
    () => () => {
      clearChipFeedbackTimer()
    },
    [],
  )

  const addChip = useCallback(() => {
    const t = chipInput.trim()
    if (!t) return
    const k = t.toLowerCase()
    if (chips.some((c) => c.trim().toLowerCase() === k)) {
      showChipDuplicateFeedback('Already added')
      return
    }
    clearChipFeedbackTimer()
    setChipAddFeedback(null)
    setChips((c) => [...c, t])
    setChipInput('')
  }, [chipInput, chips])

  const addChipsFromCommaList = useCallback(() => {
    const raw = chipInput.trim()
    if (!raw) return
    const parts = raw.split(',').map((s) => s.trim()).filter(Boolean)
    if (parts.length === 0) return
    setChips((prev) => {
      const seen = new Set(prev.map((c) => c.toLowerCase()))
      let skippedDup = false
      const next = [...prev]
      for (const p of parts) {
        const k = p.toLowerCase()
        if (seen.has(k)) {
          skippedDup = true
          continue
        }
        seen.add(k)
        next.push(p)
      }
      queueMicrotask(() => {
        if (skippedDup) {
          showChipDuplicateFeedback('Already added')
        } else {
          clearChipFeedbackTimer()
          setChipAddFeedback(null)
        }
      })
      return next
    })
    setChipInput('')
  }, [chipInput])

  const removeChip = (c: string) =>
    setChips((x) => x.filter((y) => y !== c))

  const buildSnapshot = useCallback(
    (areas: StoredGardenArea[], cropList: string[]): PlanInputsSnapshot => {
      const loc = locationText.trim()
      return {
        crops: [...cropList],
        location: loc,
        goalLabel: GOAL_LABELS[goal],
        threatLabels: [],
        areaNames: areas.map((a) => a.name.trim() || 'Unnamed area'),
        areaGroups: areas.map((a) => ({
          name: a.name.trim() || 'Unnamed area',
          rows: a.rows.map((r) => ({
            crop: r.crop,
            notes: r.notes,
            widthInches: r.widthInches,
          })),
        })),
        seasonalRulesShownInUi: loc.length > 0,
        fallbackAssumptionsLikely: computeFallbackAssumptionsLikely(
          cropList,
          areas,
          locationText,
        ),
      }
    },
    [goal, locationText],
  )

  const runBuild = async () => {
    const cropList = dedupeCropListPreserveOrder(chips)
    if (cropList.length < 1) {
      setError('Add at least one crop to build your plan.')
      return
    }
    setError(null)
    setLoading(true)
    try {
      const areas = buildInitialAreasFromCrops(cropList)
      const threats: Record<string, boolean> = {}
      for (const t of THREATS) threats[t.id] = false

      const body = {
        location: locationText.trim() || undefined,
        goals: GOAL_LABELS[goal],
        threats: [] as string[],
        crops: cropList,
        areas: areas.map((a) => {
          const flat = a.rows.map((r) => r.crop.trim()).filter(Boolean)
          const rowsPayload = a.rows.map((r, i) => ({
            row_label: `Row ${i + 1}`,
            crop: r.crop.trim() || undefined,
            notes: r.notes.trim() || undefined,
            width_inches: r.widthInches.trim() || undefined,
          }))
          return {
            area_name: a.name.trim() || 'Unnamed area',
            size: a.size.trim() || undefined,
            sun: SUN_TO_API[a.sun],
            notes: a.notes.trim() || undefined,
            crops: flat.length ? flat : undefined,
            rows: a.rows.length ? rowsPayload : undefined,
          }
        }),
      }

      const plan: GardenPlanResponse = await fetchGardenPlan(body)
      const snapshot = buildSnapshot(areas, cropList)
      const savedAt = new Date().toISOString()

      const nextGarden: ElkGardenPersistedState = {
        crops: cropList,
        location: locationText.trim(),
        threats,
        lastPlan: plan,
        completedWeeklyTasks: [],
        goal,
        areas,
        lastEditedAreaId: areas[0]?.id,
      }
      saveElkGardenState(nextGarden)
      saveElkGardenPlanRecord({ savedAt, plan, inputsSnapshot: snapshot })
      const taskList = await fetchGeneratedTasks({
        plan,
        areas,
        threats,
        userCrops: cropList,
      })
      savePlanTasks(mergePlanTaskCompletions(taskList, loadPlanTasks()))

      onBuildSuccess?.()
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Something went wrong.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="px-4 pb-10 pt-6">
      <header className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
          Step {step} of 4
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-stone-950">
          Start your garden
        </h1>
        <p className="mt-2 text-base leading-relaxed text-stone-600">
          A few quick answers — then we&apos;ll build areas, rows, timing hints,
          and your first task list.
        </p>
      </header>

      {error ? (
        <div className="mb-6 rounded-2xl bg-rose-50/90 px-4 py-3 text-sm leading-relaxed text-rose-950 ring-1 ring-rose-200/80">
          {error}
        </div>
      ) : null}

      {step === 1 ? (
        <Card className="space-y-4 p-5 ring-stone-200">
          <h2 className="text-lg font-semibold text-stone-950">
            What do you want from your garden?
          </h2>
          <div className="space-y-2">
            {GOAL_OPTIONS.map((opt) => (
              <label
                key={opt.id}
                className={`flex cursor-pointer flex-col rounded-2xl border px-4 py-3 transition ${
                  goal === opt.id
                    ? 'border-emerald-500 bg-emerald-50/80 ring-1 ring-emerald-200'
                    : 'border-stone-200 bg-white hover:bg-stone-50'
                }`}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="radio"
                    name="onboard-goal"
                    checked={goal === opt.id}
                    onChange={() => setGoal(opt.id)}
                    className="mt-1 h-4 w-4 border-stone-300 text-emerald-700 focus:ring-emerald-600"
                  />
                  <span>
                    <span className="font-semibold text-stone-900">
                      {GOAL_LABELS[opt.id]}
                    </span>
                    <span className="mt-0.5 block text-sm text-stone-600">
                      {opt.description}
                    </span>
                  </span>
                </div>
              </label>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setStep(2)}
            className="w-full rounded-2xl bg-stone-900 py-3 text-base font-semibold text-white shadow-sm ring-1 ring-stone-900 hover:bg-stone-800"
          >
            Continue
          </button>
        </Card>
      ) : null}

      {step === 2 ? (
        <Card className="space-y-4 p-5 ring-stone-200">
          <h2 className="text-lg font-semibold text-stone-950">
            Where are you growing?
          </h2>
          <label className="block text-sm font-medium text-stone-700">
            City or region
          </label>
          <input
            value={locationText}
            onChange={(e) => setLocationText(e.target.value)}
            placeholder="e.g. Vernon, BC"
            className="w-full rounded-2xl border-0 bg-stone-50 px-4 py-3 text-base text-stone-900 ring-1 ring-stone-200 focus:ring-2 focus:ring-emerald-600"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="flex-1 rounded-2xl border border-stone-300 bg-white py-3 text-base font-semibold text-stone-800 ring-1 ring-stone-200 hover:bg-stone-50"
            >
              Back
            </button>
            <button
              type="button"
              onClick={() => setStep(3)}
              className="flex-1 rounded-2xl bg-stone-900 py-3 text-base font-semibold text-white shadow-sm ring-1 ring-stone-900 hover:bg-stone-800"
            >
              Continue
            </button>
          </div>
        </Card>
      ) : null}

      {step === 3 ? (
        <Card className="space-y-4 p-5 ring-stone-200">
          <h2 className="text-lg font-semibold text-stone-950">
            What do you want to grow?
          </h2>
          <p className="text-sm leading-relaxed text-stone-600">
            Add crops one at a time, or paste a comma-separated list. Examples:{' '}
            <span className="font-semibold text-stone-800">{EXAMPLE_CROPS}</span>
          </p>
          <div className="flex flex-wrap gap-2">
            {chips.map((c) => (
              <span
                key={c}
                className="inline-flex items-center gap-1 rounded-full bg-emerald-50 py-1.5 pl-3 pr-1 text-sm font-semibold text-emerald-950 ring-1 ring-emerald-200"
              >
                <span>{c}</span>
                <button
                  type="button"
                  onClick={() => removeChip(c)}
                  className="rounded-full p-1 text-emerald-800 hover:bg-emerald-100/90"
                  aria-label={`Remove ${c}`}
                >
                  <X className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden />
                </button>
              </span>
            ))}
          </div>
          <div className="flex flex-col gap-1">
            <div ref={chipShakeWrapRef} className="flex gap-2">
              <input
                value={chipInput}
                onChange={(e) => handleChipInputChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    if (chipInput.includes(',')) addChipsFromCommaList()
                    else addChip()
                  }
                }}
                placeholder="e.g. tomatoes or paste several, separated by commas"
                autoComplete="off"
                aria-invalid={chipAddFeedback ? true : undefined}
                aria-describedby={
                  chipAddFeedback ? chipFeedbackId : undefined
                }
                className={clsx(
                  'min-w-0 flex-1 rounded-2xl border-0 bg-white px-4 py-3 text-base text-stone-900 transition-[box-shadow] duration-150 focus:outline-none',
                  chipAddFeedback
                    ? 'ring-2 ring-amber-400 focus:ring-2 focus:ring-amber-500'
                    : 'ring-1 ring-stone-200 focus:ring-2 focus:ring-blue-500',
                )}
              />
              <button
                type="button"
                onClick={() =>
                  chipInput.includes(',') ? addChipsFromCommaList() : addChip()
                }
                className="shrink-0 rounded-2xl bg-stone-200 px-4 py-3 text-base font-semibold text-stone-900 hover:bg-stone-300"
              >
                Add
              </button>
            </div>
            <p
              id={chipFeedbackId}
              role="status"
              aria-live="polite"
              className={clsx(
                'min-h-[1.25rem] text-xs font-medium leading-snug',
                chipAddFeedback
                  ? 'text-amber-900'
                  : 'pointer-events-none select-none opacity-0',
              )}
            >
              {chipAddFeedback ?? '\u00a0'}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="flex-1 rounded-2xl border border-stone-300 bg-white py-3 text-base font-semibold text-stone-800 ring-1 ring-stone-200 hover:bg-stone-50"
            >
              Back
            </button>
            <button
              type="button"
              onClick={() => {
                if (chips.length < 1) {
                  setError('Add at least one crop to continue.')
                  return
                }
                setError(null)
                setStep(4)
              }}
              className="flex-1 rounded-2xl bg-stone-900 py-3 text-base font-semibold text-white shadow-sm ring-1 ring-stone-900 hover:bg-stone-800"
            >
              Continue
            </button>
          </div>
        </Card>
      ) : null}

      {step === 4 ? (
        <Card className="space-y-4 p-5 ring-stone-200">
          <h2 className="text-lg font-semibold text-stone-950">
            Build your plan
          </h2>
          <p className="text-sm leading-relaxed text-stone-600">
            We&apos;ll create garden areas and rows from your crops, generate a
            tailored plan, and fill your Tasks tab with next steps.
          </p>
          <ul className="list-inside list-disc text-sm text-stone-600">
            <li>Goal: {GOAL_LABELS[goal]}</li>
            <li>Location: {locationText.trim() || '—'}</li>
            <li>
              Crops: {chips.length ? chips.join(', ') : '—'}
            </li>
          </ul>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={() => setStep(3)}
              disabled={loading}
              className="flex-1 rounded-2xl border border-stone-300 bg-white py-3 text-base font-semibold text-stone-800 ring-1 ring-stone-200 hover:bg-stone-50 disabled:opacity-50"
            >
              Back
            </button>
            <button
              type="button"
              onClick={runBuild}
              disabled={loading || chips.length < 1}
              className="flex-1 rounded-2xl bg-emerald-700 py-3 text-base font-semibold text-white shadow-sm ring-1 ring-emerald-800 hover:bg-emerald-800 disabled:opacity-50"
            >
              {loading ? 'Building…' : 'Build my plan'}
            </button>
          </div>
        </Card>
      ) : null}
    </div>
  )
}
