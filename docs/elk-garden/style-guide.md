# ELK Garden — Style Guide

Practical conventions for UI work in this repo. **Tailwind-first**, **components for repetition**, **minimal custom CSS**.

---

## Product UI direction

- **Calm, clean, trustworthy, product-grade** — reads as intentional software, not a side project.
- **Beginner-friendly** — plain language, forgiving density, obvious hierarchy.
- **Commercially scalable** — patterns that survive more screens, brands, and features without a rewrite.
- **Avoid “homemade” inconsistency** — same role, same treatment; no one-off page chrome.

---

## Styling philosophy

1. **Tailwind utilities first** — layout, spacing, color, typography via classes in JSX.
2. **Shared React components** for repeated structures (cards, page intros, section headers, button groups).
3. **Custom CSS only when necessary** — animations, third-party overrides, or a single global token file if we later add one. Prefer not to grow ad-hoc `index.css` rules.
4. **No one-off page styling** — if a pattern appears on two primary flows, extract it.
5. **Consistency over novelty** — resist new visual ideas unless they clearly improve comprehension or trust.

---

## Core layout

| Rule | Direction |
|------|-----------|
| **Page shell** | One app shell (`AppShell`): main column width, horizontal padding, bottom nav. Do not reimplement width/padding on individual pages except rare full-bleed exceptions (document why). |
| **Page intro** | Primary tabs (Dashboard, Plan, Tasks) share the same **branding + title + supporting text** rhythm. Use shared building blocks; do not resize titles per page arbitrarily. |
| **Content width** | Align with shell `max-width` (currently ~720px readable column). Wider layouts need a product decision, not silent drift. |
| **Spacing rhythm** | Prefer Tailwind scale (`2`, `3`, `4`, `6`, `8`, `10`) consistently. Section gaps: typically `space-y-6`–`space-y-10` between major blocks. |
| **Bottom nav** | Reserve space: content uses bottom padding so last blocks are not hidden behind sticky nav. Safe-area aware; don’t stack extra mystery margin without reason. |

---

## Typography

Use a **fixed hierarchy**; extend via shared components or documented class bundles, not per-page `text-*` experiments.

| Role | Typical use | Notes |
|------|-------------|--------|
| **Page title** | One clear `h1` per view | Same scale family on all primary tabs (e.g. `text-2xl`–`text-3xl`, `font-semibold`, `tracking-tight`). |
| **Section title** | `h2` in sections | `text-xl`, `font-semibold`, `tracking-tight` (or equivalent single definition). |
| **Body** | Primary reading | `text-base`, comfortable `leading-relaxed`. |
| **Muted / supporting** | Hints, captions, meta | `text-sm`, `text-stone-500`–`text-stone-600` — one muted ladder, not five grays per screen. |

**Do not** randomize title sizes per route. If a screen needs emphasis, use layout, order, or a card — not a one-off larger heading.

---

## Components

- **Cards** — Shared `Card` (or successors): consistent padding, ring/border, radius. Inner spacing predictable (`p-4` / `sm:p-6` pattern agreed once, then reused).
- **Buttons** — Clear variants: primary (solid dark), secondary (outline / soft), destructive (when needed), link-style. Same height and tap targets for the same importance level.
- **Repeated patterns** — Promote to components: section header + subtitle, empty states, CTA bars, collapsible sections.
- **Semantic parity** — “Section header,” “destructive action,” “success notice” should look the same everywhere.

---

## CSS

- **`index.css`** — Global resets, fonts, rare keyframes only. No page-specific rules.
- **Arbitrary values** (`max-w-[720px]`, etc.) — Allowed when tied to a **documented** layout decision; prefer theme extension only if the value becomes a system token used in many places.
- **Repeating class strings** — If the same 5+ class combo appears twice, consider a small component or `clsx` helper in one place — not copy-paste across files.
- **No per-page reinvention** — New screen = compose existing primitives first.

---

## Commercial product mindset

- Build for **maintainers and future hires**: naming, structure, and UI patterns should be learnable in a day.
- Decisions should support **trust** (clear, stable UI) and **growth** (new features slot into existing patterns).
- This is **not** a throwaway prototype — ship polish that would survive a paying customer demo.

---

## References

- Product values: `docs/elk-garden/principles.md`
- Direction and scale: `docs/elk-garden/vision.md`
- Agent/engineering context: `agent.md`

When in doubt, **match an existing primary tab** before inventing a new pattern.
