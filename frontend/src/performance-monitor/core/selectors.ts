import type {
  ApiCallEvent,
  DerivedMetrics,
  EmbeddedHttpBeforeReady,
  EmbeddedLoadExperienceSummary,
  EmbeddedStartupTimelineRow,
  EmbeddedStartupVerdict,
  EmbeddedTimingAnchorKind,
  HealthLevel,
  HealthSummary,
  IframeExperienceSummary,
  MonitorState,
  RequestKind,
  SLOConfig,
  SLOMetricRow,
  SLOSnapshot,
} from './types'
import { isCallComplete, isCallFailed } from './types'

/** Cooperative lifecycle `type` strings the monitor treats as readable phases (parent-observed only). */
const COOPERATIVE_IFRAME_LIFECYCLE = new Set([
  'iframe-shell-rendered',
  'iframe-params-parsed',
  'iframe-content-visible',
  'iframe-ready',
])

const COOPERATIVE_LIFECYCLE_LABELS: Record<string, string> = {
  'iframe-shell-rendered': 'Shell rendered',
  'iframe-params-parsed': 'Params parsed',
  'iframe-content-visible': 'Content visible',
  'iframe-ready': 'Ready',
}

export function isCooperativeIframeLifecycleSummary(summary: string): boolean {
  return COOPERATIVE_IFRAME_LIFECYCLE.has(summary)
}

/** Short label for lifecycle rows in the Iframes tab; `null` if not a known lifecycle type */
export function cooperativeIframeLifecycleDisplayLabel(summary: string): string | null {
  if (!COOPERATIVE_IFRAME_LIFECYCLE.has(summary)) return null
  return COOPERATIVE_LIFECYCLE_LABELS[summary] ?? summary
}

function buildIframeExperience(state: MonitorState): IframeExperienceSummary | null {
  const frames = state.iframeInventory
  if (frames.length === 0) return null

  const byRel = { same_origin: 0, cross_origin: 0, srcdoc: 0, unknown: 0 }
  for (const f of frames) {
    byRel[f.relation] += 1
  }
  const parts: string[] = []
  if (byRel.same_origin) parts.push(`${byRel.same_origin} same-origin`)
  if (byRel.cross_origin) parts.push(`${byRel.cross_origin} cross-origin`)
  if (byRel.srcdoc) parts.push(`${byRel.srcdoc} srcdoc`)
  if (byRel.unknown) parts.push(`${byRel.unknown} unknown`)
  const relationBreakdownText = parts.join(' · ')

  let latestLifecycle: IframeExperienceSummary['latestLifecycle'] = null
  for (let i = state.postMessageLog.length - 1; i >= 0; i--) {
    const e = state.postMessageLog[i]
    if (COOPERATIVE_IFRAME_LIFECYCLE.has(e.summary)) {
      latestLifecycle = {
        type: e.summary,
        displayLabel: COOPERATIVE_LIFECYCLE_LABELS[e.summary] ?? e.summary,
        timestampMs: e.timestampMs,
        direction: e.direction,
      }
      break
    }
  }

  const loads = state.iframeLoadLog.filter((l) => l.kind === 'load')
  const errors = state.iframeLoadLog.filter((l) => l.kind === 'error')

  const lifecycleReceived = state.postMessageLog.filter(
    (e) => e.direction === 'received' && COOPERATIVE_IFRAME_LIFECYCLE.has(e.summary),
  )
  const hasReady = state.postMessageLog.some(
    (e) => e.direction === 'received' && e.summary === 'iframe-ready',
  )

  const warnings: string[] = []
  if (lifecycleReceived.length === 0) {
    warnings.push(
      'Iframe(s) present, but no cooperative lifecycle messages received yet (`iframe-shell-rendered`, `iframe-params-parsed`, …). The parent only sees phases the embed posts to this window.',
    )
  }
  if (loads.length > 0 && !hasReady) {
    warnings.push(
      'At least one iframe element `load` event was observed, but `iframe-ready` has not been received. The document may still be staging, or the embed may not emit that signal.',
    )
  }
  const reloadHintThreshold = Math.max(4, frames.length * 3)
  if (loads.length >= reloadHintThreshold) {
    warnings.push(
      `Many iframe element load events (${loads.length}) — commonly from the parent changing iframe \`src\` (e.g. query params). Parent-observed only, not a trace inside the frame.`,
    )
  }
  if (errors.length > 0) {
    warnings.push(
      `One or more iframe element \`error\` events (${errors.length}) were observed on the parent node — the navigation may have failed before any readiness message.`,
    )
  }

  return {
    iframeCount: frames.length,
    relationBreakdownText,
    latestLifecycle,
    elementLoadEventCount: loads.length,
    elementErrorEventCount: errors.length,
    warnings,
  }
}

