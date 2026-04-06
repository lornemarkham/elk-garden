import clsx from 'clsx'
import { ChevronDown, Plus, Trash2 } from 'lucide-react'
import type { ChangeEvent } from 'react'
import { useEffect, useId, useMemo, useRef } from 'react'
import { Card } from '../../components/Card'
import type {
  StoredGardenArea,
  StoredGardenRow,
} from '../canvas/gardenStateStorage'
import {
  AREA_PRESETS,
  GOAL_LABELS,
  type GardenGoal,
  type SunLevel,
  THREATS,
} from './planConstants'
import { PlanFlowGroup } from './PlanFlowGroup'
import { dedupeCropListPreserveOrder } from './planAreaCrops'
import {
  areaStatusBadgeClass,
  computeAreaTimingDisplay,
  formatPlannedDateShort,
  plannedAlignment,
  plannedAlignmentBadgeClass,
} from './areaTimingStatus'

type PlanInputsSectionProps = {
  fileInputId: string
  imagePreview: string | null
  onFileChange: (e: ChangeEvent<HTMLInputElement>) => void
  onClearImage: () => void
  chips: string[]
  chipInput: string
  chipAddFeedback: string | null
  chipDuplicateShakeNonce: number
  onChipInputChange: (v: string) => void
  onAddChip: () => void
  onRemoveChip: (c: string) => void
  locationText: string
  onLocationChange: (v: string) => void
  goal: GardenGoal
  onGoalChange: (g: GardenGoal) => void
  threats: Record<string, boolean>
  onToggleThreat: (id: string) => void
  areas: StoredGardenArea[]
  expandedAreaId: string | null
  onToggleAreaExpand: (areaId: string) => void
  onActivateArea: (areaId: string) => void
  showPresetRow: boolean
  onStartAddArea: () => void
  onCancelPreset: () => void
  onAddAreaFromPreset: (presetId: string) => void
  onRemoveArea: (id: string) => void
  onUpdateArea: (id: string, patch: Partial<StoredGardenArea>) => void
  onAddRow: (areaId: string) => void
  onRemoveRow: (areaId: string, rowId: string) => void
  onUpdateRow: (
    areaId: string,
    rowId: string,
    patch: Partial<StoredGardenRow>,
  ) => void
}

