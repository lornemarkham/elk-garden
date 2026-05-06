/**
 * Shared types for the in-app performance monitor (Phase 1).
 * Kept framework-agnostic for future package / extension extraction.
 */

/** Where the request targets (simple URL rules). See `classifyRequestKind`. */
export type RequestKind = 'frontend' | 'api' | 'external' | 'unknown'

/** How we classify requests for aggregation (honest, rule-based). */
export type CallOrigin = 'api_backend' | 'same_origin' | 'third_party' | 'unknown'

/** Source of the instrumentation. */
export type CallSource = 'fetch' | 'xhr'

export type ApiKind = 'rest' | 'graphql' | 'other'

/** One completed or in-flight HTTP observation from fetch / XHR instrumentation. */
export interface ApiCallEvent {
  id: string
  url: string
  method: string
  /** performance.now() when the request started */
  startTime: number
  /** performance.now() when the response settled */
  endTime?: number
  durationMs?: number
  status?: number
  errorMessage?: string
  source: CallSource
  /** Same-origin SPA vs API host vs third-party (derived from URL). */
  requestKind: RequestKind
  callOrigin: CallOrigin
  apiKind: ApiKind
  /** Wall-clock ms when the event was finished (best-effort for timeline UI). */
  settledAtMs?: number
  /**
   * From response headers when exposed (x-trace-id, x-request-id, traceparent, x-correlation-id).
   * Omitted when CORS hides headers or none present.
   */
  traceId?: string
}

/** Window-level error or unhandled promise rejection (not HTTP). */
export interface ClientErrorEvent {
  id: string
  timestampMs: number
  source: 'window_error' | 'unhandledrejection'
  message: string
  filename?: string
  lineno?: number
  colno?: number
  stack?: string
}

/**
 * Timing summary for the initial document navigation (PerformanceNavigationTiming).
 * Does not reflect client-side route changes after load.
 */
export interface PageNavigationSummary {
  capturedAtMs: number
  navigationType: string
  /** redirectEnd - redirectStart */
  redirectMs: number
  /** domainLookupEnd - domainLookupStart */
  dnsMs: number
  /** connectEnd - connectStart (includes TLS when applicable) */
  connectMs: number
  /** responseStart - requestStart (often called TTFB) */
  requestToFirstByteMs: number
  /** responseEnd - responseStart */
  responseDownloadMs: number
  /** domContentLoadedEventEnd - domContentLoadedEventStart */
  domContentLoadedMs: number
  /** loadEventEnd - loadEventStart */
  loadEventMs: number
  /** loadEventEnd - startTime (full navigation) when available */
  durationMs: number
}

/** Parent document only; cross-origin iframe internals are not visible. */
export type IframeRelation = 'same_origin' | 'cross_origin' | 'srcdoc' | 'unknown'

export type IframeVisibleHeuristic = 'visible' | 'hidden' | 'unknown'

/** Best-effort iframe inventory (discovery / devtools-style, not security audit). */
export interface IframeInventoryItem {
  id: string
  index: number
  /** Raw `src` attribute; may be empty for srcdoc. */
  srcAttribute: string | null
  /** Resolved URL when parsable; `about:srcdoc` for srcdoc iframes. */
  resolvedUrl: string | null
  /** Declared or parsed origin when known. */
  iframeOrigin: string | null
  relation: IframeRelation
  /** HTML width/height attributes if set. */
  attrWidth: string | null
  attrHeight: string | null
  /** Layout box (CSS px). */
  layoutWidth: number
  layoutHeight: number
  visibleHeuristic: IframeVisibleHeuristic
  /** Same-origin / srcdoc: document.readyState when readable; else unknown. */
  embeddedReadyState: string | null
  limitationNote?: string
}

export type IframeLoadKind = 'load' | 'error'

export interface IframeLoadObservation {
  id: string
  timestampMs: number
  iframeId: string
  kind: IframeLoadKind
}

export type PostMessageDirection = 'received' | 'sent'

/** Parent window only: received via message listener; sent via patched postMessage on window. */
export interface PostMessageObservation {
  id: string
  timestampMs: number
  direction: PostMessageDirection
  /** event.origin (received) or targetOrigin argument (sent) */
  origin: string
  /** Primary human-readable label (message type value, string body, key outline, etc.) — not full payload. */
  summary: string
  /** Optional extra context (e.g. other keys when a `type` field was present). */
  summaryDetail?: string
}

/** Serializable monitor snapshot for subscribers. */
export interface MonitorState {
  enabled: boolean
  /** Date.now() when the monitor process started */
  sessionStartedAtMs: number
  /**
   * First time this session the inventory collector reported ≥1 iframe (`Date.now()` when set).
   * Coarse: scan is debounced; not the true DOM insertion instant.
   */
  iframeFirstDetectedAtMs: number | null
  events: readonly ApiCallEvent[]
  clientErrors: readonly ClientErrorEvent[]
  pageNavigation: PageNavigationSummary | null
  readonly iframeInventory: readonly IframeInventoryItem[]
  readonly iframeLoadLog: readonly IframeLoadObservation[]
  readonly postMessageLog: readonly PostMessageObservation[]
}

/** Aggregate health derived from events (not a substitute for server APM). */
export type HealthLevel = 'good' | 'warning' | 'critical'

export interface HealthSummary {
  level: HealthLevel
  /** Short human-readable reason for the current level */
  headline: string
  hints: string[]
}

