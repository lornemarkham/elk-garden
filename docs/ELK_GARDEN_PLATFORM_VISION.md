# ELK Garden — Platform Vision

**Last updated:** May 2026  
**Status:** Active — governing document for product direction

---

## What This Document Is

This is the product direction document for ELK Garden as it evolves from a garden planning app into a practical garden infrastructure and automation operating system. It is not a marketing pitch. It defines what we are building, who we are building it for, and the principles that govern every decision.

---

## Vision

ELK Garden is evolving into a **practical garden infrastructure and automation operating system**.

Not a watering reminder. Not a hobby journal. Not a simple garden tracker.

A system that helps a person move from "I have seeds and a vague idea" to "I understand what I own, what I can build, what my garden is doing, and what it will cost to go further."

That same system should serve:

- A first-time grower who wants to know what to plant and when
- A serious food grower tracking soil moisture, planning beds, and logging harvests
- A home automation enthusiast wiring sensors, relays, and microcontrollers
- A family focused on resilience — producing a meaningful share of their own food
- A learner working through electronics and automation in a real-world context
- A future homestead operator managing multiple growing systems

The thread running through all of them: **reduce overwhelm, increase capability, build operational confidence**.

---

## Core Product Pillars

### Inventory & Capability

Track what you own, what is on order, what is missing, and what your current gear actually enables you to build. The inventory is not a parts database — it is operational intelligence.

- **User value:** Know your readiness without having to think about it. Avoid buying things twice. Understand what you need before you spend.
- **Ecosystem connection:** Inventory drives capability cards, readiness scores, phase progression, and budget tracking. Everything else in the system can query it.

---

### Garden Planning

Plan beds, zones, crops, and seasonal timing. Know what to do this week, understand what is in the ground, and track execution.

- **User value:** Move planning from a mental burden to a clear, executable list.
- **Ecosystem connection:** Planning drives tasks, zone configurations, and eventually connects to sensor data to confirm whether the plan is working.

---

### Automation

Support the gradual move from manual observation to automated action — watering schedules, sensor thresholds, relay control, and safety cutoffs.

- **User value:** Reliable gardens need reliable systems. Automation removes the anxiety of forgetting.
- **Ecosystem connection:** Automation depends on sensors for inputs, inventory for hardware readiness, and deployment checklists for safe installation.

---

### Sensor & Telemetry

Ingest data from soil moisture sensors, temperature probes, humidity sensors, water tank monitors, and other real-world inputs. Display trends, surface anomalies, and drive recommendations.

- **User value:** Ground decisions in real readings, not intuition. Know what the garden is doing even when you are not there.
- **Ecosystem connection:** Sensors feed the dashboard, validate plans, trigger automation, and contribute to yield and analytics.

---

### Yield & Food Production

Track harvests by crop and zone. Estimate calories produced. Understand what the garden is actually outputting and whether it justifies the investment.

- **User value:** Turn garden effort into a measurable outcome. Make informed decisions about what to grow next season.
- **Ecosystem connection:** Yield data informs planning, justifies infrastructure investment, and connects to the broader food independence mission.

---

### Budget & Cost Tracking

Record actual and estimated costs for hardware, supplies, and consumables. Understand the real cost of each build phase. Avoid duplicate purchases. Know what it will take to reach the next level.

- **User value:** Automation and sensors are not free. Knowing real costs removes the sticker shock and makes planning honest.
- **Ecosystem connection:** Cost data lives on inventory items and aggregates into budget summaries, phase readiness budgets, and total project cost.

---

### Readiness & Progression

Assess where you are in the build process across five defined phases: Learn, Prototype, Deploy, Automate, Optimize. Show what is complete, what is blocking, and what the path forward looks like.

- **User value:** Remove ambiguity about where you stand and what to do next.
- **Ecosystem connection:** Readiness is computed from inventory status, hardware phase assignments, and build milestones. It drives the dashboard summary and phase budgets.

---

### Education & Learning

Map hardware ownership to learning steps. Surface structured paths from "first LED blink" to "automated irrigation." Explain the "why" behind every recommendation.

- **User value:** Turn hardware into knowledge, not just components. Build real skills, not just a working prototype that nobody understands.
- **Ecosystem connection:** Learning steps reference specific inventory items and build phases. Progress through the learning path unlocks higher-phase capabilities.

---

### AI Guidance

Surface context-aware recommendations, missing item suggestions, setup guidance, and readiness insights based on the user's actual inventory and garden state — not generic advice.

- **User value:** The right suggestion at the right time, grounded in what you actually own and what you are actually trying to build.
- **Ecosystem connection:** AI works across inventory, planning, sensors, and yield data. It does not replace judgment — it reduces the research burden.

