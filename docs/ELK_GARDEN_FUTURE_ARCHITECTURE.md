# ELK Garden — Future Architecture

**Last updated:** May 2026  
**Status:** Active — governing document for technical direction

---

## What This Document Is

This document defines architectural direction and system design philosophy for ELK Garden as the platform scales. It is not a specification for immediate implementation. It describes the principles and boundaries that should guide every significant technical decision so the system can grow without requiring rewrites.

Read this alongside `ELK_GARDEN_PLATFORM_VISION.md`, which defines the product direction this architecture must support.

---

## Architecture Philosophy

ELK Garden is built on six architectural commitments:

**Modular systems with clean boundaries.** Each major domain — inventory, sensors, automation, planning, yield — is a distinct module with its own data model, view model, and UI slice. Modules communicate through well-defined interfaces, not direct coupling.

**Optional complexity.** Simple features should not carry the implementation cost of advanced ones. A user who only needs basic inventory should not experience performance overhead or UI noise from automation features they have never used.

**Scalable capability systems.** Features are controlled through a centralized entitlement architecture, not scattered conditionals. Adding a new plan tier or feature flag should require editing one file.

**Future extensibility without rewrites.** Core data models are designed to accommodate future fields, relationships, and integrations without requiring schema migrations that break the current app.

**Incremental delivery.** Ship working slices. A partial implementation that works is preferable to a complete architecture that is not yet usable. Every shipped slice should be production-quality within its scope.

**Operational clarity over technical elegance.** The system should be easy to reason about, debug, and extend. Clever abstractions that save 20 lines of code but require 30 minutes to understand are a net liability.

---

## Capability-Based Feature Architecture

### The Rule

ELK Garden must **never** contain hardcoded plan or role checks scattered through the application.

Patterns to avoid:

```ts
// ✗ Never do this
if (user.plan === 'pro') { ... }
if (isPremium) { ... }
if (user.role === 'operator') { ... }
```

### The Pattern

All feature access is derived from a single centralized `Capabilities` object, resolved from the active plan definition at the provider level.

```ts
// ✓ Always this
const caps = useCapabilities()

// Boolean capability check
<FeatureGate enabled={caps.inventory.advancedBudgeting} ...>

// Numeric limit check
<CapacityBar current={items.length} max={caps.inventory.maxItems} />

// Conditional rendering without gates
if (!caps.automation.hardwareIntegrations) return <UpgradePrompt ... />
```

### Why This Matters

**Subscriptions** — Changing what a plan includes requires editing `plans.ts` only. No UI changes. No conditional audits.

**Feature flags** — A beta feature can be enabled for specific users by creating a modified capability object. No new infrastructure required.

**Enterprise customisation** — Enterprise plans with custom limits are a single new entry in `plans.ts`.

**Beta testing** — Give specific users access to unreleased capabilities without touching the UI.

**Graceful degradation** — Locked features show a consistent, controlled experience regardless of which plan is active. The UI never crashes or shows broken states when a feature is unavailable.

**Future plans** — Adding a new tier between Grower and Operator is additive. Nothing breaks.

### Current Implementation

```
src/lib/capabilities/
  types.ts           — Capabilities, PlanDef, PlanId types
  plans.ts           — FREE_PLAN, GROWER_PLAN, OPERATOR_PLAN definitions
  CapabilityProvider.tsx — Context, hooks: useCapabilities, useCurrentPlan, usePlanControl

src/components/capability/
  FeatureGate.tsx    — Renders children or LockedFeature based on a boolean
  LockedFeature.tsx  — Graceful locked state with plan badge and upgrade CTA
  UpgradePrompt.tsx  — Inline upgrade banner for augmenting free content
  CapacityBar.tsx    — Usage/limit progress bar with colour-coded threshold states
```

### Extending the System

To add a new feature to the capability system:

