// ---------------------------------------------------------------------------
// ELK Garden — Capability & Entitlement System
//
// Architecture contract:
//   - Never check `plan === 'pro'` anywhere in the UI.
//   - Always derive behaviour from a capability boolean or limit.
//   - Adding a new plan tier = editing plans.ts only.
//   - Adding a new feature = add the cap here + in each PlanDef + one FeatureGate.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Per-domain capability groups
// ---------------------------------------------------------------------------

export interface InventoryCapabilities {
  enabled: boolean
  /** Max items tracked across the inventory catalog */
  maxItems: number
  /** Cost tracking fields and budget summary cards */
  costTracking: boolean
  /** Per-phase cost breakdown and readiness budgeting */
  advancedBudgeting: boolean
  /** AI-driven restock, purchase, and missing-item suggestions */
  aiRecommendations: boolean
  /** Identify items from photos using AI */
  photoRecognition: boolean
  /** Export inventory to CSV/JSON; import from file */
  exportImport: boolean
  /** Warn before adding a likely-duplicate item */
  duplicateDetection: boolean
}

export interface AutomationCapabilities {
  enabled: boolean
  /** Max sensor nodes tracked across all gardens */
  maxSensors: number
  /** Guided deployment workflow from prototype to outdoor install */
  deploymentPlanning: boolean
  /** Step-by-step weatherproofing and installation checklists */
  deploymentChecklists: boolean
  /** Ingest data from real sensor hardware into the dashboard */
  hardwareIntegrations: boolean
}

export interface AnalyticsCapabilities {
  /** Days of activity log and dashboard history retained */
  historyDays: number
  /** Predict future harvest yield based on sensor trends */
  yieldForecasting: boolean
  /** Multi-metric overlaid charts and season comparisons */
  advancedCharts: boolean
}

export interface MultiGardenCapabilities {
  enabled: boolean
  maxGardens: number
}

export interface CollaborationCapabilities {
  enabled: boolean
  /** Family members or team co-managers */
  maxMembers: number
}

export interface CloudCapabilities {
  /** Sync state across devices in real time */
  sync: boolean
  /** Scheduled cloud backups */
  backup: boolean
}

export interface SignalCapabilities {
  /** Max entries kept in the Garden Activity log */
  maxHistory: number
  /** Export signal history to CSV */
  exportSignals: boolean
}

// ---------------------------------------------------------------------------
// Root capability object — the single source of truth for all gates
// ---------------------------------------------------------------------------

export interface Capabilities {
  inventory: InventoryCapabilities
  automation: AutomationCapabilities
  analytics: AnalyticsCapabilities
  multiGarden: MultiGardenCapabilities
  collaboration: CollaborationCapabilities
  cloud: CloudCapabilities
  signals: SignalCapabilities
}

// ---------------------------------------------------------------------------
// Plan metadata
// ---------------------------------------------------------------------------

export type PlanId = 'free' | 'grower' | 'operator'

export interface PlanDef {
  id: PlanId
  name: string
  /** One-line sell */
  tagline: string
  /** Two-sentence description */
  description: string
  /** Optional badge shown on the plan card */
  badge?: string
  capabilities: Capabilities
}
