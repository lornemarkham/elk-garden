# ELK Garden — Current build plan

Purpose: we are restarting serious work on ELK Garden. This document is a **clear, honest** plan **before** heavy coding. It records **what is true today**, **what we are optimizing for next**, and **what we will not do yet**.

---

## 1. Current state

- **Frontend is usable and product-shaped** — React + TypeScript + Tailwind; primary routes and shell exist.
- **Setup, dashboard, plan (Plan tab at `/canvas`), and tasks exist** and are navigable from the main chrome (**SPA** = single-page application: one site that updates in place without full page reloads).
- **Primary UX today uses mock garden data + `localStorage`** — the **API** (application programming interface: how the browser talks to the server) backs **AI plan generation** and some task generation, but the **day-to-day “my garden” object the UI trusts** is **not** the **ORM** (object-relational mapping: code that maps database tables to objects) layer end-to-end yet.
- **Backend exists** — **Express** (Node.js web server framework), **OpenAI**-backed garden plan build, deterministic task generation, **Prisma** schema and SQLite capability.
- **Auth and database are not yet the runtime source of truth** — there is no login/session driving which garden loads; **Prisma** models are real but **not** the spine every screen reads/writes through today.

---

## 2. Product north star

ELK Garden is a **high-yield garden operating system** that helps people **grow more food with less stress** through:

- **Planning** — beds, rows, crops, timing.
- **Daily guidance** — what to do this week / today.
- **Seasonal memory** — what was planted, what happened, what comes next.
- **Recommendations** — practical next steps tied to their context (weather when we can, threats, goals).
- **Eventually** — sensors and **camera**-related intelligence (not the near-term build focus).

Software supports **real dirt, real weather, real mistakes** — calm, trustworthy, and actionable.

---

## 3. Source of truth decision

**For the next phase:**

| Layer | Role |
|--------|------|
| **Local-first frontend persistence** | **Working source of truth** for “my garden” — profile, plan tab state, areas/rows, saved **AI** (artificial intelligence: here, model-assisted plan JSON) output, task completion tied to that UX. |
| **Backend / API** | **AI plan generation** (`POST` request to build a plan), **task generation** helpers, and **future** database-backed persistence — **preparatory**, not fake-complete. |
| **Prisma / SQLite** | **Schema and tooling exist** — treat as **migration target**, not as “already wired for every screen.” |

**Rules:**

- **Do not pretend Prisma is fully wired** in product copy, tickets, or mental models.
- **Avoid parallel data concepts** unless we **explicitly map** them (e.g. “this `localStorage` field = that future DB column / model”).
- When adding a field or feature, ask: **does it live in the local-first model, or only on the server?** If both, document the mapping in the same PR or a short note.

---

## 4. Core concepts

Short definitions (may evolve; **ORM** types may differ until migration).

- **Garden** — The user’s whole growing context: location, goals, threats, list of **areas**, and the current **plan** snapshot they are working from. In code today: largely **mock** seed for dashboard + **persisted** plan state on the Plan tab.
- **Area / bed** — A named growing space with size, sun, notes, optional planting date, and **rows** (or legacy flat crops migrated into rows).
- **Row** — Within an area: a line of planting (crop, optional width, notes, “planted” flag, optional log text).
- **Crop / planting** — What is (or will be) growing — represented as row crop and/or area-level crop lists depending on screen; **avoid duplicate conflicting lists** without migration notes.
- **Task** — A concrete action (water, scout, thin, etc.), possibly tied to area/row; has completion state and timing hints where implemented.
- **Observation / log** — Short human notes (area or row “garden log”) — **not** the same as structured sensor readings later.
- **Plan** — The structured output of planning: user inputs + optional **AI** **JSON** (JavaScript Object Notation: text format for structured data) from `/api/plans/build`, plus UI-derived state (areas, weekly buckets, etc.).
- **Recommendation** — A suggested next step or insight tied to context (may come from plan text, heuristics, or future services — label honestly so we do not imply precision we do not have).

