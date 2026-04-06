import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from 'react'
import { useNavigate } from 'react-router-dom'
import type { GardenPlanResponse } from '@shared/gardenPlanContract'
import { fetchGardenPlan } from '../canvas/gardenPlanApi'
import {
  loadElkGardenState,
  saveElkGardenState,
  type ElkGardenPersistedState,
  type StoredGardenArea,
  type StoredGardenRow,
} from '../canvas/gardenStateStorage'
import {
  loadElkGardenPlan,
  saveElkGardenPlanRecord,
  type PlanInputsSnapshot,
} from './elkGardenPlanStorage'
import { fetchGeneratedTasks } from './tasksApi'
import {
  AREA_PRESETS,
  GOAL_LABELS,
  SUN_TO_API,
  THREATS,
  type GardenGoal,
} from './planConstants'
import { PlanInputsSection } from './PlanInputsSection'
import {
  loadPlanTasks,
  mergePlanTaskCompletions,
  savePlanTasks,
} from './planTasksStorage'
import { SavedPlanResults } from './SavedPlanResults'
import { AskElkCtaBar } from './AskElkCtaBar'
import { clearPlanFlowLocalStorage } from './clearPlanLocalStorage'
import { OnboardingFlow } from './onboarding/OnboardingFlow'
import { OnboardingSuccessCard } from './onboarding/OnboardingSuccessCard'
import {
  computeFallbackAssumptionsLikely,
  hasMinimumPlanInput,
} from './planMinimumInput'
import {
  dedupeCropListPreserveOrder,
  unionCropsFromState,
} from './planAreaCrops'

const MINIMUM_INPUT_HINT =
  'Add at least one crop or one garden area to generate a useful spring plan.'