/** Long gap after element load before shell cooperates — perceived blank. */
const BLANK_FIRST_SHELL_MS = 650
/** Very fast shell after load — heuristic only (possible server-delivered shell). */
const FAST_SHELL_AFTER_LOAD_MS = 175

function firstReceivedLifecycleTs(
  log: MonitorState['postMessageLog'],
  summary: string,
): number | null {
  for (const e of log) {
    if (e.direction === 'received' && e.summary === summary) return e.timestampMs
  }
  return null
}

function delayAfterAnchor(anchorMs: number | null, eventMs: number | null): number | null {
  if (anchorMs == null || eventMs == null) return null
  const d = eventMs - anchorMs
  return d >= 0 ? d : null
}

function earliestCooperativeReceivedTs(log: MonitorState['postMessageLog']): number | null {
  let min: number | null = null
  for (const e of log) {
    if (e.direction === 'received' && COOPERATIVE_IFRAME_LIFECYCLE.has(e.summary)) {
      if (min == null || e.timestampMs < min) min = e.timestampMs
    }
  }
  return min
}

function countHttpBeforeReady(events: readonly ApiCallEvent[], tReady: number): EmbeddedHttpBeforeReady {
  const completed = events.filter(
    (e) => isCallComplete(e) && e.settledAtMs != null && e.settledAtMs <= tReady,
  )
  const row: EmbeddedHttpBeforeReady = {
    totalCompleted: completed.length,
    api: 0,
    frontend: 0,
    external: 0,
    unknown: 0,
  }
  for (const e of completed) {
    row[e.requestKind] += 1
  }
  return row
}

