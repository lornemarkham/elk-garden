# ELK Garden — Today’s build plan

Short plan for **useful progress today**, not a long architecture exercise. **Do not wire auth or database today.**

---

## 1. Source of truth (now)

**Local-first:** profile + plan tab state live in the browser (**`localStorage`** and related keys). Treat this as the **only** source of truth for “my garden” until a deliberate migration is written down.

---

## 2. Backend / API (today)

Use the **Express** API **only** for **AI garden plan generation** (and whatever tiny helpers already call it). **Do not** pretend the server is the live garden store.

---

## 3. Auth / database

**Out of scope today:** login, sessions, **Prisma** as runtime spine, or moving the main UX to the DB.

---

## 4. Today’s goal

Make the app **useful for the real garden** you are tending: correct **beds / rows / crops**, **clear tasks** for **this week / today**, minimal friction.

---

## 5. First useful slice

Represent the **real garden** clearly:

- **Areas / beds** and **rows** (and crops per row or area) match how you think in the yard.
- **Daily / weekly tasks** are **practical** (actionable lines, not vague fluff) and list state stays in sync with the plan.

Ship **one** vertical improvement: e.g. **dashboard shows the same structure as Plan** *or* **task list pulls from the same persisted state** Plan uses—not two competing summaries.

---

## 6. Risks

- **Duplicate models** — e.g. legacy flat “crops” vs row-level crops; **avoid** adding a third shape. Map or migrate in small steps.
- **Big rewrites** — **forbidden** for today. Extend what exists.

---

## 7. Rule

**Small, visible improvements** per slice. After each slice: **`npm run build`** (frontend) and fix failures before the next slice.

---

## First coding slice (suggestion)

**Pick one:** (A) Trace **`PlanPage`** + **`DashboardPage`** + **`gardenStateStorage` / `GardenStore`** and fix **one** inconsistency so counts or bed names match, **or** (B) ensure **weekly / next-step tasks** are generated or listed from the **same** persisted plan state the Plan tab edits. **One PR-sized change**, then **build**.
