import { useMemo, useState } from 'react'
import clsx from 'clsx'
import { CheckCircle2, Clock, AlertCircle, ChevronRight, TrendingDown, TrendingUp } from 'lucide-react'
import { PrimaryPageIntro } from '../../components/PrimaryPageIntro'
import { SectionContainer } from '../../components/SectionContainer'
import { FeatureGate, CapacityBar, UpgradePrompt } from '../../components/capability'
import { useCapabilities } from '../../lib/capabilities/CapabilityProvider'
import type {
  InventoryItem,
  InventoryPhase,
  InventoryStatus,
  AmbitionMode,
} from '../../types/inventory'
import {
  MOCK_INVENTORY,
  LEARNING_STEPS,
  PROJECT_CARDS,
} from '../../lib/mockData/mockInventory'
import {
  CATEGORY_LABELS,
  STATUS_LABELS,
  PHASE_LABELS,
  computeInventorySummary,
  computeCapabilities,
  computeMissingByPhase,
  computeAmbitionModes,
  computeFinancialSummary,
  computePhaseBudgets,
  filterItems,
  sortItems,
  getItemTotalCost,
  formatCurrency,
  loadAmbitionMode,
  saveAmbitionMode,
  type ComputedCapability,
  type InventorySortBy,
} from './inventoryViewModel'

// ---------------------------------------------------------------------------
// Styling helpers
// ---------------------------------------------------------------------------

function statusClass(status: InventoryStatus): string {
  switch (status) {
    // In-possession — greens and teals
    case 'owned':      return 'bg-emerald-50 text-emerald-800 ring-emerald-200'
    case 'active':     return 'bg-emerald-100 text-emerald-900 ring-emerald-300'
    case 'experimental': return 'bg-violet-50 text-violet-700 ring-violet-200'
    case 'strategic':  return 'bg-sky-50 text-sky-700 ring-sky-200'
    // Acquisition
    case 'ordered':    return 'bg-sky-50 text-sky-800 ring-sky-200'
    case 'needed':     return 'bg-amber-50 text-amber-800 ring-amber-200'
    case 'wishlist':   return 'bg-yellow-50 text-yellow-700 ring-yellow-200'
    case 'recommended': return 'bg-teal-50 text-teal-700 ring-teal-200'
    case 'maybe-later': return 'bg-stone-100 text-stone-600 ring-stone-200'
    // Inactive
    case 'archived':   return 'bg-stone-100 text-stone-400 ring-stone-200'
    case 'retired':    return 'bg-stone-100 text-stone-400 ring-stone-200'
  }
}

function phaseClass(phase: InventoryPhase): string {
  switch (phase) {
    case 'learn':
      return 'bg-violet-50 text-violet-700 ring-violet-200'
    case 'prototype':
      return 'bg-sky-50 text-sky-700 ring-sky-200'
    case 'deploy':
      return 'bg-emerald-50 text-emerald-700 ring-emerald-200'
    case 'automate':
      return 'bg-amber-50 text-amber-700 ring-amber-200'
    case 'optimize':
      return 'bg-rose-50 text-rose-700 ring-rose-200'
  }
}

function availabilityClass(a: ComputedCapability['availability']): string {
  switch (a) {
    case 'available':
      return 'bg-emerald-50 text-emerald-700 ring-emerald-200'
    case 'arriving':
      return 'bg-sky-50 text-sky-700 ring-sky-200'
    case 'blocked':
      return 'bg-stone-100 text-stone-500 ring-stone-200'
  }
}

function availabilityLabel(a: ComputedCapability['availability']): string {
  switch (a) {
    case 'available':
      return 'Available Now'
    case 'arriving':
      return 'Arriving Soon'
    case 'blocked':
      return 'Needs Items'
  }
}

function scoreColor(score: number): string {
  if (score >= 75) return 'text-emerald-700'
  if (score >= 50) return 'text-amber-700'
  return 'text-stone-500'
}