function newAreaId() {
  return `area_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

function newRowId() {
  return `row_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

function emptyArea(): StoredGardenArea {
  return {
    id: newAreaId(),
    name: '',
    size: '',
    sun: 'unsure',
    notes: '',
    rows: [],
  }
}

/** Expand last-edited bed on load; fallback to first area in list. */
function initialExpandedFromGarden(g: ElkGardenPersistedState): string | null {
  const lid = g.lastEditedAreaId
  if (typeof lid === 'string' && g.areas.some((a) => a.id === lid)) return lid
  return g.areas[0]?.id ?? null
}

export function PlanPage() {
  const navigate = useNavigate()
  const fileInputId = useId()
  const initialGardenRef = useRef<ReturnType<typeof loadElkGardenState> | null>(
    null,
  )
  if (initialGardenRef.current === null) {
    initialGardenRef.current = loadElkGardenState()
  }
  const initialGarden = initialGardenRef.current
  const savedPlanBlob = loadElkGardenPlan()
  const initialPlan =
    savedPlanBlob?.plan ?? initialGarden.lastPlan ?? null

  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [locationText, setLocationText] = useState(initialGarden.location)
  const [goal, setGoal] = useState<GardenGoal>(initialGarden.goal)
  const [chips, setChips] = useState(() =>
    dedupeCropListPreserveOrder(initialGarden.crops),
  )
  const [chipInput, setChipInput] = useState('')
  const [chipAddFeedback, setChipAddFeedback] = useState<string | null>(null)
  const [chipDuplicateShakeNonce, setChipDuplicateShakeNonce] = useState(0)
  const chipFeedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [threats, setThreats] = useState<Record<string, boolean>>(
    initialGarden.threats,
  )
  const [areas, setAreas] = useState<StoredGardenArea[]>(initialGarden.areas)
  const [lastEditedAreaId, setLastEditedAreaId] = useState<string | null>(() =>
    initialExpandedFromGarden(initialGarden),
  )
  const [expandedAreaId, setExpandedAreaId] = useState<string | null>(() =>
    initialExpandedFromGarden(initialGarden),
  )
  const [showPresetRow, setShowPresetRow] = useState(false)
  const [elkPlan, setElkPlan] = useState<GardenPlanResponse | null>(
    initialPlan,
  )
  const [completedWeeklyTasks, setCompletedWeeklyTasks] = useState<string[]>(
    initialGarden.completedWeeklyTasks,
  )
  const [planLoading, setPlanLoading] = useState(false)
  const [planError, setPlanError] = useState<string | null>(null)
  const [planJustUpdated, setPlanJustUpdated] = useState(false)
  const [showOnboardingSuccess, setShowOnboardingSuccess] = useState(false)
  const savedPlanAnchorRef = useRef<HTMLDivElement>(null)

  const allCrops = useMemo(() => unionCropsFromState(chips, areas), [chips, areas])

  const activateArea = useCallback((id: string) => {
    setExpandedAreaId(id)
  }, [])

  const toggleAreaExpand = useCallback((id: string) => {
    setExpandedAreaId((cur) => (cur === id ? null : id))
  }, [])

  useEffect(() => {
    if (
      expandedAreaId &&
      !areas.some((a) => a.id === expandedAreaId)
    ) {
      setExpandedAreaId(areas[0]?.id ?? null)
    }
  }, [areas, expandedAreaId])

  useEffect(() => {
    if (
      lastEditedAreaId &&
      !areas.some((a) => a.id === lastEditedAreaId)
    ) {
      setLastEditedAreaId(areas[0]?.id ?? null)
    }
  }, [areas, lastEditedAreaId])

  useEffect(() => {
    saveElkGardenState({
      crops: chips,
      location: locationText,
      threats,
      lastPlan: elkPlan,
      completedWeeklyTasks,
      goal,
      areas,
      ...(lastEditedAreaId ? { lastEditedAreaId } : {}),
    })
  }, [
    chips,
    locationText,
    threats,
    elkPlan,
    completedWeeklyTasks,
    goal,
    areas,
    lastEditedAreaId,
  ])

  useEffect(() => {
    if (elkPlan) {
      savedPlanAnchorRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      })
    }
  }, [elkPlan])

  const onFile = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file?.type.startsWith('image/')) return
    const url = URL.createObjectURL(file)
    setImagePreview((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return url
    })
  }, [])

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

  const addChip = () => {
    const t = chipInput.trim()
    if (!t) return
    const k = t.toLowerCase()
    if (chips.some((c) => c.trim().toLowerCase() === k)) {
      showChipDuplicateFeedback('This crop is already in your list')
      return
    }
    clearChipFeedbackTimer()
    setChipAddFeedback(null)
    setChips((c) => [...c, t])
    setChipInput('')
  }

  const removeChip = (c: string) => setChips((x) => x.filter((y) => y !== c))

  const toggleThreat = (id: string) =>
    setThreats((t) => ({ ...t, [id]: !t[id] }))

  const updateArea = (id: string, patch: Partial<StoredGardenArea>) => {
    setLastEditedAreaId(id)
    setExpandedAreaId(id)
    setAreas((list) =>
      list.map((row) => (row.id === id ? { ...row, ...patch } : row)),
    )
  }

  const addRow = (areaId: string) => {
    setLastEditedAreaId(areaId)
    setExpandedAreaId(areaId)
    setAreas((list) =>
      list.map((a) => {
        if (a.id !== areaId) return a
        return {
          ...a,
          rows: [
            ...a.rows,
            {
              id: newRowId(),
              crop: '',
              notes: '',
              widthInches: '',
              planted: false,
            },
          ],
        }
      }),
    )
  }

  const removeRow = (areaId: string, rowId: string) => {
    setLastEditedAreaId(areaId)
    setExpandedAreaId(areaId)
    setAreas((list) =>
      list.map((a) =>
        a.id === areaId
          ? { ...a, rows: a.rows.filter((r) => r.id !== rowId) }
          : a,
      ),
    )
  }

  const updateRow = (
    areaId: string,
    rowId: string,
    patch: Partial<StoredGardenRow>,
  ) => {
    setLastEditedAreaId(areaId)
    setExpandedAreaId(areaId)
    setAreas((list) =>
      list.map((a) => {
        if (a.id !== areaId) return a
        return {
          ...a,
          rows: a.rows.map((r) =>
            r.id === rowId ? { ...r, ...patch } : r,
          ),
        }
      }),
    )
  }

  const removeArea = (id: string) => {
    setAreas((list) => {
      const filtered = list.filter((a) => a.id !== id)
      setExpandedAreaId((cur) => {
        if (cur !== id) return cur
        return filtered[0]?.id ?? null
      })
      setLastEditedAreaId((cur) => {
        if (cur !== id) return cur
        return filtered[0]?.id ?? null
      })
      return filtered
    })
  }

  const addAreaFromPreset = (presetId: string) => {
    const preset = AREA_PRESETS.find((p) => p.id === presetId)
    const base = emptyArea()
    if (preset && preset.id !== 'custom') {
      base.name = preset.name
      base.size = preset.size
      base.sun = preset.sun
      base.notes = preset.notes
    }
    setLastEditedAreaId(base.id)
    setExpandedAreaId(base.id)
    setAreas((list) => [base, ...list])
    setShowPresetRow(false)
  }

  const buildInputsSnapshot = useCallback((): PlanInputsSnapshot => {
    const loc = locationText.trim()
    return {
      crops: [...chips],
      location: loc,
      goalLabel: GOAL_LABELS[goal],
      threatLabels: THREATS.filter((t) => threats[t.id]).map((t) => t.label),
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
        chips,
        areas,
        locationText,
      ),
    }
  }, [chips, locationText, goal, threats, areas])

  const canAskElk = hasMinimumPlanInput(chips, areas)

  const resetPlanFlow = useCallback(() => {
    const ok = window.confirm(
      'Clear all saved garden data on this device? This removes your draft (crops, areas, location, etc.), the saved ELK plan, weekly checkmarks, and plan tasks. This cannot be undone.',
    )
    if (!ok) return

    clearChipFeedbackTimer()
    setChipAddFeedback(null)

    setImagePreview((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return null
    })
    clearPlanFlowLocalStorage()
    initialGardenRef.current = loadElkGardenState()
    const fresh = initialGardenRef.current
    setLocationText(fresh.location)
    setGoal(fresh.goal)
    setChips(dedupeCropListPreserveOrder(fresh.crops))
    setChipInput('')
    setThreats(fresh.threats)
    setAreas(fresh.areas)
    setLastEditedAreaId(initialExpandedFromGarden(fresh))
    setExpandedAreaId(initialExpandedFromGarden(fresh))
    setShowPresetRow(false)
    setElkPlan(null)
    setCompletedWeeklyTasks(fresh.completedWeeklyTasks)
    setPlanError(null)
    setPlanJustUpdated(false)
    setShowOnboardingSuccess(false)
  }, [])

  useEffect(() => {
    if (!planJustUpdated) return
    const t = window.setTimeout(() => setPlanJustUpdated(false), 8000)
    return () => window.clearTimeout(t)
  }, [planJustUpdated])

  useEffect(
    () => () => {
      clearChipFeedbackTimer()
    },
    [],
  )

  const hasSavedPlan = !!loadElkGardenPlan()?.plan

  const askElk = async () => {
    if (!hasMinimumPlanInput(chips, areas)) {
      setPlanError(MINIMUM_INPUT_HINT)
      return
    }
    const wasUpdate = !!elkPlan
    setPlanError(null)
    setPlanLoading(true)
    try {
      const body = {
        location: locationText.trim() || undefined,
        goals: GOAL_LABELS[goal],
        threats: THREATS.filter((t) => threats[t.id]).map((t) => t.label),
        crops: allCrops.length ? allCrops : undefined,
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
      const plan = await fetchGardenPlan(body)
      const snapshot = buildInputsSnapshot()
      const savedAt = new Date().toISOString()
      setElkPlan(plan)
      setCompletedWeeklyTasks([])
      if (wasUpdate) setPlanJustUpdated(true)
      saveElkGardenPlanRecord({ savedAt, plan, inputsSnapshot: snapshot })
      const taskList = await fetchGeneratedTasks({
        plan,
        areas,
        threats,
        userCrops: allCrops,
      })
      savePlanTasks(mergePlanTaskCompletions(taskList, loadPlanTasks()))
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Something went wrong.'
      setPlanError(msg)
    } finally {
      setPlanLoading(false)
    }
  }

  const handleOnboardingBuildSuccess = useCallback(() => {
    const garden = loadElkGardenState()
    const planRecord = loadElkGardenPlan()
    if (planRecord?.plan) {
      setElkPlan(planRecord.plan)
      setAreas(garden.areas)
      setChips(dedupeCropListPreserveOrder(garden.crops))
      setLocationText(garden.location)
      setGoal(garden.goal)
      setThreats(garden.threats)
      const exp = initialExpandedFromGarden(garden)
      setLastEditedAreaId(exp)
      setExpandedAreaId(exp)
      setCompletedWeeklyTasks(garden.completedWeeklyTasks)
    }
    setShowOnboardingSuccess(true)
  }, [])

  if (showOnboardingSuccess) {
    return (
      <OnboardingSuccessCard
        onReview={() => setShowOnboardingSuccess(false)}
        onGoToTasks={() => navigate('/tasks')}
      />
    )
  }

  if (!hasSavedPlan) {
    return (
      <OnboardingFlow onBuildSuccess={handleOnboardingBuildSuccess} />
    )
  }

  return (
    <div className="px-4 pb-10 pt-4">
      <header className="mb-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-stone-950">
              Garden Plan
            </h1>
            <p className="mt-2 text-lg leading-relaxed text-stone-700">
              Your <span className="font-medium text-stone-800">current draft</span>{' '}
              below is edited locally. After Ask ELK, your{' '}
              <span className="font-medium text-stone-800">saved plan</span> appears
              on this page and in Tasks — until you clear it or run Ask ELK again.
            </p>
          </div>
          <button
            type="button"
            onClick={resetPlanFlow}
            className="shrink-0 rounded-2xl border border-stone-300 bg-white px-4 py-3 text-sm font-semibold text-stone-800 shadow-sm ring-1 ring-stone-200 hover:bg-stone-50"
          >
            Clear saved garden data
          </button>
        </div>
      </header>

      <div className="space-y-12">
        <PlanInputsSection
          fileInputId={fileInputId}
          imagePreview={imagePreview}
          onFileChange={onFile}
          onClearImage={() => {
            setImagePreview((prev) => {
              if (prev) URL.revokeObjectURL(prev)
              return null
            })
          }}
          chips={chips}
          chipInput={chipInput}
          chipAddFeedback={chipAddFeedback}
          chipDuplicateShakeNonce={chipDuplicateShakeNonce}
          onChipInputChange={handleChipInputChange}
          onAddChip={addChip}
          onRemoveChip={removeChip}
          locationText={locationText}
          onLocationChange={setLocationText}
          goal={goal}
          onGoalChange={setGoal}
          threats={threats}
          onToggleThreat={toggleThreat}
          areas={areas}
          expandedAreaId={expandedAreaId}
          onToggleAreaExpand={toggleAreaExpand}
          onActivateArea={activateArea}
          showPresetRow={showPresetRow}
          onStartAddArea={() => setShowPresetRow(true)}
          onCancelPreset={() => setShowPresetRow(false)}
          onAddAreaFromPreset={addAreaFromPreset}
          onRemoveArea={removeArea}
          onUpdateArea={updateArea}
          onAddRow={addRow}
          onRemoveRow={removeRow}
          onUpdateRow={updateRow}
        />

        {elkPlan ? (
          <section
            ref={savedPlanAnchorRef}
            className="rounded-2xl bg-white/80 p-4 ring-1 ring-stone-200/90 sm:p-6"
            aria-labelledby="saved-plan-heading"
          >
            <h2
              id="saved-plan-heading"
              className="text-xl font-semibold tracking-tight text-stone-950"
            >
              Saved plan
            </h2>
            <p className="mt-1 text-sm text-stone-500">
              Last result from Ask ELK — stored on this device only. Change your
              draft above and run Ask ELK again to replace it.
            </p>
            {planJustUpdated ? (
              <p
                className="mt-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-950 ring-1 ring-emerald-200"
                role="status"
              >
                Plan updated based on your latest inputs.
              </p>
            ) : null}
            <div className="mt-8">
              <SavedPlanResults
                plan={elkPlan}
                chips={chips}
                areas={areas}
                userCrops={allCrops}
                onAddArea={addAreaFromPreset}
              />
            </div>
          </section>
        ) : null}

        <AskElkCtaBar
          planLoading={planLoading}
          planError={planError}
          onAsk={askElk}
          hasSavedPlan={!!elkPlan}
          canAsk={canAskElk}
          minimumInputHint={MINIMUM_INPUT_HINT}
        />
      </div>
    </div>
  )
}
