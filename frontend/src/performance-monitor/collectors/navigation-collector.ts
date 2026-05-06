import type { MonitorStore } from '../core/store'
import type { PageNavigationSummary } from '../core/types'

function safeDelta(a: number, b: number): number {
  if (!Number.isFinite(a) || !Number.isFinite(b)) return 0
  return Math.max(0, a - b)
}

export function navigationEntryToSummary(nav: PerformanceNavigationTiming): PageNavigationSummary {
  const durationMs =
    nav.duration > 0 ? nav.duration : safeDelta(nav.loadEventEnd || nav.responseEnd, nav.startTime)

  return {
    capturedAtMs: Date.now(),
    navigationType: nav.type,
    redirectMs: safeDelta(nav.redirectEnd, nav.redirectStart),
    dnsMs: safeDelta(nav.domainLookupEnd, nav.domainLookupStart),
    connectMs: safeDelta(nav.connectEnd, nav.connectStart),
    requestToFirstByteMs: safeDelta(nav.responseStart, nav.requestStart),
    responseDownloadMs: safeDelta(nav.responseEnd, nav.responseStart),
    domContentLoadedMs: safeDelta(nav.domContentLoadedEventEnd, nav.domContentLoadedEventStart),
    loadEventMs: safeDelta(nav.loadEventEnd, nav.loadEventStart),
    durationMs,
  }
}

/**
 * Records a one-shot summary of the document navigation (not SPA route transitions).
 */
export function installNavigationCollector(store: MonitorStore): () => void {
  if (typeof window === 'undefined' || !('performance' in window)) {
    return () => {}
  }

  const capture = () => {
    if (!store.getEnabled()) return
    const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined
    if (nav) store.setPageNavigation(navigationEntryToSummary(nav))
  }

  if (document.readyState === 'complete') {
    capture()
  } else {
    window.addEventListener('load', capture, { once: true })
  }

  return () => {
    window.removeEventListener('load', capture)
  }
}