function difficultyClass(d: 'beginner' | 'intermediate' | 'advanced'): string {
  switch (d) {
    case 'beginner':
      return 'bg-emerald-50 text-emerald-700 ring-emerald-200'
    case 'intermediate':
      return 'bg-amber-50 text-amber-700 ring-amber-200'
    case 'advanced':
      return 'bg-rose-50 text-rose-700 ring-rose-200'
  }
}

// ---------------------------------------------------------------------------
// Summary card
// ---------------------------------------------------------------------------

function SummaryCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string
  value: string | number
  sub?: string
  accent?: string
}) {
  return (
    <div className="rounded-2xl bg-white p-3.5 ring-1 ring-stone-200 shadow-sm">
      <p className="text-[0.68rem] font-semibold uppercase tracking-wider text-stone-500">{label}</p>
      <p className={clsx('mt-1 text-2xl font-bold leading-none tabular-nums', accent ?? 'text-stone-900')}>
        {value}
      </p>
      {sub ? <p className="mt-1 text-xs text-stone-500">{sub}</p> : null}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Inventory item card
// ---------------------------------------------------------------------------

function ItemCard({ item }: { item: InventoryItem }) {
  const cost = getItemTotalCost(item)
  return (
    <div
      className={clsx(
        'rounded-2xl bg-white p-4 ring-1 shadow-sm flex flex-col gap-2',
        item.priority === 'critical' && item.status !== 'owned'
          ? 'ring-amber-200'
          : 'ring-stone-200',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-bold leading-snug text-stone-900">{item.name}</p>
        {item.quantity > 1 ? (
          <span className="shrink-0 rounded-full bg-stone-100 px-2 py-0.5 text-[0.68rem] font-bold text-stone-600 ring-1 ring-stone-200">
            ×{item.quantity}
          </span>
        ) : null}
      </div>
      <div className="flex flex-wrap gap-1.5">
        <span className={clsx('rounded-full px-2 py-0.5 text-[0.68rem] font-semibold ring-1', statusClass(item.status))}>
          {STATUS_LABELS[item.status]}
        </span>
        <span className={clsx('rounded-full px-2 py-0.5 text-[0.68rem] font-semibold ring-1', phaseClass(item.phase))}>
          {PHASE_LABELS[item.phase]}
        </span>
        {item.priority === 'critical' ? (
          <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[0.68rem] font-semibold text-rose-700 ring-1 ring-rose-200">
            Critical
          </span>
        ) : null}
      </div>
      <div className="flex items-center justify-between gap-2">
        <p className="text-[0.72rem] text-stone-500 leading-relaxed">{CATEGORY_LABELS[item.category]}</p>
        {cost.value !== null ? (
          <span className={clsx(
            'shrink-0 text-[0.72rem] font-semibold tabular-nums',
            cost.confidence === 'exact' ? 'text-stone-700' : 'text-stone-500',
          )}>
            {cost.confidence !== 'exact' ? '≈\u00a0' : ''}{formatCurrency(cost.value, item.currency ?? 'CAD')}
          </span>
        ) : (
          <span className="shrink-0 text-[0.68rem] text-stone-400 italic">cost unknown</span>
        )}
      </div>
      {item.notes ? (
        <p className="text-[0.72rem] leading-relaxed text-stone-600 line-clamp-2">{item.notes}</p>
      ) : null}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Capability card
// ---------------------------------------------------------------------------

function CapabilityCardView({ cap }: { cap: ComputedCapability }) {
  return (
    <div
      className={clsx(
        'rounded-2xl bg-white p-4 ring-1 shadow-sm flex flex-col gap-3',
        cap.availability === 'available' ? 'ring-emerald-200' : 'ring-stone-200',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-bold leading-snug text-stone-900">{cap.title}</p>
        <span className={clsx('shrink-0 rounded-full px-2.5 py-1 text-[0.65rem] font-bold ring-1', availabilityClass(cap.availability))}>
          {availabilityLabel(cap.availability)}
        </span>
      </div>
      <p className="text-xs leading-relaxed text-stone-600">{cap.description}</p>
      <div className="flex items-center justify-between gap-2">
        <span className={clsx('rounded-full px-2 py-0.5 text-[0.65rem] font-semibold ring-1', phaseClass(cap.phase))}>
          {PHASE_LABELS[cap.phase]} phase
        </span>
        {cap.arrivingSoon.length > 0 && cap.availability === 'arriving' ? (
          <p className="text-[0.68rem] text-sky-700 font-semibold">
            Waiting on {cap.arrivingSoon.length} item{cap.arrivingSoon.length > 1 ? 's' : ''}
          </p>
        ) : null}
        {cap.blockedBy.length > 0 ? (
          <p className="text-[0.68rem] text-stone-500">
            Needs {cap.blockedBy.length} item{cap.blockedBy.length > 1 ? 's' : ''}
          </p>
        ) : null}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Filter chip
// ---------------------------------------------------------------------------

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        'rounded-full px-3 py-1.5 text-xs font-semibold ring-1 transition',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600',
        active
          ? 'bg-stone-900 text-white ring-stone-900'
          : 'bg-white text-stone-700 ring-stone-200 hover:bg-stone-50',
      )}
    >
      {label}
    </button>
  )
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export function InventoryPage() {
  const caps = useCapabilities()

  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<InventoryStatus | 'all'>('all')
  const [filterPhase, setFilterPhase] = useState<InventoryPhase | 'all'>('all')
  const [sortBy, setSortBy] = useState<InventorySortBy>('default')
  const [ambitionMode, setAmbitionMode] = useState<AmbitionMode>(loadAmbitionMode)

  const items = MOCK_INVENTORY

  const summary = useMemo(() => computeInventorySummary(items), [items])
  const financials = useMemo(() => computeFinancialSummary(items), [items])
  const phaseBudgets = useMemo(() => computePhaseBudgets(items), [items])
  const capabilities = useMemo(() => computeCapabilities(items), [items])
  const missingByPhase = useMemo(() => computeMissingByPhase(items), [items])
  const ambitionModes = useMemo(() => computeAmbitionModes(items), [items])
  const filteredItems = useMemo(() => {
    const filtered = filterItems(items, { search, status: filterStatus, phase: filterPhase, category: 'all' })
    return sortItems(filtered, sortBy)
  }, [items, search, filterStatus, filterPhase, sortBy])

  const activeMode = ambitionModes.find((m) => m.id === ambitionMode)

  const handleAmbitionMode = (mode: AmbitionMode) => {
    setAmbitionMode(mode)
    saveAmbitionMode(mode)
  }

  const statusFilters: Array<{ value: InventoryStatus | 'all'; label: string }> = [
    { value: 'all', label: 'All' },
    // In-possession
    { value: 'owned', label: 'Owned' },
    { value: 'active', label: 'Active' },
    { value: 'experimental', label: 'Experimental' },
    { value: 'strategic', label: 'Strategic' },
    // Acquisition
    { value: 'ordered', label: 'Ordered' },
    { value: 'needed', label: 'Needed' },
    { value: 'wishlist', label: 'Wishlist' },
    { value: 'maybe-later', label: 'Maybe Later' },
    // Inactive
    { value: 'archived', label: 'Archived' },
  ]

  const phaseFilters: Array<{ value: InventoryPhase | 'all'; label: string }> = [
    { value: 'all', label: 'All phases' },
    { value: 'learn', label: 'Learn' },
    { value: 'prototype', label: 'Prototype' },
    { value: 'deploy', label: 'Deploy' },
    { value: 'automate', label: 'Automate' },
    { value: 'optimize', label: 'Optimize' },
  ]

  const sortOptions: Array<{ value: InventorySortBy; label: string }> = [
    { value: 'default', label: 'Default' },
    { value: 'cost-asc', label: 'Cost ↑' },
    { value: 'cost-desc', label: 'Cost ↓' },
  ]

  return (
    <div className="grid gap-6 py-6">
      <PrimaryPageIntro
        title="Inventory & Capability"
        description="What you have, what you've ordered, what you're building toward — and exactly what your current gear enables."
      />

      {/* ------------------------------------------------------------------ */}
      {/* Summary cards                                                       */}
      {/* ------------------------------------------------------------------ */}
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
        <SummaryCard label="Total Items" value={summary.total} />
        <SummaryCard
          label="In Possession"
          value={summary.owned}
          sub="owned + active + experimental"
          accent="text-emerald-700"
        />
        <SummaryCard
          label="Ordered"
          value={summary.ordered}
          sub="arriving soon"
          accent="text-sky-700"
        />
        <SummaryCard
          label="Needed"
          value={summary.needed}
          accent="text-amber-700"
        />
        <SummaryCard
          label="Critical Missing"
          value={summary.criticalMissing}
          sub="items needed + ordered"
          accent={summary.criticalMissing > 3 ? 'text-rose-700' : 'text-stone-900'}
        />
        <SummaryCard
          label="Readiness Score"
          value={`${summary.readinessScore}%`}
          sub={`${PHASE_LABELS[summary.currentPhase]} phase`}
          accent={scoreColor(summary.readinessScore)}
        />
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Inventory capacity                                                  */}
      {/* ------------------------------------------------------------------ */}
      <div className="rounded-2xl bg-white px-4 py-3.5 ring-1 ring-stone-200 shadow-sm">
        <CapacityBar
          label="Inventory items"
          current={items.length}
          max={caps.inventory.maxItems}
        />
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Budget & Spend                                                      */}
      {/* ------------------------------------------------------------------ */}
      <SectionContainer
        title="Budget & Spend"
        subtitle="Estimated cost of your current inventory, outstanding orders, and what you still need to purchase."
      >
        {/* Financial summary cards */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <SummaryCard
            label="Owned Inventory Value"
            value={formatCurrency(financials.ownedValue, financials.currency)}
            sub="estimated, all owned items"
            accent="text-emerald-700"
          />
          <SummaryCard
            label="Ordered Spend"
            value={formatCurrency(financials.orderedTotal, financials.currency)}
            sub="arriving soon"
            accent="text-sky-700"
          />
          <SummaryCard
            label="Needed Items"
            value={formatCurrency(financials.neededEstimated, financials.currency)}
            sub="still to purchase"
            accent="text-amber-700"
          />
          <SummaryCard
            label="Critical Missing"
            value={formatCurrency(financials.criticalMissingEstimated, financials.currency)}
            sub="priority purchases"
            accent="text-rose-600"
          />
          <SummaryCard
            label={`Complete ${financials.nextPhaseLabel} Phase`}
            value={formatCurrency(financials.nextPhaseCost, financials.currency)}
            sub="estimated to reach next milestone"
            accent="text-stone-700"
          />
          <SummaryCard
            label="Actual Spend Tracked"
            value={financials.actualSpendTracked > 0
              ? formatCurrency(financials.actualSpendTracked, financials.currency)
              : '—'}
            sub={financials.actualSpendTracked > 0 ? 'with receipts' : 'no exact receipts yet'}
          />
        </div>

        <p className="mt-3 text-xs text-stone-400 italic">
          Costs are estimated in CAD. Add actual receipts to individual items to improve accuracy.
        </p>
      </SectionContainer>

      {/* ------------------------------------------------------------------ */}
      {/* Phase Readiness Budget — Grower feature                            */}
      {/* ------------------------------------------------------------------ */}
      <FeatureGate
        enabled={caps.inventory.advancedBudgeting}
        feature="Phase Readiness Budget"
        description="See every build phase broken down into owned vs. still-needed items, with low/high cost estimates to help you plan purchases without surprises."
        requiredPlan="grower"
      >
      <SectionContainer
        title="Phase Readiness Budget"
        subtitle="What you own versus what you still need — broken down by build phase."
      >
        <div className="grid gap-4">
          {phaseBudgets.map((budget) => (
            <div
              key={budget.phase}
              className="rounded-2xl bg-white ring-1 ring-stone-200 shadow-sm overflow-hidden"
            >
              {/* Phase header */}
              <div className={clsx(
                'flex items-center justify-between gap-3 px-4 py-3 border-b border-stone-100',
              )}>
                <div className="flex items-center gap-2">
                  <span className={clsx('rounded-full px-3 py-1 text-xs font-bold ring-1', phaseClass(budget.phase))}>
                    {budget.label}
                  </span>
                  <span className="text-xs text-stone-500">
                    {budget.ownedItems.length} owned · {budget.neededOrOrderedItems.length} still needed
                  </span>
                </div>
                {budget.neededOrOrderedItems.length > 0 ? (
                  <span className="shrink-0 text-xs font-semibold text-amber-700">
                    {budget.neededCostLow === budget.neededCostHigh
                      ? formatCurrency(budget.neededCostLow, 'CAD')
                      : `${formatCurrency(budget.neededCostLow, 'CAD')} – ${formatCurrency(budget.neededCostHigh, 'CAD')}`}
                    {' '}to complete
                  </span>
                ) : (
                  <span className="shrink-0 text-xs font-semibold text-emerald-700">✓ Phase complete</span>
                )}
              </div>

              <div className="grid sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-stone-100">
                {/* Owned column */}
                <div className="px-4 py-3">
                  <p className="mb-2 text-[0.68rem] font-bold uppercase tracking-wider text-stone-400">
                    In your possession
                  </p>
                  {budget.ownedItems.length === 0 ? (
                    <p className="text-xs text-stone-400 italic">Nothing owned in this phase yet.</p>
                  ) : (
                    <ul className="space-y-1.5">
                      {budget.ownedItems.map((item) => {
                        const cost = getItemTotalCost(item)
                        return (
                          <li key={item.id} className="flex items-center justify-between gap-2">
                            <span className="text-xs text-stone-700 leading-snug">{item.name}</span>
                            {cost.value !== null ? (
                              <span className="shrink-0 text-[0.68rem] tabular-nums text-stone-400">
                                {cost.confidence !== 'exact' ? '≈\u00a0' : ''}{formatCurrency(cost.value, item.currency ?? 'CAD')}
                              </span>
                            ) : null}
                          </li>
                        )
                      })}
                    </ul>
                  )}
                  {budget.ownedValue > 0 ? (
                    <p className="mt-2.5 text-[0.68rem] font-semibold text-stone-500 tabular-nums">
                      ≈ {formatCurrency(budget.ownedValue, 'CAD')} owned value
                    </p>
                  ) : null}
                </div>

                {/* Needed column */}
                <div className="px-4 py-3">
                  <p className="mb-2 text-[0.68rem] font-bold uppercase tracking-wider text-stone-400">
                    Still needed
                  </p>
                  {budget.neededOrOrderedItems.length === 0 ? (
                    <p className="text-xs text-emerald-700 font-semibold">All items in hand — ready to build.</p>
                  ) : (
                    <ul className="space-y-1.5">
                      {budget.neededOrOrderedItems.map((item) => {
                        const cost = getItemTotalCost(item)
                        return (
                          <li key={item.id} className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-1.5 min-w-0">
                              {item.status === 'ordered' ? (
                                <Clock className="h-3 w-3 shrink-0 text-sky-500" />
                              ) : item.priority === 'critical' ? (
                                <AlertCircle className="h-3 w-3 shrink-0 text-amber-500" />
                              ) : (
                                <ChevronRight className="h-3 w-3 shrink-0 text-stone-300" />
                              )}
                              <span className={clsx(
                                'text-xs leading-snug',
                                item.status === 'ordered' ? 'text-sky-700' : 'text-stone-700',
                              )}>
                                {item.name}
                                {item.status === 'ordered' ? ' (ordered)' : ''}
                              </span>
                            </div>
                            {cost.value !== null ? (
                              <span className="shrink-0 text-[0.68rem] tabular-nums text-stone-500">
                                ≈\u00a0{formatCurrency(cost.value, item.currency ?? 'CAD')}
                              </span>
                            ) : null}
                          </li>
                        )
                      })}
                    </ul>
                  )}
                  {budget.neededOrOrderedItems.length > 0 && (
                    <p className="mt-2.5 text-[0.68rem] font-semibold text-amber-700 tabular-nums">
                      Estimated cost:{' '}
                      {budget.neededCostLow === budget.neededCostHigh
                        ? formatCurrency(budget.neededCostLow, 'CAD')
                        : `${formatCurrency(budget.neededCostLow, 'CAD')} – ${formatCurrency(budget.neededCostHigh, 'CAD')}`}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-stone-400 italic">
          Cost ranges use the estimated low and replacement-cost high. Ordered items are included in "still needed" until received.
        </p>
      </SectionContainer>
      </FeatureGate>

      {/* ------------------------------------------------------------------ */}
      {/* Ambition Mode Selector                                              */}
      {/* ------------------------------------------------------------------ */}
      <SectionContainer
        title="Garden Ambition Mode"
        subtitle="Select the system you're building toward. This shapes which items are prioritised and how readiness is framed."
      >
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-2">
            {ambitionModes.map((mode) => (
              <button
                key={mode.id}
                type="button"
                onClick={() => handleAmbitionMode(mode.id)}
                className={clsx(
                  'rounded-2xl px-4 py-2.5 text-sm font-semibold ring-1 transition text-left',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600',
                  ambitionMode === mode.id
                    ? 'bg-stone-900 text-white ring-stone-900 shadow-sm'
                    : 'bg-white text-stone-800 ring-stone-200 hover:bg-stone-50',
                )}
              >
                <span className="block">{mode.label}</span>
                {ambitionMode === mode.id && (
                  <span className="mt-0.5 block text-[0.68rem] font-normal text-stone-300">
                    {mode.readinessScore}% ready
                  </span>
                )}
              </button>
            ))}
          </div>
          {activeMode ? (
            <div className="rounded-2xl bg-stone-50 px-4 py-3.5 ring-1 ring-stone-200">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-stone-900">{activeMode.tagline}</p>
                  <p className="mt-1 text-sm leading-relaxed text-stone-600">
                    {activeMode.description}
                  </p>
                </div>
                <span
                  className={clsx(
                    'shrink-0 rounded-2xl px-3 py-2 text-xl font-bold ring-1',
                    scoreColor(activeMode.readinessScore ?? 0),
                    'bg-white ring-stone-200',
                  )}
                >
                  {activeMode.readinessScore}%
                </span>
              </div>
            </div>
          ) : null}
        </div>
      </SectionContainer>

      {/* ------------------------------------------------------------------ */}
      {/* What you can build now                                              */}
      {/* ------------------------------------------------------------------ */}
      <SectionContainer
        title="What You Can Build Right Now"
        subtitle="Based on your current inventory — no guessing required."
      >
        <div className="grid gap-3 sm:grid-cols-2">
          {capabilities.map((cap) => (
            <CapabilityCardView key={cap.id} cap={cap} />
          ))}
        </div>
        <p className="mt-3 text-xs text-stone-400 italic">
          Availability is calculated live from your owned and ordered items.
        </p>
      </SectionContainer>

      {/* ------------------------------------------------------------------ */}
      {/* Missing for next phase                                              */}
      {/* ------------------------------------------------------------------ */}
      <SectionContainer
        title="Missing for Next Phase"
        subtitle="The specific items blocking your progression. Ordered items count as in-progress."
      >
        <div className="grid gap-4">
          {missingByPhase.map((group) => (
            <div key={group.phase}>
              <div className="mb-2.5 flex items-center gap-2">
                <span className={clsx('rounded-full px-3 py-1 text-xs font-bold ring-1', phaseClass(group.phase))}>
                  {group.label} Phase
                </span>
                <p className="text-xs text-stone-500">{group.description}</p>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {group.items.map((item) => (
                  <div
                    key={item.id}
                    className={clsx(
                      'flex items-start gap-3 rounded-2xl px-4 py-3 ring-1',
                      item.status === 'ordered'
                        ? 'bg-sky-50/60 ring-sky-200'
                        : item.priority === 'critical'
                          ? 'bg-amber-50/60 ring-amber-200'
                          : 'bg-white ring-stone-200',
                    )}
                  >
                    <span className="mt-0.5 shrink-0" aria-hidden="true">
                      {item.status === 'ordered' ? (
                        <Clock className="h-4 w-4 text-sky-600" />
                      ) : item.priority === 'critical' ? (
                        <AlertCircle className="h-4 w-4 text-amber-600" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-stone-400" />
                      )}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold leading-snug text-stone-900">{item.name}</p>
                      <div className="mt-1 flex flex-wrap gap-1">
                        <span className={clsx('rounded-full px-2 py-0.5 text-[0.65rem] font-semibold ring-1', statusClass(item.status))}>
                          {STATUS_LABELS[item.status]}
                        </span>
                        {item.priority === 'critical' && (
                          <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[0.65rem] font-semibold text-rose-700 ring-1 ring-rose-200">
                            Critical
                          </span>
                        )}
                      </div>
                      {item.notes ? (
                        <p className="mt-1.5 text-[0.72rem] leading-relaxed text-stone-500 line-clamp-2">
                          {item.notes}
                        </p>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </SectionContainer>

      {/* ------------------------------------------------------------------ */}
      {/* Inventory Catalog                                                   */}
      {/* ------------------------------------------------------------------ */}
      <SectionContainer
        title="Inventory Catalog"
        subtitle={`${filteredItems.length} of ${items.length} items shown. Search, filter, and explore your full gear list.`}
      >
        {/* Search */}
        <input
          type="search"
          placeholder="Search by name or notes…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="mb-3 w-full rounded-2xl border-none bg-white px-4 py-3 text-sm text-stone-900 placeholder-stone-400 shadow-sm ring-1 ring-stone-200 outline-none focus:ring-2 focus:ring-emerald-600"
        />

        {/* Status filters */}
        <div className="mb-2 flex flex-wrap gap-2">
          {statusFilters.map((f) => (
            <FilterChip
              key={f.value}
              label={f.label}
              active={filterStatus === f.value}
              onClick={() => setFilterStatus(f.value)}
            />
          ))}
        </div>

        {/* Phase filters */}
        <div className="mb-2 flex flex-wrap gap-2">
          {phaseFilters.map((f) => (
            <FilterChip
              key={f.value}
              label={f.label}
              active={filterPhase === f.value}
              onClick={() => setFilterPhase(f.value)}
            />
          ))}
        </div>

        {/* Sort by cost */}
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span className="text-[0.68rem] font-semibold uppercase tracking-wider text-stone-400 mr-1">Sort:</span>
          {sortOptions.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setSortBy(opt.value)}
              className={clsx(
                'flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold ring-1 transition',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600',
                sortBy === opt.value
                  ? 'bg-stone-900 text-white ring-stone-900'
                  : 'bg-white text-stone-700 ring-stone-200 hover:bg-stone-50',
              )}
            >
              {opt.value === 'cost-asc' && <TrendingUp className="h-3 w-3" />}
              {opt.value === 'cost-desc' && <TrendingDown className="h-3 w-3" />}
              {opt.label}
            </button>
          ))}
        </div>

        {!caps.inventory.aiRecommendations && (
          <UpgradePrompt
            feature="AI Inventory Recommendations"
            description="Automatically surface missing items, flag duplicate risks, and suggest next purchases based on your build goals."
            requiredPlan="grower"
            className="mb-4"
          />
        )}

        {!caps.inventory.exportImport && (
          <UpgradePrompt
            feature="Export & Import"
            description="Export your full inventory to CSV or JSON. Import from a file to migrate from spreadsheets or other tools."
            requiredPlan="grower"
            className="mb-4"
          />
        )}

        {filteredItems.length === 0 ? (
          <div className="rounded-2xl bg-stone-50 px-4 py-6 text-center ring-1 ring-stone-200">
            <p className="text-sm font-semibold text-stone-700">No items match your filters.</p>
            <p className="mt-1 text-xs text-stone-500">Try adjusting the search or filters above.</p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {filteredItems.map((item) => (
              <ItemCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </SectionContainer>

      {/* ------------------------------------------------------------------ */}
      {/* Photo Recognition — Operator feature                               */}
      {/* ------------------------------------------------------------------ */}
      <FeatureGate
        enabled={caps.inventory.photoRecognition}
        feature="Photo Inventory Recognition"
        description="Point your camera at any component, sensor, or board and ELK Garden identifies it, adds it to your inventory, and links it to the relevant build phase automatically."
        requiredPlan="operator"
      >
        {/* When unlocked this section will render the photo intake UI */}
        <div className="rounded-2xl bg-white px-4 py-4 ring-1 ring-stone-200 shadow-sm">
          <p className="text-sm font-bold text-stone-900">Photo Recognition</p>
          <p className="mt-1 text-xs text-stone-500">Photo intake UI will render here.</p>
        </div>
      </FeatureGate>

      {/* ------------------------------------------------------------------ */}
      {/* Learning path                                                       */}
      {/* ------------------------------------------------------------------ */}
      <SectionContainer
        title="Learning Path"
        subtitle="A sequential map from first LED to automated irrigation. Each step connects your gear to a concrete skill."
      >
        <ol className="grid gap-3">
          {LEARNING_STEPS.map((step) => (
            <li
              key={step.id}
              className="flex gap-4 rounded-2xl bg-white px-4 py-4 ring-1 ring-stone-200 shadow-sm"
            >
              <span
                className={clsx(
                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl text-sm font-bold ring-1',
                  phaseClass(step.phase),
                )}
                aria-hidden="true"
              >
                {step.stepNumber}
              </span>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-bold text-stone-900">{step.title}</p>
                  <span className={clsx('rounded-full px-2 py-0.5 text-[0.65rem] font-semibold ring-1', phaseClass(step.phase))}>
                    {PHASE_LABELS[step.phase]}
                  </span>
                </div>
                <p className="mt-1.5 text-xs leading-relaxed text-stone-600">{step.description}</p>
                <div className="mt-2 flex items-start gap-1.5">
                  <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" aria-hidden="true" />
                  <p className="text-[0.72rem] font-semibold text-emerald-800">{step.outcome}</p>
                </div>
              </div>
            </li>
          ))}
        </ol>
      </SectionContainer>

      {/* ------------------------------------------------------------------ */}
      {/* Project roadmap                                                     */}
      {/* ------------------------------------------------------------------ */}
      <SectionContainer
        title="Project Roadmap"
        subtitle="Concrete builds that move the ELK Garden system forward. Each project has a clear outcome."
      >
        <div className="grid gap-3 sm:grid-cols-2">
          {PROJECT_CARDS.map((project) => {
            const available = project.requiredItemIds.length === 0 ||
              project.requiredItemIds.every((id) => {
                const item = MOCK_INVENTORY.find((i) => i.id === id)
                return item?.status === 'owned' || item?.status === 'ordered'
              })
            const allOwned = project.requiredItemIds.length === 0 ||
              project.requiredItemIds.every((id) => {
                const item = MOCK_INVENTORY.find((i) => i.id === id)
                return item?.status === 'owned'
              })
            return (
              <div
                key={project.id}
                className={clsx(
                  'rounded-2xl bg-white p-4 ring-1 shadow-sm flex flex-col gap-3',
                  allOwned ? 'ring-emerald-200' : available ? 'ring-sky-200' : 'ring-stone-200',
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-bold leading-snug text-stone-900">{project.title}</p>
                  <span
                    className={clsx(
                      'shrink-0 rounded-full px-2.5 py-1 text-[0.65rem] font-bold ring-1',
                      allOwned
                        ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
                        : available
                          ? 'bg-sky-50 text-sky-700 ring-sky-200'
                          : 'bg-stone-100 text-stone-500 ring-stone-200',
                    )}
                  >
                    {allOwned ? 'Ready to build' : available ? 'Almost ready' : 'Future build'}
                  </span>
                </div>
                <p className="text-xs leading-relaxed text-stone-600">{project.description}</p>
                <div className="flex items-start gap-1.5">
                  <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" aria-hidden="true" />
                  <p className="text-[0.72rem] font-semibold text-emerald-800">{project.outcome}</p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <span className={clsx('rounded-full px-2 py-0.5 text-[0.65rem] font-semibold ring-1', phaseClass(project.phase))}>
                    {PHASE_LABELS[project.phase]}
                  </span>
                  <span className={clsx('rounded-full px-2 py-0.5 text-[0.65rem] font-semibold ring-1', difficultyClass(project.estimatedDifficulty))}>
                    {project.estimatedDifficulty}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </SectionContainer>
    </div>
  )
}