---

### Deployment & Infrastructure

Support the practical steps of moving from a desk prototype to a reliable outdoor installation: weatherproofing, cable management, enclosure selection, power planning, and safety.

- **User value:** Most sensor and automation projects fail at the transition from indoors to outdoors. Guided deployment reduces that failure rate.
- **Ecosystem connection:** Deployment checklists reference specific inventory items. Completion of deployment phase unlocks automation capabilities.

---

### Roadmaps & Goal Planning

Let users define the garden system they are building toward — from a simple food garden to a full automation lab — and surface the specific steps, items, and decisions that close the gap.

- **User value:** A goal without a path is just aspiration. Roadmaps make the distance visible and actionable.
- **Ecosystem connection:** Roadmaps combine inventory, readiness scores, build phases, and ambition mode to generate a personalised progression view.

---

## Product Philosophy

### Practical over flashy

A calm, functional interface that helps users get things done is worth more than an impressive demo. Every feature should answer the question: "Does this help someone grow more food, manage their hardware, or build their system?"

### Progression over perfection

Users do not need to do everything right at once. The product supports gradual improvement at whatever pace fits real life. A beginner with three inventory items and a breadboard is a valid user.

### Confidence building

The system should increase the user's confidence in their own judgment, not create dependency on the app. Good guidance teaches; it does not just give answers.

### Operational clarity

At any point, the user should be able to answer: What do I have? What can I build? What is my garden doing? What do I need next? What will it cost?

### Optional complexity

Simple users should not see complexity they cannot use. Advanced features surface progressively as the user grows into them. Nothing is hidden permanently — it is revealed when it is useful.

### Approachable onboarding

The first five minutes of ELK Garden should feel like useful progress, not a setup burden. A user with no hardware and no plan should still get value immediately.

### Systems thinking

A garden is a system: soil, water, light, hardware, labour, and timing all interact. The product should reflect that interconnection and help users reason about it — not present it as isolated feature modules.

### Dashboard-first UX

The default view should always answer "what matters right now?" Everything else is accessible but not in the way.

### Educational support

Short, well-placed context throughout the app reduces the learning burden. Users should understand what they are doing and why, not just follow instructions they do not understand.

---

## Readiness Philosophy

ELK Garden uses five progression phases to give users a shared vocabulary for where they are and what comes next.

### Phase 1: Learn

Basic electronics, breadboard circuits, sensor reads, and simple output — LEDs, displays, buttons. The goal is confident handling of components before anything goes into the garden.

### Phase 2: Prototype

Sensors wired to microcontrollers, data flowing to a dashboard, WiFi transmission, and proof-of-concept monitoring. The prototype phase validates that the system works before committing to outdoor installation.

### Phase 3: Deploy

Moving from the desk to the outdoors. Weatherproof enclosures, cable glands, UV-resistant wiring, reliable power, and physical mounting. This is where most projects stall — the product should reduce that failure rate.

### Phase 4: Automate

Closing the loop: sensor readings trigger relay actions. Irrigation turns on when soil is dry, pumps stop on a timer cutoff, valves respond to thresholds. Safety planning is part of this phase, not optional.

### Phase 5: Optimize

Season-over-season improvement: yield tracking, calorie analysis, sensor calibration, zone refinement, planting density modelling, and multi-zone intelligence. This phase rewards persistence.

**The philosophy:** Every phase is a real milestone, not a gate. Users should feel like progress is happening at every stage, even if they never reach Phase 5.

---

## Inventory Philosophy

The inventory module is not a spreadsheet of parts. It is the foundation of operational intelligence in ELK Garden.

**Readiness comes from inventory.** What phase you are in, what you can build, and what you are missing — all of it is derived from what you own, what is ordered, and what is still needed.

**Blockers are visible.** The system does not wait for you to figure out what you are missing. It surfaces blockers by phase, by priority, and by cost.

**Capability is connected to hardware.** "What can I build right now?" should be answerable in seconds. The system computes this from owned and ordered items without manual configuration.

**Cost is honest.** Users should know what they have spent, what is committed, and what the next phase will cost — before they spend it. Duplicate purchases are preventable when the data is in one place.

**Goals drive what matters.** The same hardware means different things depending on whether you are building a basic sensor prototype or a full outdoor automation system. The ambition mode connects inventory to goal-specific readiness.

---

## Roadmap Direction

The following are future product directions — not immediate features.

**Personalised progression plans** — Generate a specific sequence of builds, purchases, and learning steps based on a user's current inventory, ambition mode, and declared goals.

