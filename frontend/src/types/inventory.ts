// ---------------------------------------------------------------------------
// Inventory & Capability Planning — data model
// ---------------------------------------------------------------------------

export type InventoryCategory =
  // Core compute
  | 'boards-controllers'
  | 'edge-compute'           // Raspberry Pi, SBCs, compute modules
  // Sensing
  | 'sensors'
  // Vision
  | 'cameras'
  | 'vision-monitoring'      // AI cameras, IP cameras, timelapse rigs
  // Actuation
  | 'automation'
  | 'robotics'               // Robot kits, chassis, integrated platforms
  | 'motion-control'         // Motors, servos, actuators
  // Power
  | 'power'
  // Connectivity
  | 'networking'
  | 'smart-home'             // Zigbee/Z-Wave hubs, smart home sensors
  // Wiring & Prototyping
  | 'wiring-prototyping'
  | 'components'             // Passive components: caps, resistors, diodes
  | 'user-input'             // Keypads, joysticks, buttons
  // Physical
  | 'enclosures-deployment'
  | 'infrastructure'         // Workstations, monitors, benches
  // Garden
  | 'irrigation'
  | 'soil-amendments'
  | 'seeds-plants'
  | 'tools'
  // Reference
  | 'education-references'
  | 'other'

export type InventoryStatus =
  // In-possession states
  | 'owned'          // acquired, available for use
  | 'active'         // currently deployed in a running project
  | 'experimental'   // being evaluated or tested
  | 'strategic'      // kept specifically for a planned future use
  // Acquisition states
  | 'ordered'        // purchased, in transit
  | 'needed'         // required but not yet purchased
  | 'wishlist'       // want to buy — not yet committed
  | 'maybe-later'    // noted for potential future consideration
  | 'recommended'    // system-suggested item, not yet purchased
  // Inactive
  | 'archived'       // retired from active use
  | 'retired'        // legacy alias — prefer 'archived'

export type InventoryPhase = 'learn' | 'prototype' | 'deploy' | 'automate' | 'optimize'

export type InventoryPriority = 'critical' | 'useful' | 'optional' | 'later'

export type AmbitionMode =
  | 'simple-garden'
  | 'serious-food-garden'
  | 'high-yield-garden'
  | 'automation-lab'
  | 'resilience-garden'

// ---------------------------------------------------------------------------
// Cost tracking
// ---------------------------------------------------------------------------

export type Currency = 'CAD' | 'USD' | 'EUR'

/** How confident we are in the recorded cost */
export type CostConfidence = 'exact' | 'estimated' | 'unknown'

export interface InventoryItem {
  id: string
  name: string
  category: InventoryCategory
  quantity: number
  status: InventoryStatus
  /** Which build phase this item primarily enables */
  phase: InventoryPhase
  priority: InventoryPriority
  location?: string
  notes?: string
  relatedGoals?: string[]
  imageUrl?: string
  imagePlaceholder?: string
  linkUrl?: string
  orderedDate?: string
  expectedArrival?: string
  ownedSince?: string
  // --- Cost tracking ---
  /** Per-unit estimated cost when exact receipt is unavailable */
  estimatedCost?: number
  /** Per-unit actual cost paid — preferred for new purchases */
  actualCost?: number
  /** Default: 'CAD' */
  currency?: Currency
  costConfidence?: CostConfidence
  purchaseSource?: string
  purchaseUrl?: string
  orderNumber?: string
  invoiceUrl?: string
  purchaseDate?: string
  /** Per-unit replacement cost — for insurance or future planning */
  replacementCost?: number
  // --- Capability mapping ---
  /**
   * Short capability tags describing what this item enables.
   * Used for "what can I build?" queries and AI-assisted recommendations.
   * Examples: ['soil-sensing', 'wireless-comms', 'relay-control', 'edge-compute']
   */
  capabilityTags?: string[]
  /**
   * IDs of other InventoryItems this item depends on to be useful.
   * Future: drives "missing component" analysis and dependency graphs.
   */
  dependencyIds?: string[]
}

// ---------------------------------------------------------------------------
// Capability cards — what can be built from current inventory
// ---------------------------------------------------------------------------

export type CapabilityAvailability = 'available' | 'arriving' | 'blocked'

export interface CapabilityCard {
  id: string
  title: string
  description: string
  phase: InventoryPhase
  requiredItemIds: string[]
  /** Computed from inventory — not stored */
  availability?: CapabilityAvailability
  /** Item IDs that are blocking this capability */
  blockedByIds?: string[]
}

// ---------------------------------------------------------------------------
// Project roadmap cards
// ---------------------------------------------------------------------------

export interface ProjectCard {
  id: string
  title: string
  description: string
  phase: InventoryPhase
  requiredItemIds: string[]
  estimatedDifficulty: 'beginner' | 'intermediate' | 'advanced'
  outcome: string
}

// ---------------------------------------------------------------------------
// Learning path
// ---------------------------------------------------------------------------

export interface LearningStep {
  id: string
  stepNumber: number
  title: string
  description: string
  phase: InventoryPhase
  relatedItemIds: string[]
  outcome: string
}

// ---------------------------------------------------------------------------
// Ambition mode metadata
// ---------------------------------------------------------------------------

export interface AmbitionModeDef {
  id: AmbitionMode
  label: string
  tagline: string
  description: string
  priorityCategories: InventoryCategory[]
  /** 0–100 computed from inventory — not stored */
  readinessScore?: number
}

// ---------------------------------------------------------------------------
// Computed readiness summary
// ---------------------------------------------------------------------------

export interface InventorySummary {
  total: number
  owned: number
  ordered: number
  needed: number
  criticalMissing: number
  currentPhase: InventoryPhase
  readinessScore: number
}

// ---------------------------------------------------------------------------
// Financial summaries
// ---------------------------------------------------------------------------

export interface InventoryFinancialSummary {
  currency: string
  /** Total estimated value of all owned items */
  ownedValue: number
  /** Sum of items where actualCost is recorded (exact receipts) */
  actualSpendTracked: number
  /** Total estimated cost of ordered-but-not-yet-received items */
  orderedTotal: number
  /** Total estimated cost of all needed items */
  neededEstimated: number
  /** Estimated cost of needed items marked critical */
  criticalMissingEstimated: number
  /** Estimated cost to complete the next incomplete phase */
  nextPhaseCost: number
  nextPhaseLabel: string
}

/** Per-phase cost breakdown for readiness budgeting */
export interface PhaseBudget {
  phase: InventoryPhase
  label: string
  ownedItems: InventoryItem[]
  /** Owned value total (qty × unit cost) */
  ownedValue: number
  /** Ordered + needed items for this phase */
  neededOrOrderedItems: InventoryItem[]
  /** Low cost estimate to complete (using estimatedCost) */
  neededCostLow: number
  /** High cost estimate (using replacementCost where available) */
  neededCostHigh: number
}