function buildEmbeddedLoadExperience(state: MonitorState): EmbeddedLoadExperienceSummary | null {
  if (state.iframeInventory.length === 0) return null

  const loadEvents = state.iframeLoadLog.filter((l) => l.kind === 'load')
  const tLoad =
    loadEvents.length > 0 ? Math.min(...loadEvents.map((l) => l.timestampMs)) : null
  const tInv = state.iframeFirstDetectedAtMs
  const tFirstLife = earliestCooperativeReceivedTs(state.postMessageLog)

  let anchorKind: EmbeddedTimingAnchorKind
  let anchorAtMs: number | null
  let anchorExplanation: string

  if (tLoad != null) {
    anchorKind = 'iframe_element_load'
    anchorAtMs = tLoad
    anchorExplanation =
      'Anchor: earliest iframe element `load` in this session (parent DOM). Preferred for navigation-aligned deltas.'
  } else if (tFirstLife != null) {
    anchorKind = 'first_cooperative_lifecycle'
    anchorAtMs = tFirstLife
    anchorExplanation =
      'Anchor: earliest cooperative lifecycle message — no element `load` in log (late monitor, evicted `load` rows, or edge case). Deltas track embed signals, not document navigation.'
  } else if (tInv != null) {
    anchorKind = 'iframe_inventory_first_seen'
    anchorAtMs = tInv
    anchorExplanation =
      'Anchor: first inventory scan that saw an iframe (debounced collector). Coarse lower bound when `load`/lifecycle are missing.'
  } else {
    anchorKind = 'none'
    anchorAtMs = null
    anchorExplanation =
      'No timing anchor yet — wait for element `load`, cooperative messages, or an inventory scan while the monitor is on.'
  }

  const tShell = firstReceivedLifecycleTs(state.postMessageLog, 'iframe-shell-rendered')
  const tParams = firstReceivedLifecycleTs(state.postMessageLog, 'iframe-params-parsed')
  const tContent = firstReceivedLifecycleTs(state.postMessageLog, 'iframe-content-visible')
  const tReady = firstReceivedLifecycleTs(state.postMessageLog, 'iframe-ready')

  const delayCaveats: string[] = []
  if (anchorAtMs != null) {
    for (const t of [tShell, tParams, tContent, tReady]) {
      if (t != null && t < anchorAtMs) {
        delayCaveats.push(
          'A lifecycle timestamp precedes the chosen anchor — some deltas are unknown (ordering, cap, or clock).',
        )
        break
      }
    }
  }

  const shellDelayMs = delayAfterAnchor(anchorAtMs, tShell)
  const contentVisibleDelayMs = delayAfterAnchor(anchorAtMs, tContent)
  const readyDelayMs = delayAfterAnchor(anchorAtMs, tReady)
  const totalStartupMs = delayAfterAnchor(anchorAtMs, tReady)

  const timing = {
    anchorKind,
    anchorAtMs,
    anchorExplanation,
    firstElementLoadAtMs: tLoad,
    firstInventoryDetectedAtMs: tInv,
    shellDelayMs,
    contentVisibleDelayMs,
    readyDelayMs,
    totalStartupMs,
    delayCaveats,
  }

  const timeline: EmbeddedStartupTimelineRow[] = [
    {
      id: 'dom',
      label: 'Iframe in parent document (inventory)',
      observed: state.iframeInventory.length > 0,
      atMs: tInv,
      deltaFromAnchorMs: delayAfterAnchor(anchorAtMs, tInv),
    },
    {
      id: 'load',
      label: 'Iframe element load (parent)',
      observed: tLoad != null,
      atMs: tLoad,
      deltaFromAnchorMs: delayAfterAnchor(anchorAtMs, tLoad),
    },
    {
      id: 'shell',
      label: 'iframe-shell-rendered (cooperative)',
      observed: tShell != null,
      atMs: tShell,
      deltaFromAnchorMs: shellDelayMs,
    },
    {
      id: 'params',
      label: 'iframe-params-parsed (cooperative)',
      observed: tParams != null,
      atMs: tParams,
      deltaFromAnchorMs: delayAfterAnchor(anchorAtMs, tParams),
    },
    {
      id: 'content',
      label: 'iframe-content-visible (cooperative)',
      observed: tContent != null,
      atMs: tContent,
      deltaFromAnchorMs: contentVisibleDelayMs,
    },
    {
      id: 'ready',
      label: 'iframe-ready (cooperative)',
      observed: tReady != null,
      atMs: tReady,
      deltaFromAnchorMs: readyDelayMs,
    },
  ]

  let latestStageLabel = 'No cooperative lifecycle in capped log yet'
  if (tReady != null) latestStageLabel = 'iframe-ready'
  else if (tContent != null) latestStageLabel = 'iframe-content-visible'
  else if (tParams != null) latestStageLabel = 'iframe-params-parsed'
  else if (tShell != null) latestStageLabel = 'iframe-shell-rendered'
  else if (tLoad != null) latestStageLabel = 'iframe element load only (no lifecycle messages)'
  else latestStageLabel = 'iframe in document (no element load in log yet)'

  const httpBeforeReady: EmbeddedHttpBeforeReady | null =
    tReady != null ? countHttpBeforeReady(state.events, tReady) : null

  const lifecycleReceived = state.postMessageLog.filter(
    (e) => e.direction === 'received' && COOPERATIVE_IFRAME_LIFECYCLE.has(e.summary),
  )

  const hasLifecycle = lifecycleReceived.length > 0

  let startupVerdict: EmbeddedStartupVerdict
  if (!tReady) {
    if (anchorKind === 'none' && !hasLifecycle && tLoad == null) {
      startupVerdict = 'insufficient_evidence'
    } else {
      startupVerdict = 'ready_missing'
    }
  } else if (tLoad != null && tShell != null) {
    startupVerdict =
      tShell - tLoad >= BLANK_FIRST_SHELL_MS
        ? 'ready_observed_blank_first'
        : 'ready_observed_shell_first'
  } else {
    startupVerdict = 'ready_observed'
  }

  const perceivedWarnings: string[] = []

  if (tLoad != null && tShell != null && tShell - tLoad >= BLANK_FIRST_SHELL_MS) {
    perceivedWarnings.push(
      `Blank-first load detected: cooperative shell was not reported until ~${tShell - tLoad} ms after the iframe element load (parent-perceived gap).`,
    )
  }

  if (tLoad != null && tShell == null && tContent != null && tContent - tLoad >= 350) {
    perceivedWarnings.push(
      'Loader/shell not observed: `iframe-content-visible` arrived with no prior `iframe-shell-rendered` in this capped parent log.',
    )
  }

  if (tLoad != null && tShell == null && tReady != null && tContent == null) {
    perceivedWarnings.push(
      'Loader/shell not observed: `iframe-ready` arrived without a shell or content-visible phase in the parent log (ordering may be intentional or messages may have dropped from the cap).',
    )
  }

  const sortedLife = [...lifecycleReceived].sort((a, b) => a.timestampMs - b.timestampMs)
  const firstLife = sortedLife[0]
  if (
    firstLife &&
    firstLife.summary !== 'iframe-shell-rendered' &&
    (firstLife.summary === 'iframe-content-visible' || firstLife.summary === 'iframe-ready')
  ) {
    perceivedWarnings.push(
      'Loader/shell not observed: first cooperative lifecycle message skipped `iframe-shell-rendered` (parent-observed order only).',
    )
  }

  if (tLoad != null && !tReady) {
    perceivedWarnings.push(
      'Iframe element load observed, but `iframe-ready` has not been received in this capped log — perceived startup may still be in flight or the embed does not emit readiness.',
    )
  }

  if (httpBeforeReady && tReady) {
    const { totalCompleted, api, frontend } = httpBeforeReady
    if (totalCompleted >= 3 && api >= 2 && api >= frontend) {
      perceivedWarnings.push(
        'Heuristic: several API/BFF-typed parent requests finished before `iframe-ready` — host-side work, not the embed’s own fetches unless they share this window.',
      )
    }
  }

  const deduped = [...new Set(perceivedWarnings)]

  let startupHeuristic = 'Insufficient evidence'
  if (anchorKind === 'none' && !hasLifecycle && tLoad == null) {
    startupHeuristic = 'Insufficient evidence'
  } else if (httpBeforeReady && httpBeforeReady.api >= 3 && httpBeforeReady.api >= httpBeforeReady.frontend) {
    startupHeuristic = 'Likely backend-heavy startup'
  } else if (httpBeforeReady && httpBeforeReady.frontend >= 5 && httpBeforeReady.frontend > httpBeforeReady.api) {
    startupHeuristic = 'Likely client-heavy startup'
  } else if (
    tShell != null &&
    tLoad != null &&
    tShell - tLoad >= 0 &&
    tShell - tLoad <= FAST_SHELL_AFTER_LOAD_MS
  ) {
    startupHeuristic = 'Possible shell-first rendering'
  } else if (hasLifecycle || tLoad != null) {
    startupHeuristic = 'Insufficient evidence'
  }

  return {
    timeline,
    timing,
    startupVerdict,
    observed: {
      shell: tShell != null,
      contentVisible: tContent != null,
      ready: tReady != null,
      latestStageLabel,
    },
    httpBeforeReady,
    startupHeuristic,
    perceivedWarnings: deduped,
  }
}

