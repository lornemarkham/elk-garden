import type {
  InventoryItem,
  InventoryCategory,
  InventoryPhase,
  InventoryStatus,
  CapabilityCard,
  CapabilityAvailability,
  AmbitionMode,
  InventorySummary,
  AmbitionModeDef,
  InventoryFinancialSummary,
  PhaseBudget,
  CostConfidence,
} from '../../types/inventory'
import { CAPABILITY_CARDS, AMBITION_MODES } from '../../lib/mockData/mockInventory'

// ---------------------------------------------------------------------------
// Label maps — single source of truth for display strings
// ---------------------------------------------------------------------------

export const CATEGORY_LABELS: Record<InventoryCategory, string> = {
  // Core compute
  'boards-controllers': 'Boards & Controllers',
  'edge-compute': 'Edge Compute',
  // Sensing
  sensors: 'Sensors',
  // Vision
  cameras: 'Cameras',
  'vision-monitoring': 'Vision & Monitoring',
  // Actuation
  automation: 'Automation',
  robotics: 'Robotics',
  'motion-control': 'Motion Control',
  // Power
  power: 'Power',
  // Connectivity
  networking: 'Networking',
  'smart-home': 'Smart Home',
  // Wiring & Prototyping
  'wiring-prototyping': 'Wiring & Prototyping',
  components: 'Components',
  'user-input': 'User Input',
  // Physical
  'enclosures-deployment': 'Enclosures & Deployment',
  infrastructure: 'Infrastructure',
  // Garden
  irrigation: 'Irrigation',
  'soil-amendments': 'Soil & Amendments',
  'seeds-plants': 'Seeds & Plants',
  tools: 'Tools',
  // Reference
  'education-references': 'Education & References',
  other: 'Other',
}

export const STATUS_LABELS: Record<InventoryStatus, string> = {
  // In-possession
  owned: 'Owned',
  active: 'Active',
  experimental: 'Experimental',
  strategic: 'Strategic',
  // Acquisition
  ordered: 'Ordered',
  needed: 'Needed',
  wishlist: 'Wishlist',
  'maybe-later': 'Maybe Later',
  recommended: 'Recommended',
  // Inactive
  archived: 'Archived',
  retired: 'Retired',
}

/**
 * Statuses that represent physical possession of an item.
 * Use this wherever "effectively owned" logic is needed.
 */
export const IN_POSSESSION = new Set<InventoryStatus>([
  'owned',
  'active',
  'experimental',
  'strategic',
])

export const PHASE_LABELS: Record<InventoryPhase, string> = {
  learn: 'Learn',
  prototype: 'Prototype',
  deploy: 'Deploy',
  automate: 'Automate',
  optimize: 'Optimize',
}

export const PHASE_DESCRIPTIONS: Record<InventoryPhase, string> = {
  learn: 'Build electronics fundamentals with basic components and structured projects.',
  prototype: 'Wire sensors and microcontrollers. Get real data flowing on a breadboard.',
  deploy: 'Move from desk prototype to outdoor installation with weatherproofing and reliable power.',
  automate: 'Close the loop — control irrigation and devices based on sensor readings.',
  optimize: 'Track yield, calories, and efficiency. Refine the system season over season.',
}

// ---------------------------------------------------------------------------
// Inventory summary computation
// ---------------------------------------------------------------------------

export function computeInventorySummary(items: InventoryItem[]): InventorySummary {
  // "Owned" count includes all in-possession statuses
  const owned = items.filter((i) => IN_POSSESSION.has(i.status)).length
  const ordered = items.filter((i) => i.status === 'ordered').length
  const needed = items.filter((i) => i.status === 'needed').length
  const criticalMissing = items.filter(
    (i) => (i.status === 'needed' || i.status === 'ordered') && i.priority === 'critical',
  ).length

  return {
    total: items.length,
    owned,
    ordered,
    needed,
    criticalMissing,
    currentPhase: computeCurrentPhase(items),
    readinessScore: computeReadinessScore(items),
  }
}

/** Determine the most advanced phase the user is actively working in */
function computeCurrentPhase(items: InventoryItem[]): InventoryPhase {
  const phases: InventoryPhase[] = ['learn', 'prototype', 'deploy', 'automate', 'optimize']
  let current: InventoryPhase = 'learn'
  for (const phase of phases) {
    const phaseItems = items.filter((i) => i.phase === phase && i.priority === 'critical')
    const allOwned = phaseItems.length > 0 && phaseItems.every((i) => IN_POSSESSION.has(i.status))
    if (allOwned) {
      current = phase
    } else {
      break
    }
  }
  return current
}

