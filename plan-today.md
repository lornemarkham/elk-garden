# ELK Garden — Day Plan (Kathy Feedback Driven)

## 🎯 Goal for Today
Reduce friction. Increase clarity. Make the app feel simple and calm.

DO NOT add new features.

---

## 🧱 Block 1 — Layout Fixes (Highest Priority)

### Issues
- Header too large
- Content not starting at top
- Narrow screen feels cramped

### Actions
- Reduce header to minimal (logo + "ELK Garden" only)
- Remove extra spacing and secondary text from header
- Force scroll to top on navigation
- Constrain layout width for readability

### Implementation Notes
- Add scroll reset on page load/navigation
- Wrap main content in a centered container (max-width ~720px)

---

## 🧭 Block 2 — Plan Page Clarity

### Problem
User clicks "Review plan" and feels lost

### Solution
Add a human, guiding summary ABOVE the existing summary

### New Summary Block (plain text)
🌱 Your garden plan

You’re off to a great start 👍  
We’ve set up a simple layout based on what you entered.

📍 Vernon, BC  
🎯 Goal: Balanced  
🌿 Growing: Tomatoes  

👉 Next step:  
Check your layout or go to today's tasks.

### Important
- KEEP your existing "Garden summary" card
- This new block sits ABOVE it
- This is emotional + directional (not just data)

---

## 🧱 Block 3 — Reduce Overwhelm

### Problem
Too much scrolling, unclear structure

### Solution
Only show 3 sections:

1. Summary (open)
2. Layout (collapsed)
3. Details (collapsed)

### Actions
- Collapse layout (canvas) by default
- Add a clear "View layout" button
- Keep everything else hidden until needed

---

## 🌿 Block 4 — Fix "Cool Season" Confusion

### Replace text

Old:
Cool-season area

New:
Plant now (cool-weather crops)

### Helper text
These grow well in cooler temperatures (like peas or lettuce)

---

## 🔁 Block 5 — Row Management (Simple Version)

DO NOT build drag & drop today

### Instead:
- Add "Move up"
- Add "Move down"
- Optional: "Swap rows"

Keep it simple and functional

---

## 🧠 Block 6 — Reduce Pressure

### Add this at top of Plan page

Don’t worry about getting this perfect 👍  
We’ll guide you as you go.

This is critical for Kathy-type users

---

## ✅ Block 7 — Tasks Page Improvement

### Add:
- "Start here" label on the first task

No other changes needed — this page is already strong

---

## 🧱 Block 8 — Canvas Context

### Problem
Canvas feels confusing and heavy

### Add above canvas

Your garden layout (simple view)

### Add helper text

You can ignore this for now — we’ll guide you step by step.

---

## 🧠 Product Direction Reminder

We are NOT building:
a garden planner

We ARE building:
a calm gardening guide

---

## 🗓 Execution Plan

### Morning (2–3 hours)
- Fix header
- Fix scroll-to-top issue
- Add width constraint
- Add human summary block

### Midday (2 hours)
- Collapse sections
- Fix wording (cool-season → plant now)
- Add calming copy

### Afternoon (2–3 hours)
- Improve tasks page ("Start here")
- Clean spacing and readability
- Test again with Kathy

---

## 🚨 Rules for Today

- No new features
- No over-engineering
- Reduce friction only
- Clarity over power