1. Add the field to the relevant interface in `types.ts`
2. Set values in all three plan definitions in `plans.ts`
3. Use `FeatureGate` or a direct `caps.x.y` check in the UI
4. No other files need to change

---

## Core System Areas

Each area below is an architectural boundary. As the product grows, these should remain distinct modules with clean interfaces between them.

### Inventory

Owns: item data model, category and phase taxonomy, capability analysis, cost tracking, readiness computation, ordering status.

Does not own: sensor data, automation logic, user authentication, billing.

Consumes from other modules: capability limits (from entitlement system), goals and ambition mode (from planning module).

---

### Readiness Engine

Owns: phase progression logic, readiness score computation, critical item identification, capability card computation.

Does not own: raw inventory data (it queries it), UI presentation.

Future: personalised readiness scoring based on declared goals, weighted by ambition mode.

---

### Roadmap Engine *(future)*

Owns: personalised progression plans, generated project sequences, milestone tracking, build plan generation.

Does not own: inventory data (queries it), sensor data, automation logic.

Future: given inventory + ambition mode, generate a concrete ordered sequence of builds, purchases, and learning steps. Update automatically as inventory changes.

---

### Telemetry & Sensors

Owns: sensor node configuration, reading ingestion, trend computation, signal processing, anomaly detection.

Does not own: automation logic (it provides data to it), garden zone data (it annotates it).

Future: ingest from ESP32 nodes over HTTP, persist readings to local/cloud storage, compute moving averages, surface anomalies to the dashboard.

---

### Automation

Owns: rule definitions (if/then), relay configuration, schedule management, safety cutoffs, execution logs.

Does not own: sensor readings (it subscribes to them), hardware inventory (it references it).

Future: a rule might be "if soil moisture < 35% AND time > 6am THEN open irrigation valve for 10 minutes, with a 30-minute daily maximum cutoff."

---

### AI Guidance *(future)*

Owns: recommendation generation, inventory suggestions, duplicate detection logic, photo recognition, deployment risk analysis.

Does not own: raw data (it queries inventory, sensor readings, and yield data).

Constraint: AI guidance is a layer on top of existing data — it does not own the data it reasons about. All AI outputs should be inspectable, correctable, and optional.

---

### Budgeting & Cost

Owns: cost aggregation, phase budget computation, financial summary cards, currency formatting.

Does not own: raw item costs (stored on inventory items).

Future: budget forecasting, seasonal cost planning, ROI tracking per zone.

---

### Yield Tracking *(future)*

Owns: harvest log, yield-per-zone data, calorie computation, season-over-season comparison.

Does not own: zone configuration (queries it), sensor data (references it for correlation).

Future: connect harvest weight → calories → food independence metrics.

---

### Integrations *(future)*

Owns: external service adapters (weather APIs, Home Assistant, MQTT brokers, camera feeds).

Does not own: any core domain data — it transforms external data into the internal format consumed by other modules.

---

## Data Relationship Philosophy

The following relationships drive the intelligence in ELK Garden. All of them should be computable, not stored — derived from source data on demand.

```
InventoryItem
  → has phase           : InventoryPhase
  → has status          : owned | ordered | needed | maybe-later
  → has category        : InventoryCategory
  → has estimatedCost   : number | undefined
  → contributes to      : CapabilityCard (via requiredItemIds)
  → contributes to      : PhaseBudget (grouped by phase)
  → contributes to      : ReadinessScore (weighted by priority + status)

CapabilityCard
  → requires            : InventoryItem[]
  → has availability    : available | arriving | blocked
  → belongs to          : InventoryPhase

PhaseBudget
  → aggregates          : InventoryItem[] (by phase)
  → computes            : ownedValue, neededCostLow, neededCostHigh
  → drives              : "cost to complete phase" summary card

AmbitionMode
  → prioritises         : InventoryCategory[]
  → weights             : ReadinessScore computation
  → connects            : Goals → RequiredInventory

Capabilities (from active plan)
  → gates               : UI sections via FeatureGate
  → limits              : numeric values via CapacityBar
  → drives              : UpgradePrompt visibility
```

