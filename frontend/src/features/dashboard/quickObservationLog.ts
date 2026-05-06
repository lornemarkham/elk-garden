const KEY = 'elk_garden_quick_log_v1'

export type QuickLogTag = 'pests' | 'stressed' | 'soil_dry'

export type QuickLogEntry = {
  t: string
  tag: QuickLogTag
  label: string
}

export function appendQuickObservation(tag: QuickLogTag, label: string): void {
  const entry: QuickLogEntry = {
    t: new Date().toISOString(),
    tag,
    label,
  }
  try {
    const prev = loadQuickObservationLog()
    prev.push(entry)
    localStorage.setItem(KEY, JSON.stringify(prev.slice(-40)))
  } catch {
    // ignore
  }
  console.info('[elk-garden] quick observation', entry)
}

export function loadQuickObservationLog(): QuickLogEntry[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    const out: QuickLogEntry[] = []
    for (const row of parsed) {
      if (!row || typeof row !== 'object') continue
      const r = row as Record<string, unknown>
      if (
        typeof r.t !== 'string' ||
        typeof r.label !== 'string' ||
        (r.tag !== 'pests' &&
          r.tag !== 'stressed' &&
          r.tag !== 'soil_dry')
      ) {
        continue
      }
      out.push({
        t: r.t,
        tag: r.tag as QuickLogTag,
        label: r.label,
      })
    }
    return out
  } catch {
    return []
  }
}