function healthFromSignals(args: {
  failureRate: number
  slowOver1s: number
  flakeHints: string[]
}): { level: HealthLevel; headline: string; hints: string[] } {
  const hints = [...args.flakeHints]
  let level: HealthLevel = 'good'
  let headline = 'Requests look healthy for this session.'

  if (args.failureRate > 0.5) {
    level = 'critical'
    headline = 'Many requests are failing — check Errors tab.'
  } else if (args.failureRate > 0.2) {
    level = 'warning'
    headline = 'Elevated failure rate — worth investigating.'
  }

  if (args.slowOver1s >= 3 && level === 'good') {
    level = 'warning'
    headline = 'Several slow responses detected.'
  }
  if (args.slowOver1s >= 6) {
    level = level === 'critical' ? 'critical' : 'warning'
    hints.push(`${args.slowOver1s} completed calls exceeded 1s`)
  }

  return { level, headline, hints }
}

function collectFlakeHints(events: ApiCallEvent[]): string[] {
  const hints: string[] = []
  const completed = events.filter(isCallComplete)
  if (completed.length > 50) {
    hints.push(`High call volume in this session (${completed.length}) — possible loop?`)
  }
  const failed = events.filter(isCallFailed)
  if (events.length > 5 && failed.length / events.length > 0.3) {
    hints.push('Failure rate over 30% in recent traffic')
  }
  return hints
}