The key principle: **source data lives in inventory items and plan definitions; everything else is computed**. This means the system stays consistent without synchronisation logic.

---

## Inventory Architecture

### Current state

The inventory module supports: item CRUD (mock), category and phase taxonomy, status tracking, cost fields, financial summary computation, capability card analysis, phase readiness budgeting, ambition mode scoring, search and filter, and sort by cost.

### Future additions

**Photo intake** — A camera input that calls an AI endpoint to identify the item, return a structured `InventoryItem` payload, and prompt the user to confirm before adding. The AI output is a suggestion, not automatic.

**AI-assisted duplicate detection** — When adding a new item, check existing inventory for semantic matches (not just string equality). Flag probable duplicates with the existing item and its current status.

**Order tracking** — Track order numbers, purchase URLs, and expected arrival dates. Surface "items expected this week" on the dashboard. Transition items from `ordered` to `owned` on confirmation.

**Deployment readiness** — For items tagged for outdoor deployment, check that complementary items (enclosure, cable glands, weatherproof connectors) are also owned. Surface gaps before the user starts the build.

**Capability analysis** — Given current inventory, compute not just what can be built now but what becomes possible with one or two additional purchases ("3 more items to unlock automated irrigation").

---

## Roadmap Engine Direction

This is future architecture — not immediate work.

The roadmap engine generates personalised, inventory-aware progression plans from a combination of:

- Current inventory state (owned, ordered, needed)
- Declared ambition mode (simple garden → full automation lab)
- Completed milestones
- Available budget (optional)

### Core concepts

**Personalised progression** — Two users with different inventory and different goals get different recommended next steps. The system does not show a fixed tutorial — it shows what is relevant to where this user actually is.

**Generated project plans** — Given a goal like "deploy one outdoor soil moisture node", the system generates: bill of materials (checked against inventory), estimated cost (for missing items), a suggested build sequence, and safety notes.

**Readiness-aware recommendations** — The system knows which phase the user is in and surfaces only relevant next steps. A user completing Phase 2 should not see Phase 4 deployment guides.

**Inventory-aware milestones** — Milestones unlock automatically as inventory and build state changes. The system does not require manual check-ins for things it can verify from data.

**Educational sequencing** — Learning content is ordered by phase and prerequisite. A user who just acquired their first ESP32 sees WiFi transmission content next, not relay safety wiring.

---

## Sensor & Telemetry Direction

### Future architecture

ELK Garden's telemetry layer will eventually support:

**ESP32 sensor nodes** — Each node runs firmware that reads connected sensors and POSTs JSON payloads to the local Raspberry Pi server or a cloud endpoint on a configurable interval.

**Raspberry Pi local hub** — Runs a lightweight Node.js or Python server that receives sensor data, stores it locally, exposes a REST API to the ELK Garden frontend, and optionally syncs to cloud.

**Telemetry ingestion pipeline** — Validates incoming payloads, normalises units, associates readings with garden zones, and stores time-series data with appropriate retention policies.

**Environmental monitoring** — Soil moisture, soil temperature, air temperature, humidity, light levels, water tank depth, and eventually CO₂ and EC (electrical conductivity for hydro/soil health).

**Irrigation automation** — Sensor readings trigger relay actions via the automation rule engine. The telemetry layer provides the current reading; the automation layer decides what to do with it.

**Distributed nodes** — Multiple ESP32 nodes across different zones, each independently reporting to the hub. The system aggregates across zones for the dashboard view.

### Data contract

Sensor data entering the system should carry: `nodeId`, `zoneId`, `sensorType`, `value`, `unit`, `capturedAt` (ISO 8601), and an optional `confidence` field for sensors with known drift characteristics.

---

## Integration Philosophy

ELK Garden should be **local-first** by default, with integrations as optional layers.