/** 0–100 score: fraction of critical items owned or ordered, weighted 1.0/0.5 */
function computeReadinessScore(items: InventoryItem[]): number {
  const critical = items.filter((i) => i.priority === 'critical')
  if (critical.length === 0) return 0
  const score = critical.reduce((sum, item) => {
    if (IN_POSSESSION.has(item.status)) return sum + 1
    if (item.status === 'ordered') return sum + 0.6
    return sum
  }, 0)
  return Math.round((score / critical.length) * 100)
}

// ---------------------------------------------------------------------------
// Capability computation
// ---------------------------------------------------------------------------

export type ComputedCapability = CapabilityCard & {
  availability: CapabilityAvailability
  blockedBy: InventoryItem[]
  arrivingSoon: InventoryItem[]
}

export function computeCapabilities(items: InventoryItem[]): ComputedCapability[] {
  const itemMap = new Map(items.map((i) => [i.id, i]))

  return CAPABILITY_CARDS.map((cap) => {
    const required = cap.requiredItemIds.map((id) => itemMap.get(id)).filter(Boolean) as InventoryItem[]
    const blockedBy = required.filter(
      (i) => !IN_POSSESSION.has(i.status) && i.status !== 'ordered',
    )
    const arrivingSoon = required.filter((i) => i.status === 'ordered')
    const allOwned = required.every((i) => IN_POSSESSION.has(i.status))

    let availability: CapabilityAvailability
    if (allOwned) {
      availability = 'available'
    } else if (blockedBy.length === 0 && arrivingSoon.length > 0) {
      availability = 'arriving'
    } else {
      availability = 'blocked'
    }

    return { ...cap, availability, blockedBy, arrivingSoon }
  })
}

// ---------------------------------------------------------------------------
// Missing items grouped by phase
// ---------------------------------------------------------------------------

export type MissingGroup = {
  phase: InventoryPhase
  label: string
  description: string
  items: InventoryItem[]
}

export function computeMissingByPhase(items: InventoryItem[]): MissingGroup[] {
  const phases: InventoryPhase[] = ['prototype', 'deploy', 'automate', 'optimize']
  const missingOrOrdered = items.filter(
    (i) => i.status === 'needed' || i.status === 'ordered' || i.status === 'wishlist',
  )

  return phases
    .map((phase) => ({
      phase,
      label: PHASE_LABELS[phase],
      description: PHASE_DESCRIPTIONS[phase],
      items: missingOrOrdered.filter((i) => i.phase === phase),
    }))
    .filter((g) => g.items.length > 0)
}

// ---------------------------------------------------------------------------
// Ambition mode readiness scores
// ---------------------------------------------------------------------------

export function computeAmbitionModes(items: InventoryItem[]): AmbitionModeDef[] {
  const ownedOrOrdered = new Set(
    items
      .filter((i) => IN_POSSESSION.has(i.status) || i.status === 'ordered')
      .map((i) => i.category),
  )

  return AMBITION_MODES.map((mode) => {
    const relevant = mode.priorityCategories
    if (relevant.length === 0) return { ...mode, readinessScore: 0 }
    const covered = relevant.filter((c) => ownedOrOrdered.has(c)).length
    const readinessScore = Math.round((covered / relevant.length) * 100)
    return { ...mode, readinessScore }
  })
}

// ---------------------------------------------------------------------------
// Cost helpers
// ---------------------------------------------------------------------------

/** Returns the per-item total cost and effective confidence level. */
export function getItemTotalCost(item: InventoryItem): { value: number | null; confidence: CostConfidence } {
  const unitCost = item.actualCost ?? item.estimatedCost
  if (unitCost === undefined) return { value: null, confidence: 'unknown' }
  const confidence: CostConfidence =
    item.actualCost !== undefined ? 'exact' : item.costConfidence ?? 'estimated'
  return { value: item.quantity * unitCost, confidence }
}

/** Format a number as a currency string (e.g. "$45 CAD"). */
export function formatCurrency(amount: number, currency = 'CAD'): string {
  const str = amount % 1 === 0 ? amount.toFixed(0) : amount.toFixed(2)
  return `$${str} ${currency}`
}

