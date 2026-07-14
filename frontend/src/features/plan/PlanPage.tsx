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
  type StoredGardenBed,
  type StoredGardenRow,
} from '../canvas/gardenStateStorage'
import {
  loadElkGardenPlan,
  saveElkGardenPlanRecord,
  type PlanInputsSnapshot,
} from './elkGardenPlanStorage'
import { fetchGeneratedTasks } from './tasksApi'
import {
  BED_PRESETS,
  GOAL_LABELS,
  SUN_TO_API,
  THREATS,
  type GardenGoal,
} from './planConstants'
import { PrimaryPageIntro } from '../../components/PrimaryPageIntro'
import { GardenPlanSummaryCard } from './GardenPlanSummaryCard'
import { PlanPageGuidance } from './PlanPageGuidance'
import { PlanInputsSection } from './PlanInputsSection'
import {
  loadPlanTasks,
  ensureTomatoesDemoTask,
  hasTomatoesInPlanInput,
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
} from './planBedCrops'

const MINIMUM_INPUT_HINT =
  'Add at least one crop or one garden bed to generate a useful spring plan.'

function scrollDocumentToElement(
  el: HTMLElement | null,
  behavior: ScrollBehavior = 'smooth',
) {
  if (!el) return
  const y = el.getBoundingClientRect().top + window.scrollY - 12
  window.scrollTo({ top: Math.max(0, y), behavior })
}