/** SLO config + live value (Phase 1 uses simple metrics — no fake P95/P99 labels). */
export interface SLOConfig {
  id: string
  name: string
  target: number
  unit: 'percent' | 'milliseconds' | 'ratio'
  /** 'above' = higher is better (e.g. success rate). 'below' = lower is better (e.g. error rate). */
  compare: 'above' | 'below'
  critical: boolean
  description: string
}

export interface SLOMetricRow {
  config: SLOConfig
  currentValue: number
  isViolating: boolean
}

export interface SLOSnapshot {
  timestampMs: number
  metrics: SLOMetricRow[]
  overallHealth: 'healthy' | 'warning' | 'critical'
  violatingCount: number
}

/**
 * Parent-observed iframe UX hints (inventory + `message` / `load` on the iframe element).
 * Not internal tracing inside the embedded document unless the child cooperates via postMessage.
 */
export interface IframeExperienceSummary {
  iframeCount: number
  /** e.g. "1 same-origin · 0 cross-origin" */
  relationBreakdownText: string
  /** Most recent cooperative lifecycle `type` in the capped postMessage log, if any */
  latestLifecycle: {
    type: string
    displayLabel: string
    timestampMs: number
    direction: PostMessageDirection
  } | null
  /** `load` events on iframe elements in the parent document */
  elementLoadEventCount: number
  elementErrorEventCount: number
  /** Honest caveats / heuristics only */
  warnings: string[]
}

/** One row in the parent-observed embedded startup timeline (not distributed tracing). */
export interface EmbeddedStartupTimelineRow {
  id: string
  label: string
  observed: boolean
  /** Wall-clock ms when first observed, if applicable */
  atMs: number | null
  /** ms at or after the chosen timing anchor; null = unknown (before anchor, no anchor, or not observed) */
  deltaFromAnchorMs: number | null
}

/**
 * Parent-window HTTP calls completed before cooperative `iframe-ready` (`settledAtMs` in this document).
 * Does not include fetch/XHR inside an embedded browsing context unless it shares this instrumentation.
 */
export interface EmbeddedHttpBeforeReady {
  totalCompleted: number
  /** `requestKind === 'api'` */
  api: number
  frontend: number
  external: number
  unknown: number
}

export type EmbeddedTimingAnchorKind =
  | 'iframe_element_load'
  | 'first_cooperative_lifecycle'
  | 'iframe_inventory_first_seen'
  | 'none'

/** Qualitative startup verdict (parent-observed only). */
export type EmbeddedStartupVerdict =
  | 'insufficient_evidence'
  | 'ready_missing'
  | 'ready_observed'
  | 'ready_observed_shell_first'
  | 'ready_observed_blank_first'

/** Delays vs chosen anchor; null ms means unknown / not after anchor — see `delayCaveats`. */
export interface EmbeddedLoadTimingSummary {
  anchorKind: EmbeddedTimingAnchorKind
  anchorAtMs: number | null
  /** Why this anchor was chosen (honest limits). */
  anchorExplanation: string
  firstElementLoadAtMs: number | null
  firstInventoryDetectedAtMs: number | null
  shellDelayMs: number | null
  contentVisibleDelayMs: number | null
  readyDelayMs: number | null
  totalStartupMs: number | null
  delayCaveats: string[]
}

/**
 * Parent-observed embedded load narrative (lifecycle + parent HTTP + iframe element signals).
 * Heuristics only — cannot see inside cross-origin frames without cooperation.
 */
export interface EmbeddedLoadExperienceSummary {
  timeline: EmbeddedStartupTimelineRow[]
  timing: EmbeddedLoadTimingSummary
  startupVerdict: EmbeddedStartupVerdict
  observed: {
    shell: boolean
    contentVisible: boolean
    ready: boolean
    /** Highest cooperative stage reached in this capped log */
    latestStageLabel: string
  }
  httpBeforeReady: EmbeddedHttpBeforeReady | null
  /** Short heuristic label (not architecture proof). */
  startupHeuristic: string
  /** Perceived UX / ordering warnings */
  perceivedWarnings: string[]
}

/** Derived metrics bundle for UI (built via selectors). */
export interface DerivedMetrics {
  apiCalls: ApiCallEvent[]
  totalCalls: number
  failedCalls: number
  /** Arithmetic mean duration of completed calls with duration > 0 */
  meanDurationMs: number
  slowest?: ApiCallEvent
  fastest?: ApiCallEvent
  countsByOrigin: Record<CallOrigin, number>
  countsByRequestKind: Record<RequestKind, number>
  health: HealthSummary
  clientErrors: ClientErrorEvent[]
  pageNavigation: PageNavigationSummary | null
  iframeInventory: IframeInventoryItem[]
  iframeLoadLog: IframeLoadObservation[]
  postMessageLog: PostMessageObservation[]
  /** Present when `iframeInventory` is non-empty */
  iframeExperience: IframeExperienceSummary | null
  /** Parent-observed embedded startup story when iframes exist */
  embeddedLoadExperience: EmbeddedLoadExperienceSummary | null
}

export function isCallFailed(event: ApiCallEvent): boolean {
  if (event.errorMessage) return true
  if (event.status != null && event.status >= 400) return true
  return false
}

export function isCallComplete(event: ApiCallEvent): boolean {
  return event.durationMs != null
}