export function buildDerivedMetrics(state: MonitorState): DerivedMetrics {
  const events = [...state.events]
  const complete = events.filter(isCallComplete)
  const failed = events.filter(isCallFailed)
  const durations = complete
    .map((e) => e.durationMs!)
    .filter((d) => d > 0)
  const meanDurationMs =
    durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0

  const slowest = complete.reduce<ApiCallEvent | undefined>((acc, e) => {
    if (!acc || (e.durationMs && e.durationMs > (acc.durationMs ?? 0))) return e
    return acc
  }, undefined)

  const fastest = complete.reduce<ApiCallEvent | undefined>((acc, e) => {
    if (!acc || (e.durationMs && e.durationMs < (acc.durationMs ?? Infinity))) return e
    return acc
  }, undefined)

  const countsByOrigin: DerivedMetrics['countsByOrigin'] = {
    api_backend: 0,
    same_origin: 0,
    third_party: 0,
    unknown: 0,
  }
  for (const e of events) {
    countsByOrigin[e.callOrigin] += 1
  }

  const countsByRequestKind: Record<RequestKind, number> = {
    frontend: 0,
    api: 0,
    external: 0,
    unknown: 0,
  }
  for (const e of events) {
    countsByRequestKind[e.requestKind] += 1
  }

  const failureRate = events.length > 0 ? failed.length / events.length : 0
  const slowOver1s = complete.filter((e) => (e.durationMs ?? 0) > 1000).length
  const { level, headline, hints } = healthFromSignals({
    failureRate,
    slowOver1s,
    flakeHints: collectFlakeHints(events),
  })

  const health: HealthSummary =
    events.length === 0
      ? {
          level: 'good',
          headline:
            'No HTTP calls recorded yet. With the monitor enabled, open Tasks (auto /api/tasks/generate) or generate a plan (/api/plans/build).',
          hints: [],
        }
      : { level, headline, hints }

  return {
    apiCalls: events,
    totalCalls: events.length,
    failedCalls: failed.length,
    meanDurationMs,
    slowest,
    fastest,
    countsByOrigin,
    countsByRequestKind,
    health,
    clientErrors: [...state.clientErrors],
    pageNavigation: state.pageNavigation,
    iframeInventory: [...state.iframeInventory],
    iframeLoadLog: [...state.iframeLoadLog],
    postMessageLog: [...state.postMessageLog],
    iframeExperience: buildIframeExperience(state),
    embeddedLoadExperience: buildEmbeddedLoadExperience(state),
  }
}

const defaultSloConfigs: SLOConfig[] = [
  {
    id: 'success-rate',
    name: 'Request success rate',
    target: 95,
    unit: 'percent',
    compare: 'above',
    critical: true,
    description: 'Share of calls that completed without HTTP4xx/5xx or network error.',
  },
  {
    id: 'error-rate',
    name: 'HTTP / network error rate',
    target: 5,
    unit: 'percent',
    compare: 'below',
    critical: true,
    description: 'Percentage of calls that failed (status ≥400 or thrown error).',
  },
  {
    id: 'mean-latency',
    name: 'Mean request duration (completed)',
    target: 800,
    unit: 'milliseconds',
    compare: 'below',
    critical: false,
    description: 'Arithmetic mean of completed fetch durations — not a percentile.',
  },
]

function sloViolating(config: SLOConfig, value: number): boolean {
  if (config.compare === 'above') return value < config.target
  return value > config.target
}

export function buildSloSnapshot(derived: DerivedMetrics, now = Date.now()): SLOSnapshot {
  const { totalCalls, failedCalls, meanDurationMs } = derived
  const successRatePct =
    totalCalls > 0 ? ((totalCalls - failedCalls) / totalCalls) * 100 : 100
  const errorRatePct = totalCalls > 0 ? (failedCalls / totalCalls) * 100 : 0

  const valuesById: Record<string, number> = {
    'success-rate': successRatePct,
    'error-rate': errorRatePct,
    'mean-latency': meanDurationMs,
  }

  const metrics: SLOMetricRow[] = defaultSloConfigs.map((config) => {
    const currentValue = valuesById[config.id] ?? 0
    return {
      config,
      currentValue,
      isViolating: sloViolating(config, currentValue),
    }
  })

  const violatingCount = metrics.filter((m) => m.isViolating).length
  const criticalViolations = metrics.filter((m) => m.isViolating && m.config.critical).length

  let overallHealth: SLOSnapshot['overallHealth'] = 'healthy'
  if (criticalViolations > 0) overallHealth = 'critical'
  else if (violatingCount > 0) overallHealth = 'warning'

  return {
    timestampMs: now,
    metrics,
    overallHealth,
    violatingCount,
  }
}