export function PlanInputsSection(props: PlanInputsSectionProps) {
  const {
    fileInputId,
    imagePreview,
    onFileChange,
    onClearImage,
    chips,
    chipInput,
    chipAddFeedback,
    chipDuplicateShakeNonce,
    onChipInputChange,
    onAddChip,
    onRemoveChip,
    locationText,
    onLocationChange,
    goal,
    onGoalChange,
    threats,
    onToggleThreat,
    areas,
    expandedAreaId,
    onToggleAreaExpand,
    onActivateArea,
    showPresetRow,
    onStartAddArea,
    onCancelPreset,
    onAddAreaFromPreset,
    onRemoveArea,
    onUpdateArea,
    onAddRow,
    onRemoveRow,
    onUpdateRow,
  } = props

  const cropPool = useMemo(
    () => dedupeCropListPreserveOrder(chips),
    [chips],
  )

  function rowCropOptions(rowCrop: string): string[] {
    const cur = rowCrop.trim()
    const base = cropPool
    if (cur && !base.some((b) => b.trim().toLowerCase() === cur.toLowerCase())) {
      return dedupeCropListPreserveOrder([...base, rowCrop.trim()])
    }
    return base
  }

  const chipFeedbackId = useId()
  const chipShakeWrapRef = useRef<HTMLDivElement>(null)

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

  return (
    <section aria-labelledby="plan-inputs-heading" className="space-y-10">
      <div>
        <h2
          id="plan-inputs-heading"
          className="text-xl font-semibold tracking-tight text-stone-950"
        >
          Current draft
        </h2>
        <p className="mt-1 text-sm leading-relaxed text-stone-600">
          Starts empty after a reset. Edit freely — nothing here is final until
          you run Ask ELK. Your{' '}
          <span className="font-medium text-stone-800">saved plan</span> (below,
          after you generate) is what ELK stored last time; change the draft and
          ask again to replace it.
        </p>
      </div>

      <Card className="overflow-hidden ring-stone-200">
        <div className="aspect-[4/3] w-full bg-stone-100 lg:min-h-[280px]">
          {imagePreview ? (
            <img
              src={imagePreview}
              alt="Your garden sketch or photo"
              className="h-full w-full object-contain"
            />
          ) : (
            <div className="relative flex h-full flex-col">
              <div
                className="grid flex-1 grid-cols-6 gap-px bg-stone-200 p-1"
                aria-hidden="true"
              >
                {Array.from({ length: 24 }).map((_, i) => (
                  <div key={i} className="aspect-square bg-stone-50/90" />
                ))}
              </div>
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-6 text-center">
                <p className="text-base font-semibold text-stone-800">
                  Optional sketch
                </p>
                <p className="max-w-sm text-sm leading-relaxed text-stone-600">
                  Add a photo if it helps — not required for a solid plan.
                </p>
              </div>
            </div>
          )}
        </div>
        <p className="px-4 pt-3 text-sm leading-relaxed text-stone-500">
          Optional — sketch your garden layout if you want.
        </p>
        <div className="flex flex-wrap gap-2 border-t border-stone-200 p-4">
          <label
            htmlFor={fileInputId}
            className="inline-flex cursor-pointer items-center gap-2 rounded-2xl bg-stone-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm ring-1 ring-stone-900 hover:bg-stone-800"
          >
            Upload image
          </label>
          <input
            id={fileInputId}
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={onFileChange}
          />
          {imagePreview ? (
            <button
              type="button"
              onClick={onClearImage}
              className="rounded-2xl bg-white px-4 py-2.5 text-sm font-semibold text-stone-800 ring-1 ring-stone-200 hover:bg-stone-50"
            >
              Remove
            </button>
          ) : null}
        </div>
      </Card>

      <PlanFlowGroup
        title="What you plan to grow"
        hint="Add everything you plan to grow first, then place crops into garden areas and rows below."
      >
        <Card className="p-4 ring-stone-200">
          <label className="block text-base font-semibold text-stone-950">
            Unassigned crops (not placed in a garden area yet)
          </label>
          <p className="mt-1 text-sm text-stone-500">
            Add crop names you might use anywhere. Rows pull from this list; rows
            don’t remove crops from it.
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {dedupeCropListPreserveOrder(chips).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => onRemoveChip(c)}
                className="rounded-full bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-950 ring-1 ring-emerald-200 hover:bg-emerald-100"
                title="Remove"
              >
                {c} ×
              </button>
            ))}
          </div>
          <div className="mt-3 flex flex-col gap-1">
            <div ref={chipShakeWrapRef} className="flex gap-2">
              <input
                value={chipInput}
                onChange={(e) => onChipInputChange(e.target.value)}
                onKeyDown={(e) =>
                  e.key === 'Enter' && (e.preventDefault(), onAddChip())
                }
                placeholder="Add a crop…"
                autoComplete="off"
                aria-invalid={chipAddFeedback ? true : undefined}
                aria-describedby={
                  chipAddFeedback ? chipFeedbackId : undefined
                }
                className={clsx(
                  'min-w-0 flex-1 rounded-2xl border-0 bg-stone-50 px-4 py-3 text-base text-stone-900 ring-1 placeholder:text-stone-500 transition-[box-shadow] duration-150',
                  chipAddFeedback
                    ? 'ring-amber-400 ring-2 focus:ring-2 focus:ring-amber-500'
                    : 'ring-stone-200 focus:ring-2 focus:ring-emerald-600',
                )}
              />
              <button
                type="button"
                onClick={onAddChip}
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
                  : 'opacity-0 pointer-events-none select-none',
              )}
            >
              {chipAddFeedback ?? '\u00a0'}
            </p>
          </div>
        </Card>
      </PlanFlowGroup>

      <div className="rounded-2xl bg-white/50 p-4 ring-1 ring-stone-200/80 sm:p-6">
        <h2 className="text-xl font-semibold tracking-tight text-stone-950">
          Garden areas
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-stone-500">
          Each garden area is full width; rows run left-to-right. Your crop list above is
          reusable — the same crop can go in multiple rows.
        </p>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <button
            type="button"
            onClick={onStartAddArea}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-stone-900 px-4 py-3 text-base font-semibold text-white shadow-sm ring-1 ring-stone-900 hover:bg-stone-800"
          >
            <Plus className="h-5 w-5" aria-hidden="true" />
            Add area
          </button>
        </div>

        {showPresetRow ? (
          <div className="mt-4 rounded-2xl bg-stone-50 p-4 ring-1 ring-stone-200">
            <p className="text-sm font-semibold text-stone-700">
              Quick start — pick a type (you can edit everything after)
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {AREA_PRESETS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => onAddAreaFromPreset(p.id)}
                  className="rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-stone-900 ring-1 ring-stone-200 hover:bg-emerald-50/80 hover:ring-emerald-200"
                >
                  {p.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={onCancelPreset}
              className="mt-3 text-sm font-semibold text-stone-600 underline decoration-stone-300 underline-offset-2 hover:text-stone-900"
            >
              Cancel
            </button>
          </div>
        ) : null}

        {areas.length === 0 ? (
          <p className="mt-6 text-base leading-relaxed text-stone-600">
            No areas yet. Tap{' '}
            <span className="font-semibold text-stone-800">Add area</span> to
            sketch out your garden areas or boxes.
          </p>
        ) : (
          <div className="mt-6 space-y-3">
            {areas.map((a) => {
              const expanded = expandedAreaId === a.id
              const rowCount = a.rows.length
              const plantedCount = a.rows.filter((r) => r.planted).length
              const timing = computeAreaTimingDisplay(a)
              const plannedRaw = a.plannedPlantingDate
              const plannedOk =
                plannedRaw && /^\d{4}-\d{2}-\d{2}$/.test(plannedRaw)
              const align = plannedOk ? plannedAlignment(a) : null
              return (
              <Card
                key={a.id}
                className="relative w-full min-w-0 overflow-hidden p-0 ring-stone-200"
              >
                <div
                  className={clsx(
                    'flex min-h-0 items-stretch gap-1',
                    !expanded && 'border-b border-stone-100',
                  )}
                >
                  <button
                    type="button"
                    onClick={() => onToggleAreaExpand(a.id)}
                    className="flex min-h-[3.25rem] flex-1 items-center gap-3 px-4 py-3 text-left touch-manipulation"
                    aria-expanded={expanded}
                    aria-controls={`area-panel-${a.id}`}
                    id={`area-header-${a.id}`}
                  >
                    <ChevronDown
                      className={clsx(
                        'h-5 w-5 shrink-0 text-stone-500 transition-transform duration-200',
                        expanded && 'rotate-180',
                      )}
                      aria-hidden
                    />
                    <div className="min-w-0">
                      <p className="truncate text-base font-semibold text-stone-950">
                        {a.name.trim() || 'Unnamed area'}
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span
                          className={clsx(
                            'inline-flex shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1',
                            areaStatusBadgeClass(timing.status),
                          )}
                        >
                          {timing.statusLabel}
                        </span>
                        <span className="text-xs leading-snug text-stone-600">
                          <span className="font-medium text-stone-700">
                            Recommended:{' '}
                          </span>
                          {timing.timingHint}
                        </span>
                      </div>
                      {plannedOk ? (
                        <p className="mt-1 text-xs leading-snug text-stone-600">
                          Planned: {formatPlannedDateShort(plannedRaw)}
                          {align ? (
                            <span
                              className={clsx(
                                'ml-2 inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1',
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
                      {!expanded ? (
                        <p className="mt-1 text-sm text-stone-500">
                          {rowCount} {rowCount === 1 ? 'row' : 'rows'} ·{' '}
                          {plantedCount} planted
                        </p>
                      ) : null}
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      onRemoveArea(a.id)
                    }}
                    className="shrink-0 self-stretch px-3 text-stone-500 hover:bg-rose-50 hover:text-rose-800"
                    aria-label={`Remove ${a.name || 'area'}`}
                  >
                    <Trash2 className="mx-auto h-5 w-5" aria-hidden="true" />
                  </button>
                </div>

                {expanded ? (
                <div
                  id={`area-panel-${a.id}`}
                  role="region"
                  aria-labelledby={`area-header-${a.id}`}
                  onFocusCapture={() => onActivateArea(a.id)}
                  className="border-t border-stone-100 px-4 pb-4 pt-3"
                >
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label className="text-sm font-semibold text-stone-600">
                      Area name
                    </label>
                    <input
                      value={a.name}
                      onChange={(e) =>
                        onUpdateArea(a.id, { name: e.target.value })
                      }
                      placeholder="e.g. Greens bed"
                      className="mt-1 w-full rounded-xl bg-stone-50 px-3 py-2 text-lg font-semibold text-stone-950 ring-1 ring-stone-200 placeholder:text-stone-400 focus:ring-2 focus:ring-emerald-600"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-sm font-semibold text-stone-600">
                      Planned planting date{' '}
                      <span className="font-normal text-stone-500">
                        (optional)
                      </span>
                    </label>
                    <input
                      type="date"
                      value={a.plannedPlantingDate ?? ''}
                      onChange={(e) =>
                        onUpdateArea(a.id, {
                          plannedPlantingDate:
                            e.target.value.trim() || undefined,
                        })
                      }
                      className="mt-1 w-full max-w-xs rounded-xl bg-stone-50 px-3 py-2 text-base text-stone-900 ring-1 ring-stone-200 focus:ring-2 focus:ring-emerald-600"
                    />
                    <p className="mt-1 text-xs text-stone-500">
                      Compares to recommended timing — not a reminder.
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-stone-600">
                      Size
                    </label>
                    <input
                      value={a.size}
                      onChange={(e) =>
                        onUpdateArea(a.id, { size: e.target.value })
                      }
                      placeholder="e.g. 4 × 8 ft"
                      className="mt-1 w-full rounded-xl bg-stone-50 px-3 py-2 text-base text-stone-900 ring-1 ring-stone-200 focus:ring-2 focus:ring-emerald-600"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-stone-600">
                      Sun
                    </label>
                    <select
                      value={a.sun}
                      onChange={(e) =>
                        onUpdateArea(a.id, {
                          sun: e.target.value as SunLevel,
                        })
                      }
                      className="mt-1 w-full rounded-xl bg-stone-50 px-3 py-2 text-base text-stone-900 ring-1 ring-stone-200 focus:ring-2 focus:ring-emerald-600"
                    >
                      <option value="full_sun">Full sun</option>
                      <option value="part_sun">Part sun</option>
                      <option value="shade">Shade</option>
                      <option value="unsure">Unsure</option>
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-sm font-semibold text-stone-600">
                      Notes
                    </label>
                    <textarea
                      value={a.notes}
                      onChange={(e) =>
                        onUpdateArea(a.id, { notes: e.target.value })
                      }
                      rows={2}
                      placeholder="Anything helpful to remember…"
                      className="mt-1 max-h-24 w-full resize-y rounded-xl bg-stone-50 px-3 py-2 text-base leading-relaxed text-stone-900 ring-1 ring-stone-200 placeholder:text-stone-400 focus:ring-2 focus:ring-emerald-600"
                    />
                  </div>
                </div>

                <div className="mt-4 w-full min-w-0 border-t border-stone-100 pt-3">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-500">
                    Rows (left → right across the area)
                  </p>
                  <div
                    className="rows-scroll w-full min-w-0 touch-pan-x overflow-x-auto overflow-y-visible overscroll-x-contain scroll-smooth pb-2 [-webkit-overflow-scrolling:touch]"
                    style={{
                      WebkitOverflowScrolling: 'touch',
                      scrollPaddingInlineEnd: '0.75rem',
                    }}
                  >
                    <div className="flex w-max min-w-0 flex-nowrap items-stretch gap-2 py-1 pr-4">
                      {a.rows.length === 0 ? (
                        <span className="shrink-0 self-center py-3 pr-1 text-sm text-stone-500">
                          No rows yet — use Add row →
                        </span>
                      ) : null}
                      {a.rows.map((r, ri) => {
                        const cropChoices = rowCropOptions(r.crop)
                        const noPool =
                          chips.length === 0 && !r.crop.trim()
                        return (
                          <div
                            key={r.id}
                            className="flex w-[9.25rem] min-w-[9.25rem] max-w-[9.25rem] shrink-0 flex-col gap-1 rounded-lg border border-stone-200 bg-white p-1.5 shadow-sm"
                          >
                            <div className="flex items-center justify-between gap-1">
                              <span className="text-[10px] font-semibold uppercase tracking-wide text-stone-400">
                                Row {ri + 1}
                              </span>
                              <button
                                type="button"
                                onClick={() => onRemoveRow(a.id, r.id)}
                                className="flex h-9 min-w-9 shrink-0 items-center justify-center rounded-md text-stone-400 hover:bg-rose-50 hover:text-rose-700"
                                aria-label="Remove row"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                            <label className="sr-only">Crop</label>
                            <select
                              value={r.crop}
                              disabled={noPool}
                              onChange={(e) =>
                                onUpdateRow(a.id, r.id, {
                                  crop: e.target.value,
                                })
                              }
                              className="min-h-10 w-full rounded-md border-0 bg-stone-50 px-2 py-2 text-xs font-medium text-stone-900 ring-1 ring-stone-200 focus:ring-2 focus:ring-emerald-600 disabled:cursor-not-allowed disabled:opacity-70"
                            >
                              <option value="">
                                {noPool
                                  ? `Add crops in "What you plan to grow" first`
                                  : 'Crop…'}
                              </option>
                              {cropChoices.map((c) => (
                                <option key={c} value={c}>
                                  {c}
                                </option>
                              ))}
                            </select>
                            <div className="flex items-center gap-1.5">
                              <label className="sr-only">Width (in)</label>
                              <input
                                type="number"
                                min={0}
                                step="0.5"
                                inputMode="decimal"
                                value={r.widthInches}
                                onChange={(e) =>
                                  onUpdateRow(a.id, r.id, {
                                    widthInches: e.target.value,
                                  })
                                }
                                placeholder="Width"
                                className="min-h-10 min-w-0 flex-1 rounded-md border-0 bg-stone-50 px-2 py-2 text-xs text-stone-900 ring-1 ring-stone-200 placeholder:text-stone-400 focus:ring-2 focus:ring-emerald-600"
                              />
                              <span className="shrink-0 text-[10px] font-medium text-stone-500">
                                in
                              </span>
                            </div>
                            <details className="min-h-0">
                              <summary className="flex min-h-9 cursor-pointer list-none items-center text-[10px] font-semibold text-stone-500 marker:content-none [&::-webkit-details-marker]:hidden">
                                Notes
                              </summary>
                              <textarea
                                value={r.notes}
                                onChange={(e) =>
                                  onUpdateRow(a.id, r.id, {
                                    notes: e.target.value,
                                  })
                                }
                                rows={1}
                                placeholder="Optional"
                                className="mt-1 max-h-16 w-full resize-y rounded-md border-0 bg-stone-50 px-2 py-1.5 text-xs leading-snug text-stone-900 ring-1 ring-stone-200 placeholder:text-stone-400 focus:ring-2 focus:ring-emerald-600"
                              />
                            </details>
                          </div>
                        )
                      })}
                      <button
                        type="button"
                        onClick={() => onAddRow(a.id)}
                        className="flex min-h-[8.5rem] w-[5.5rem] min-w-[5.5rem] shrink-0 flex-col items-center justify-center gap-1 self-stretch rounded-lg border border-dashed border-stone-300 bg-stone-50/90 px-2 py-3 text-xs font-semibold text-stone-600 touch-manipulation hover:border-stone-400 hover:bg-stone-100"
                      >
                        <Plus className="h-5 w-5 shrink-0" aria-hidden />
                        Add row
                      </button>
                    </div>
                  </div>
                </div>
                </div>
                ) : null}
              </Card>
              )
            })}
          </div>
        )}
      </div>

      <div className="space-y-4">
        <PlanFlowGroup title="Your place" hint="Optional — helps tailor ideas.">
          <Card className="p-4 ring-stone-200">
            <label className="block text-base font-semibold text-stone-950">
              Location
            </label>
            <input
              value={locationText}
              onChange={(e) => onLocationChange(e.target.value)}
              placeholder="City, region, or neighborhood"
              className="mt-2 w-full rounded-2xl border-0 bg-stone-50 px-4 py-3 text-base text-stone-900 ring-1 ring-stone-200 placeholder:text-stone-500 focus:ring-2 focus:ring-emerald-600"
            />
          </Card>

          <Card className="p-4 ring-stone-200">
            <label className="block text-base font-semibold text-stone-950">
              Garden goals
            </label>
            <select
              value={goal}
              onChange={(e) => onGoalChange(e.target.value as GardenGoal)}
              className="mt-2 w-full rounded-2xl border-0 bg-stone-50 px-4 py-3 text-base text-stone-900 ring-1 ring-stone-200 focus:ring-2 focus:ring-emerald-600"
            >
              <option value="easy_care">{GOAL_LABELS.easy_care}</option>
              <option value="high_yield">{GOAL_LABELS.high_yield}</option>
              <option value="balanced">{GOAL_LABELS.balanced}</option>
            </select>
          </Card>
        </PlanFlowGroup>

        <PlanFlowGroup title="Threats to plan for">
          <Card className="p-4 ring-stone-200">
            <div className="space-y-3">
              {THREATS.map((t) => (
                <label
                  key={t.id}
                  className="flex cursor-pointer items-center gap-3 rounded-xl bg-stone-50/80 px-3 py-3 ring-1 ring-stone-200"
                >
                  <input
                    type="checkbox"
                    checked={!!threats[t.id]}
                    onChange={() => onToggleThreat(t.id)}
                    className="h-5 w-5 rounded border-stone-300 text-emerald-700 focus:ring-emerald-600"
                  />
                  <span className="text-base font-medium text-stone-900">
                    {t.label}
                  </span>
                </label>
              ))}
            </div>
          </Card>
        </PlanFlowGroup>
      </div>
    </section>
  )
}