---

## 5. Major risk

The **biggest risk** is **two competing data models** without an explicit bridge:

1. **Frontend local garden state** — `localStorage` + mock **`Garden`** for shell/dashboard.  
2. **Backend Prisma schema** — `User`, `Garden`, `Area`, `Row`, `Task`, etc.

**Rule:** Every new feature must either:

- **Use the current local-first model** and stay consistent with existing keys/types, **or**  
- **Include a clear migration path** (even if the migration ships later): what moves first, what stays client-only, and how we avoid double-edit bugs.

**Forbidden:** silently inventing a third shape (e.g. duplicate “zones” vs “areas”) without a mapping doc.

---

## 6. Next 2-week goal

Make ELK Garden **solid and useful for one real garden** (the one you are actually growing):

- **Usable dashboard** — at-a-glance health: what matters this week.  
- **Clear garden plan** — inputs and outputs make sense; no dead ends.  
- **Beds / rows / crops** — understandable in the Plan tab; names and structure match how you think in the field.  
- **Daily / weekly tasks** — trustworthy list; completion feels reliable.  
- **Notes / observations** — quick capture on beds/rows where the UI already supports it.  
- **Weather-aware recommendations** — **if practical** with current mock/local weather stub; do **not** block core reliability on a perfect forecast.  
- **Simple import/export backup** — **if needed** so local-first data is not a single-device trap (**JSON** export/import is enough to start).

---

## 7. What not to build yet

- **Full auth** — no login, password reset, or **OAuth** (open standard for “sign in with Google,” etc.).  
- **Multi-user / family accounts** — one primary operator is enough for this phase.  
- **Sensor integrations** — hardware, hubs, protocols (**MQTT**, etc.).  
- **Camera AI** — model-on-device or cloud vision pipelines.  
- **Marketplace** — seeds, tools, affiliates as a product surface.  
- **Complex automation** — rules engines, **IFTTT**-style chains, etc.  
- **Full database migration** — moving everything to **Prisma**/SQLite in one jump.

(We **may** touch the DB for experiments or one vertical slice, but not as a “big bang” replace `localStorage`.)

---

## 8. First build slice

**Recommendation — first slice:**

Improve the **local-first garden model** and the **dashboard + Plan tab flow** so the app can represent **one real garden** clearly:

1. **Audit** persisted keys (`elk_garden_state`, profile key, related helpers) vs what **PlanPage** and **DashboardPage** actually read.  
2. **Tighten** naming and single-field ownership (**areas** vs legacy `crops` lists) with small migrations inside **`localStorage`** load/save if needed.  
3. **Dashboard** reflects the same beds/rows/tasks as Plan — no contradictory counts.  
4. **Optional:** stub **export/import** one **JSON** blob for backup (document format version in the file).

This slice **does not** require auth or full **Prisma** wiring; it **does** reduce the risk of two divergent mental models on the client.

---

## 9. Development rules

- **Small vertical slices** — shippable increments, one narrative per PR.  
- **No big rewrites** — extend and migrate gently.  
- **Keep UI simple and elderly-friendly** — large tap targets, plain language, **minimal jargon** on screen; **explain acronyms** in comments and docs when we use them (**API**, **SPA**, **ORM**, **JSON**, **AI**, **CRUD** = create/read/update/delete, etc.).  
- **Maintain one clear source of truth** — for this phase, **local-first**; server is assistive until migration is explicit.  
- **Run build after changes** — `npm run build` (frontend) and **`npm run build:backend`** / typecheck when touching shared or backend types; **`npm run lint`** for frontend where relevant.

---

## Quick reference — local commands

- **`npm run dev`** — frontend + backend (from repo root).  
- **`npm run dev:frontend`** / **`npm run dev:backend`** — split.  
- **`npm run build`** — frontend production build.

---

*Last created for restart planning; update this doc when source-of-truth or phase boundaries change.*