**Generated project plans** — Given an inventory and a goal (e.g. "I want to automate irrigation for one zone"), produce a concrete bill of materials, wiring overview, and step-by-step build plan.

**Milestone systems** — Mark specific accomplishments (first sensor reading, first outdoor deployment, first automated watering event) in a way that reflects real progress and motivates continuation.

**Inventory-driven guidance** — As items are added to inventory, the system automatically updates readiness, surfaces new capabilities, and adjusts recommendations — without manual configuration.

**Readiness-based learning** — Surface the right educational content at the right phase. A user who just completed their first ESP32 circuit should see content about WiFi transmission, not about solar power sizing.

---

## AI Direction

AI in ELK Garden should be **useful, specific, and grounded in real context** — not generic advice dispensed by a chatbot.

Realistic uses:

- **Inventory recommendations** — Given what you own and what phase you are in, suggest the three most impactful next purchases.
- **Setup guidance** — Given a specific hardware combination, provide a wiring approach and safety checklist.
- **Duplicate detection** — Flag when a new item being added is likely already in inventory under a different name.
- **Photo recognition** — Identify a component from a photo and add it to inventory with correct categorisation.
- **Readiness suggestions** — Identify the single most impactful change that would advance the user's readiness score.
- **Yield insights** — Given historical harvest data, surface patterns about which zones, crops, and practices are most productive.
- **Deployment support** — Check a deployment plan against common failure modes and flag risks.

AI does not run the garden. It reduces research burden and surfaces context the user would otherwise have to assemble manually.

---

## Monetization Philosophy

ELK Garden uses a capability-based subscription model, where different plan tiers unlock operational intelligence and advanced features — not basic usability.

**Free users receive genuine value.** The core experience — inventory tracking, cost visibility, signal simulation, the dashboard, basic planning — should feel complete on the free plan. Free is not a hobbled demo; it is a real product for users with simpler needs.

**Premium unlocks power-user capabilities.** Phase readiness budgets, AI recommendations, deployment planning, export/import, multi-garden support, yield forecasting, and team collaboration are Grower and Operator features. These are tools for users who have outgrown basic tracking.

**Monetization should feel earned.** Users should hit the limits of the free plan because they are doing more, not because the product is artificially restricted. When they upgrade, it should feel like a natural next step.

**No dark patterns.** No paywalls on features that should be basic. No artificial friction. No feature removal from the free tier once users have relied on it.

---

## UX Principles

**Calm UI** — The app should feel like a garden, not a control room. Muted backgrounds, readable typography, consistent spacing, and purposeful colour use. No unnecessary animation or visual noise.

**Confidence building** — Every screen should leave the user feeling more capable, not more anxious. Good defaults, clear language, and honest feedback.

**Low overwhelm** — Show summaries first. Reveal complexity on demand. Never front-load every possible option.

**Progressive disclosure** — Simple users see simple interfaces. Power users who explore find depth. Nothing is hidden permanently — it is waiting for the right moment.

**Approachable complexity** — Advanced features like deployment checklists and phase budgeting should not feel intimidating. Label, explain, and guide.

**Operational dashboards** — The primary screens should always answer "what matters right now?" — not display every piece of data available.

**Practical guidance** — Every recommendation should explain why it matters and what to do about it. No cryptic scores without context.

---

## Long-Term Expansion

These are directions the platform could grow into, not commitments.

- **Irrigation systems** — Full zone-by-zone irrigation automation with sensor feedback and safety systems
- **Greenhouse automation** — Temperature, humidity, and light control for enclosed growing environments
- **Rainwater systems** — Tank level monitoring, pump control, and rainfall data integration
- **Home Assistant integration** — Bidirectional data flow with the Home Assistant ecosystem
- **Solar and battery systems** — Power monitoring and planning for off-grid sensor nodes
- **Resilience planning** — Multi-season food production planning, storage estimation, and calorie forecasting
- **Food storage tracking** — Connect harvest data to preservation and pantry management
- **Camera systems** — Wildlife detection, plant health monitoring, and growth documentation
- **Multi-property support** — Manage gardens across different locations from a single account

Each of these is an extension of the same foundation: understand what you have, understand what it can do, and use that knowledge to grow more food with less effort.

---

## Closing Principle

ELK Garden should help users move from **confused and overwhelmed** to **capable, informed, and operational**.

Not through magic or complexity. Through clear data, honest guidance, gradual progression, and a system that grows with the user's ability and ambition.

The product succeeds when a user can say: "I know exactly where I am, what I have, what my garden is doing, and what I need to do next." That is the target — on every screen, at every phase, for every user.