function newBedId() {
  return `bed_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

function newRowId() {
  return `row_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

function emptyBed(): StoredGardenBed {
  return {
    id: newBedId(),
    name: '',
    size: '',
    sun: 'unsure',
    notes: '',
    rows: [],
  }
}

/** Expand last-edited bed on load; fallback to first bed in list. */
function initialExpandedFromGarden(g: ElkGardenPersistedState): string | null {
  const lid = g.lastEditedBedId
  if (typeof lid === 'string' && g.beds.some((a) => a.id === lid)) return lid
  return g.beds[0]?.id ?? null
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
  const [beds, setBeds] = useState<StoredGardenBed[]>(initialGarden.beds)
  const [lastEditedBedId, setLastEditedBedId] = useState<string | null>(() =>
    initialExpandedFromGarden(initialGarden),
  )
  const [expandedBedId, setExpandedBedId] = useState<string | null>(() =>
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

  const [draftSections, setDraftSections] = useState({
    crops: false,
    beds: false,
    place: false,
    threats: false,
  })

  const scrollToLayoutPreview = useCallback(() => {
    scrollDocumentToElement(
      document.getElementById('draft-layout-preview'),
      'smooth',
    )
  }, [])

  const expandBasicsAndScroll = useCallback(() => {
    setDraftSections((s) => ({ ...s, place: true }))
    window.requestAnimationFrame(() => {
      scrollDocumentToElement(
        document.getElementById('draft-your-place'),
        'smooth',
      )
    })
  }, [])

  const allCrops = useMemo(() => unionCropsFromState(chips, beds), [chips, beds])

  const activateBed = useCallback((id: string) => {
    setExpandedBedId(id)
  }, [])

  const toggleBedExpand = useCallback((id: string) => {
    setExpandedBedId((cur) => (cur === id ? null : id))
  }, [])

  useEffect(() => {
    if (
      expandedBedId &&
      !beds.some((a) => a.id === expandedBedId)
    ) {
      setExpandedBedId(beds[0]?.id ?? null)
    }
  }, [beds, expandedBedId])

  useEffect(() => {
    if (
      lastEditedBedId &&
      !beds.some((a) => a.id === lastEditedBedId)
    ) {
      setLastEditedBedId(beds[0]?.id ?? null)
    }
  }, [beds, lastEditedBedId])

  useEffect(() => {
    saveElkGardenState({
      crops: chips,
      location: locationText,
      threats,
      lastPlan: elkPlan,
      completedWeeklyTasks,
      goal,
      beds,
      ...(lastEditedBedId ? { lastEditedBedId } : {}),
    })
  }, [
    chips,
    locationText,
    threats,
    elkPlan,
    completedWeeklyTasks,
    goal,
    beds,
    lastEditedBedId,
  ])

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

  const updateBed = (id: string, patch: Partial<StoredGardenBed>) => {
    setLastEditedBedId(id)
    setExpandedBedId(id)
    setBeds((list) =>
      list.map((row) => (row.id === id ? { ...row, ...patch } : row)),
    )
  }

  const addRow = (bedId: string) => {
    setLastEditedBedId(bedId)
    setExpandedBedId(bedId)
    setBeds((list) =>
      list.map((a) => {
        if (a.id !== bedId) return a
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

  const removeRow = (bedId: string, rowId: string) => {
    setLastEditedBedId(bedId)
    setExpandedBedId(bedId)
    setBeds((list) =>
      list.map((a) =>
        a.id === bedId
          ? { ...a, rows: a.rows.filter((r) => r.id !== rowId) }
          : a,
      ),
    )
  }

  const updateRow = (
    bedId: string,
    rowId: string,
    patch: Partial<StoredGardenRow>,
  ) => {
    setLastEditedBedId(bedId)
    setExpandedBedId(bedId)
    setBeds((list) =>
      list.map((a) => {
        if (a.id !== bedId) return a
        return {
          ...a,
          rows: a.rows.map((r) =>
            r.id === rowId ? { ...r, ...patch } : r,
          ),
        }
      }),
    )
  }

  const removeBed = (id: string) => {
    setBeds((list) => {
      const filtered = list.filter((a) => a.id !== id)
      setExpandedBedId((cur) => {
        if (cur !== id) return cur
        return filtered[0]?.id ?? null
      })
      setLastEditedBedId((cur) => {
        if (cur !== id) return cur
        return filtered[0]?.id ?? null
      })
      return filtered
    })
  }

  const addBedFromPreset = (presetId: string) => {
    const preset = BED_PRESETS.find((p) => p.id === presetId)
    const base = emptyBed()
    if (preset && preset.id !== 'custom') {
      base.name = preset.name
      base.size = preset.size
      base.sun = preset.sun
      base.notes = preset.notes
    }
    setLastEditedBedId(base.id)
    setExpandedBedId(base.id)
    setBeds((list) => [base, ...list])
    setShowPresetRow(false)
  }

  const buildInputsSnapshot = useCallback((): PlanInputsSnapshot => {
    const loc = locationText.trim()
    return {
      crops: [...chips],
      location: loc,
      goalLabel: GOAL_LABELS[goal],
      threatLabels: THREATS.filter((t) => threats[t.id]).map((t) => t.label),
      bedNames: beds.map((a) => a.name.trim() || 'Unnamed bed'),
      bedGroups: beds.map((a) => ({
        name: a.name.trim() || 'Unnamed bed',
        rows: a.rows.map((r) => ({
          crop: r.crop,
          notes: r.notes,
          widthInches: r.widthInches,
        })),
      })),
      seasonalRulesShownInUi: loc.length > 0,
      fallbackAssumptionsLikely: computeFallbackAssumptionsLikely(
        chips,
        beds,
        locationText,
      ),
    }
  }, [chips, locationText, goal, threats, beds])

  const canAskElk = hasMinimumPlanInput(chips, beds)

  const resetPlanFlow = useCallback(() => {
    const ok = window.confirm(
      'Clear all saved garden data on this device? This removes your draft (crops, beds, location, etc.), the saved ELK plan, weekly checkmarks, and plan tasks. This cannot be undone.',
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
    setBeds(fresh.beds)
    setLastEditedBedId(initialExpandedFromGarden(fresh))
    setExpandedBedId(initialExpandedFromGarden(fresh))
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
    if (!hasMinimumPlanInput(chips, beds)) {
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
        beds: beds.map((a) => {
          const flat = a.rows.map((r) => r.crop.trim()).filter(Boolean)
          const rowsPayload = a.rows.map((r, i) => ({
            row_label: `Row ${i + 1}`,
            crop: r.crop.trim() || undefined,
            notes: r.notes.trim() || undefined,
            width_inches: r.widthInches.trim() || undefined,
          }))
          return {
            bed_name: a.name.trim() || 'Unnamed bed',
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
        beds,
        threats,
        userCrops: allCrops,
      })
      savePlanTasks(
        ensureTomatoesDemoTask(
          mergePlanTaskCompletions(taskList, loadPlanTasks()),
          hasTomatoesInPlanInput({ crops: allCrops, beds }),
        ),
      )
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
      setBeds(garden.beds)
      setChips(dedupeCropListPreserveOrder(garden.crops))
      setLocationText(garden.location)
      setGoal(garden.goal)
      setThreats(garden.threats)
      const exp = initialExpandedFromGarden(garden)
      setLastEditedBedId(exp)
      setExpandedBedId(exp)
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
    <div className="pt-2 pb-10">
      <PrimaryPageIntro
        title="Garden Plan"
        description="Shape your draft below, then ask ELK for a plan and tasks. Everything saves on this device."
        action={
          <button
            type="button"
            onClick={resetPlanFlow}
            className="rounded-2xl border border-stone-300 bg-white px-4 py-3 text-sm font-semibold text-stone-800 shadow-sm ring-1 ring-stone-200 hover:bg-stone-50"
          >
            Clear saved garden data
          </button>
        }
      />

      <div className="space-y-8 sm:space-y-10">
        <PlanPageGuidance />

        <GardenPlanSummaryCard
          bedCount={beds.length}
          cropCount={allCrops.length}
          locationText={locationText}
          goal={goal}
          hasElkPlan={!!elkPlan}
          canAskElk={canAskElk}
          onViewLayout={scrollToLayoutPreview}
          onEditBasics={expandBasicsAndScroll}
        />

        <div className="border-t border-stone-200/80 pt-8 sm:pt-10">
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
            beds={beds}
            expandedBedId={expandedBedId}
            onToggleBedExpand={toggleBedExpand}
            onActivateBed={activateBed}
            showPresetRow={showPresetRow}
            onStartAddBed={() => setShowPresetRow(true)}
            onCancelPreset={() => setShowPresetRow(false)}
            onAddBedFromPreset={addBedFromPreset}
            onRemoveBed={removeBed}
            onUpdateBed={updateBed}
            onAddRow={addRow}
            onRemoveRow={removeRow}
            onUpdateRow={updateRow}
            draftSections={draftSections}
            onDraftSectionChange={(key, open) =>
              setDraftSections((s) => ({ ...s, [key]: open }))
            }
          />
        </div>

        <div className="border-t border-stone-200/80 pt-8 sm:pt-10">
          <AskElkCtaBar
            planLoading={planLoading}
            planError={planError}
            onAsk={askElk}
            hasSavedPlan={!!elkPlan}
            canAsk={canAskElk}
            minimumInputHint={MINIMUM_INPUT_HINT}
          />
        </div>

        {elkPlan ? (
          <div className="border-t border-stone-200/80 pt-8 sm:pt-10">
            <section
              className="rounded-2xl bg-stone-50/80 p-4 ring-1 ring-stone-200/80 sm:p-6"
              aria-labelledby="generated-plan-heading"
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
                Generated output
              </p>
              <h2
                id="generated-plan-heading"
                className="mt-1 text-lg font-semibold tracking-tight text-stone-700"
              >
                Last plan from ELK
              </h2>
              <p className="mt-1 text-sm leading-relaxed text-stone-500">
                From your last Ask ELK — on this device only. Update your draft
                above and run Ask ELK again to replace this.
              </p>
              {planJustUpdated ? (
                <p
                  className="mt-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-950 ring-1 ring-emerald-200"
                  role="status"
                >
                  Plan updated based on your latest inputs.
                </p>
              ) : null}
              <div className="mt-6">
                <SavedPlanResults
                  plan={elkPlan}
                  chips={chips}
                  beds={beds}
                  userCrops={allCrops}
                  onAddBed={addBedFromPreset}
                />
              </div>
            </section>
          </div>
        ) : null}
      </div>
    </div>
  )
}
