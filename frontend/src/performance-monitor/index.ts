/**
 * In-app performance / fetch observability (Phase 1).
 * UI is dev-gated in App — core can be imported elsewhere for tests later.
 */
export { performanceMonitor } from './core/performance-monitor'
export { classifyRequestKind } from './core/requestKind'
export {
  buildDerivedMetrics,
  buildSloSnapshot,
  cooperativeIframeLifecycleDisplayLabel,
  isCooperativeIframeLifecycleSummary,
} from './core/selectors'
export type {
  ApiCallEvent,
  CallOrigin,
  ClientErrorEvent,
  DerivedMetrics,
  EmbeddedLoadExperienceSummary,
  EmbeddedStartupVerdict,
  EmbeddedTimingAnchorKind,
  IframeExperienceSummary,
  IframeInventoryItem,
  MonitorState,
  PageNavigationSummary,
  PostMessageObservation,
  RequestKind,
  SLOSnapshot,
} from './core/types'
export { default as PerformanceOverlay } from './ui/PerformanceOverlay'
