# Dashboard Command Center — future signal categories

Planning only. **V1** implements **honest placeholders** (e.g. “sensors / camera not connected”) and **does not** build pipelines for these signals. This file lists **categories** so the dashboard can grow without inventing ad hoc types per feature.

---

## Design intent

- Each **signal** is a time-stamped or stateful **observation** that answers: *Should the gardener look at this today?*
- Sources may mix: **human**, **weather API**, **soil moisture**, **camera/ML** (later), **manual log** entries.
- **Automation (current product rule):** **suggest only**; optional reminders later; **no auto-watering** or autonomous control.

---

## Signal categories (future)

Grouped for readability; overlapping items share UI patterns (e.g. “environmental stress”).

### Wildlife & movement

| Category | Examples | Notes |
|----------|-----------|--------|
| **Animal activity** | Deer, birds, rodents, pets; tracks, chews, other damage | Often human-reported or camera-derived later. |

### Camera (when connected)

| Category | Examples | Notes |
|----------|-----------|--------|
| **Camera — motion** | Movement detected in frame | Privacy and false-positive handling TBD. |
| **Camera — growth** | Progress imagery over time | Compare frames / height cues — future. |
| **Camera — pest suspicion** | Pattern cues (holes, discoloration) | Must stay **suggestive**, not diagnostic. |

### Pests & health

| Category | Examples | Notes |
|----------|-----------|--------|
| **Bug / pest alerts** | Human-reported sightings; future camera-assisted hints | Tie to **Tasks** or **Plan** beds where possible. |

### Phenology & growth

| Category | Examples | Notes |
|----------|-----------|--------|
| **Bloom alerts** | Flowers opening soon; pollinator-relevant timing | May be user-estimated dates first. |
| **Sprout alerts** | New seedlings emerging | Often after sow dates + elapsed days. |

### Weather & environmental stress

| Category | Examples | Notes |
|----------|-----------|--------|
| **Frost warnings** | Near-freeze risk from forecast or local rule | Weather integration. |
| **Heat stress** | High temp + crop sensitivity | Overlaps **dry soil** risk. |
| **Dry soil / watering risk** | Low moisture, forecast dry stretch | Today: mock **Zone.moistureStatus** hints; future: sensors. |
| **Overwatering / mildew risk** | Wet soil, humidity patterns | Today: mock **wet** zones; future: sensors + weather. |

### Harvest

| Category | Examples | Notes |
|----------|-----------|--------|
| **Harvest-ready** | Crop approaching pick window | From plan dates, notes, or variety defaults. |

---

## V1 dashboard (this phase)

- **Do not** implement ingest, storage, or ranking for the categories above beyond what already exists (e.g. mock zones, `cameraInsights` narrative).
- **Do** keep a **single** lightweight **“Future systems / signals”** placeholder on the dashboard that names **high-level buckets** in one line or a short list, e.g.: *Wildlife · Camera · Pests · Blooms & sprouts · Weather · Soil · Harvest* — **or** link to this doc. Avoid building a signal registry in code until one ingestion path exists.
- When a category ships, add **one** vertical slice: schema or `localStorage` shape + one UI surface + honest “sample / beta” labeling as needed.

---

## Relationship to existing app concepts

- **Dashboard** = *what needs attention today* (rollup of signals + tasks + quick snapshot).
- **Plan** = *what exists / what we’re growing* (beds, rows, crops).
- **Tasks** = *checklist and completion* (including follow-ups from signals when converted to tasks).

Signals may **spawn** or **link to** `PlanTaskRecord` entries later; until then, show as **recommendations** or **insights** only.

---

*Companion to Dashboard Command Center v1; update when the first non-mock signal source lands.*