**Home Assistant** — Bidirectional: ELK Garden can surface sensor readings into HA's entity model, and HA automations can trigger ELK Garden state changes. Integration is via HA's REST API or MQTT.

**Weather services** — Integrate a local weather API to supplement sensor readings with forecast data. Used to improve watering recommendations ("rain expected tomorrow — suppress irrigation").

**Camera systems** — Motion-triggered cameras for wildlife detection, plant health monitoring, and growth documentation. Camera data feeds the dashboard as events, not continuous streams.

**MQTT brokers** — Support MQTT as a message transport for sensor nodes that do not use HTTP. This enables interoperability with a broad range of embedded firmware.

**External APIs** — Structured adapters for each external service. No direct API calls in feature code. Each adapter handles authentication, rate limiting, error handling, and data mapping to the internal format.

**Local-first principle** — Core functionality should not require internet access. Cloud features (sync, backup, AI endpoints) degrade gracefully when offline rather than breaking the app.

---

## Subscription & Entitlement Direction

### Current implementation

A three-tier capability system (`free`, `grower`, `operator`) is implemented in `src/lib/capabilities/`. The system is:

- Fully typed — capabilities are a structured object, not a bag of string flags
- Centralized — all plan definitions live in `plans.ts`
- Component-level — `FeatureGate`, `LockedFeature`, `UpgradePrompt`, and `CapacityBar` handle all locked states
- Persistent — active plan is stored in localStorage, defaults to `operator` during development

### Future additions

**Billing integration** — When a payment processor (likely Stripe) is added, the active plan is resolved from the user's subscription record rather than localStorage. The capability system does not change — only the plan resolution changes.

**Server-side entitlement** — For production, plan resolution moves from the client to a server-side token or session. The frontend capability objects remain identical; they are populated from the server-resolved plan at auth time.

**Custom enterprise plans** — A fourth `PlanDef` can be created per customer with specific limits. No new UI code required.

**Granular feature flags** — Individual capabilities can be overridden per-user for beta testing or support purposes, without changing the base plan.

**Trial periods** — A trial plan is a `PlanDef` with Grower or Operator capabilities and an expiry date. The expiry is handled at the plan resolution layer, not in the UI.

---

## Technical Principles

**Avoid premature overengineering.** Build for the next three steps, not the next ten. A clean, simple implementation that works today is worth more than a sophisticated architecture that ships six months late.

**MVP-first development.** Ship working slices. Every feature should reach a usable, production-quality state before the next one starts. Partial features that are half-visible in the UI are worse than features that have not started.

**Strong TypeScript models.** Data shapes should be defined precisely, with no `any` types in domain code. Good types catch integration errors at compile time, not in production.

**Reusable feature slices.** Each feature module should be self-contained: its own types, mock data, view model, and UI components. Features should not reach into other features' internals.

**Computed over stored.** Derived values — readiness scores, capability availability, cost totals, phase budgets — should be computed from source data on demand. Storing computed values creates synchronisation problems.

**Maintainable systems.** Code should be readable by a developer returning to it six months later. Clear naming, small functions, and comments that explain intent (not implementation) are more valuable than brevity.

**Incremental architecture.** Do not design the full database schema before building the first feature. Let the data model evolve from real usage, then stabilise it before adding persistence.

**Operational clarity.** Logging, error handling, and observability are not afterthoughts. When something breaks, the system should make it easy to understand what happened.

---

## Final Principle

ELK Garden should scale from **simple garden tracking** to **garden infrastructure operating system** without requiring major architectural rewrites.

That means:

- New plan tiers added by editing one file
- New features added as clean slices without touching unrelated modules
- New integrations added as adapters without changing core domain logic
- New data fields added without breaking existing computed views
- New hardware protocols supported without rewriting the telemetry layer

The architecture succeeds when adding a new capability feels like assembling something from parts that already fit — not like hacking against a system that was never designed for it.