export function computeFinancialSummary(items: InventoryItem[]): InventoryFinancialSummary {
  const currency = 'CAD'

  const lineTotal = (item: InventoryItem) => getItemTotalCost(item).value ?? 0

  const ownedValue = items
    .filter((i) => IN_POSSESSION.has(i.status))
    .reduce((sum, i) => sum + lineTotal(i), 0)

  const actualSpendTracked = items
    .filter((i) => i.actualCost !== undefined)
    .reduce((sum, i) => sum + (i.actualCost ?? 0) * i.quantity, 0)

  const orderedTotal = items
    .filter((i) => i.status === 'ordered')
    .reduce((sum, i) => sum + lineTotal(i), 0)

  const neededEstimated = items
    .filter((i) => i.status === 'needed')
    .reduce((sum, i) => sum + lineTotal(i), 0)

  const criticalMissingEstimated = items
    .filter((i) => i.status === 'needed' && i.priority === 'critical')
    .reduce((sum, i) => sum + lineTotal(i), 0)

  // Find the next phase with incomplete critical items and sum its cost
  const phases: InventoryPhase[] = ['prototype', 'deploy', 'automate', 'optimize']
  let nextPhaseCost = 0
  let nextPhaseLabel = ''
  for (const phase of phases) {
    const phaseNeeded = items.filter(
      (i) => i.phase === phase && (i.status === 'needed' || i.status === 'ordered'),
    )
    if (phaseNeeded.length > 0) {
      nextPhaseCost = phaseNeeded.reduce((sum, i) => sum + lineTotal(i), 0)
      nextPhaseLabel = PHASE_LABELS[phase]
      break
    }
  }

  return {
    currency,
    ownedValue,
    actualSpendTracked,
    orderedTotal,
    neededEstimated,
    criticalMissingEstimated,
    nextPhaseCost,
    nextPhaseLabel,
  }
}

export function computePhaseBudgets(items: InventoryItem[]): PhaseBudget[] {
  const phases: InventoryPhase[] = ['prototype', 'deploy', 'automate', 'optimize']

  return phases
    .map((phase) => {
      const phaseItems = items.filter((i) => i.phase === phase)
      const ownedItems = phaseItems.filter((i) => IN_POSSESSION.has(i.status))
      const neededOrOrderedItems = phaseItems.filter(
        (i) => i.status === 'needed' || i.status === 'ordered' || i.status === 'wishlist',
      )

      const lineTotal = (i: InventoryItem) => getItemTotalCost(i).value ?? 0
      const ownedValue = ownedItems.reduce((sum, i) => sum + lineTotal(i), 0)
      const neededCostLow = neededOrOrderedItems.reduce((sum, i) => sum + lineTotal(i), 0)
      const neededCostHigh = neededOrOrderedItems.reduce((sum, i) => {
        const high = i.replacementCost != null ? i.quantity * i.replacementCost : lineTotal(i)
        return sum + high
      }, 0)

      return { phase, label: PHASE_LABELS[phase], ownedItems, ownedValue, neededOrOrderedItems, neededCostLow, neededCostHigh }
    })
    .filter((b) => b.ownedItems.length > 0 || b.neededOrOrderedItems.length > 0)
}

// ---------------------------------------------------------------------------
// Sort helpers
// ---------------------------------------------------------------------------

export type InventorySortBy = 'default' | 'cost-asc' | 'cost-desc'

export function sortItems(items: InventoryItem[], sortBy: InventorySortBy): InventoryItem[] {
  if (sortBy === 'default') return items
  return [...items].sort((a, b) => {
    const aVal = getItemTotalCost(a).value
    const bVal = getItemTotalCost(b).value
    // Push unknown costs to the end regardless of sort direction
    if (aVal === null && bVal === null) return 0
    if (aVal === null) return 1
    if (bVal === null) return -1
    return sortBy === 'cost-asc' ? aVal - bVal : bVal - aVal
  })
}

// ---------------------------------------------------------------------------
// Filter helpers
// ---------------------------------------------------------------------------

export function filterItems(
  items: InventoryItem[],
  {
    search,
    status,
    phase,
    category,
  }: {
    search: string
    status: InventoryStatus | 'all'
    phase: InventoryPhase | 'all'
    category: InventoryCategory | 'all'
  },
): InventoryItem[] {
  const q = search.toLowerCase()
  return items.filter((item) => {
    if (status !== 'all' && item.status !== status) return false
    if (phase !== 'all' && item.phase !== phase) return false
    if (category !== 'all' && item.category !== category) return false
    if (q && !item.name.toLowerCase().includes(q) && !item.notes?.toLowerCase().includes(q)) {
      return false
    }
    return true
  })
}

// ---------------------------------------------------------------------------
// Persistence helpers for ambition mode preference
// ---------------------------------------------------------------------------

const AMBITION_MODE_KEY = 'elk_inventory_mode_v1'

export function loadAmbitionMode(): AmbitionMode {
  const raw = localStorage.getItem(AMBITION_MODE_KEY)
  const valid: AmbitionMode[] = [
    'simple-garden',
    'serious-food-garden',
    'high-yield-garden',
    'automation-lab',
    'resilience-garden',
  ]
  return valid.includes(raw as AmbitionMode) ? (raw as AmbitionMode) : 'serious-food-garden'
}

export function saveAmbitionMode(mode: AmbitionMode): void {
  localStorage.setItem(AMBITION_MODE_KEY, mode)
}
