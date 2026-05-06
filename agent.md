# ELK Garden Agent Guide

## Product Purpose
ELK Garden helps people grow more food with less guesswork.
It is a calm, practical garden operating system for real-world home gardeners.

## Primary Users
- Lorne Mode: efficiency, yield, experimentation, system thinking
- Kathy Mode: calm, simple, confidence-building, low-friction guidance

## Product Principles
- Reduce stress, not add complexity
- Explain what to do and why it matters
- Default to clarity over cleverness
- Show the big picture before detailed controls
- Collapse complexity by default
- Prioritize elderly-friendly usability: large text, clean spacing, obvious actions
- Keep scrolling reasonable, especially on laptop screens
- Avoid clutter and over-instrumentation

## UX Rules
- Important actions should be visible without hunting
- Pages should orient the user quickly with summary/context blocks
- Avoid dumping large forms or dense control panels on first view
- Use simple language over technical gardening jargon
- If a screen feels “smart but tiring,” simplify it
- Always consider Kathy-first usability

## Current Priorities
1. Make the Plan page understandable in 5 seconds
2. Reduce scrolling and visual overhead
3. Fix route/page scroll position bugs
4. Improve warm-season vs cool-season guidance
5. Keep onboarding low-friction

## Visual & styling standards
- **Tailwind-first** — prefer utility classes in components; avoid new custom CSS unless there is a clear, documented reason.
- **Minimal custom CSS** — keep `index.css` to globals (reset, fonts, rare keyframes). No page-specific stylesheets.
- **Shared components for repeated layout** — same visual role = same component or same documented pattern (cards, section headers, primary actions). Do not invent one-off styling per page.
- **Primary pages stay visually aligned** — Dashboard, Plan, and Tasks should share the same intro/title/spacing rhythm; see `docs/elk-garden/style-guide.md`.
- **Commercial product bar** — ship UI that would survive a customer demo: consistent spacing, typography hierarchy, and button variants.
- **When a pattern repeats twice**, extract it before a third copy appears.

## Engineering Rules
- Prefer small focused components over giant files
- Prefer explicit data flow over hidden magic
- Avoid premature abstractions
- Do not introduce new state libraries or architecture layers without strong need
- Refactor repeated patterns only after repetition is real
- Keep naming plain and obvious
- Build for maintainability and iteration speed
- Every change should preserve or improve readability
- Avoid UI complexity unless it clearly improves user understanding
- When unsure, choose the simpler implementation

## Change Discipline
- Make one meaningful change at a time
- Test after each change
- Optimize based on observed user friction, not theory alone
- Preserve stable working behavior unless there is a clear reason to change it

## Definition of Good
A good ELK Garden feature feels calm, obvious, useful, and trustworthy.
A good implementation is readable, easy to change, and does not fight the product.

## Code Quality Standards
- No giant multi-purpose components when smaller ones will do
- No duplicated business logic across screens
- No vague names like data, stuff, helper2, temp
- No dead code left behind after refactors
- No styling hacks without a comment explaining why
- No new dependency unless it saves real complexity
- Prefer composition over deeply nested conditionals
- Keep props and state minimal and intentional
- Route changes should reset scroll position unless explicitly designed otherwise
- Forms and screens must remain usable on narrow laptop screens and tablet layouts


## Documentation

- **`docs/elk-garden/style-guide.md`** — UI/styling conventions (Tailwind-first, layout, typography, components).
- **`docs/elk-garden/principles.md`** — product values and trust/consistency mindset.
- **`docs/elk-garden/vision.md`** — long-term direction.

## Project Structure
- `frontend/` contains UI screens, components, and client-side state
- `backend/` contains server logic, endpoints, and garden planning/business logic
- `shared/` contains shared types, schemas, and utilities used by both frontend and backend
- `dist/` is build output and should not be treated as source of truth

## Architecture Rules
- Keep domain models and shared contracts in `shared/` when both frontend and backend need them
- Do not duplicate API payload types across frontend and backend
- Keep business logic out of view components when possible
- Prefer simple explicit flows over hidden indirection
- Add new layers only when repeated complexity justifies them

## Engineering Standards
- Use TypeScript for frontend, backend, and shared application code
- Avoid `any` unless temporary and clearly justified
- Prefer explicit types for props, API inputs/outputs, and shared models
- Prefer small focused components and modules
- If a file grows beyond ~200–250 lines, evaluate whether responsibilities should be split
- Keep business logic out of UI components where practical
- Prefer readable straightforward code over clever abstractions
- Do not introduce new dependencies without a clear simplification benefit

## Architecture Standards
- Frontend handles presentation and user interaction
- Backend handles planning logic, persistence, and server-side workflows
- Shared types and contracts belong in `shared/`
- Do not duplicate API shapes across layers
- Route changes should reset scroll position unless explicitly designed otherwise
- Preserve stable, understandable data flow over architectural novelty

## Product Evolution
- Current focus is usability, clarity, and planning confidence
- Sensor-driven automation and garden hardware integration are future roadmap items
- Do not prematurely optimize the current app around hardware until the software workflow is strong