import { Activity } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useSearchParams } from 'react-router-dom'
import { buildDerivedMetrics, buildSloSnapshot } from '../core/selectors'
import { performanceMonitor } from '../core/performance-monitor'
import './overlay-layout.css'
import { overlayStyles as styles } from './overlay-styles'
import { ErrorsTab } from './tabs/ErrorsTab'
import { IframeDiscoveryTab } from './tabs/IframeDiscoveryTab'
import { OverviewTab } from './tabs/OverviewTab'
import { TimelineTab } from './tabs/TimelineTab'
import { TracingTab } from './tabs/TracingTab'
import { WaterfallTab } from './tabs/WaterfallTab'
import { WebVitalsTab, type WebVitalsState } from './tabs/WebVitalsTab'

type TabKey = 'overview' | 'waterfall' | 'vitals' | 'tracing' | 'errors' | 'timeline' | 'iframes'

const IFRAME_LAB_PATH = '/dev/iframe-lab'

/** URL `tab` values for `/dev/iframe-lab` (default: iframes). Also accepts `overview` for the Overview tab. */
function monitorTabFromSearchParam(raw: string | null): TabKey {
  switch (raw) {
    case 'waterfall':
      return 'waterfall'
    case 'webvitals':
      return 'vitals'
    case 'tracing':
      return 'tracing'
    case 'errors':
      return 'errors'
    case 'timeline':
      return 'timeline'
    case 'iframes':
      return 'iframes'
    case 'overview':
      return 'overview'
    default:
      return 'iframes'
  }
}

function monitorTabToSearchParam(key: TabKey): string {
  if (key === 'vitals') return 'webvitals'
  return key
}

export default function PerformanceOverlay() {
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const isIframeLab = location.pathname === IFRAME_LAB_PATH

  const tabFromIframeLabUrl = useMemo(() => {
    if (!isIframeLab) return null
    return monitorTabFromSearchParam(searchParams.get('tab'))
  }, [isIframeLab, searchParams])

  const [panelTabOffLab, setPanelTabOffLab] = useState<TabKey>(() =>
    typeof window !== 'undefined' && window.location.pathname === IFRAME_LAB_PATH
      ? monitorTabFromSearchParam(new URLSearchParams(window.location.search).get('tab'))
      : 'overview',
  )

  const effectiveTab = tabFromIframeLabUrl ?? panelTabOffLab

  const selectTab = useCallback(
    (key: TabKey) => {
      if (isIframeLab) {
        setSearchParams(
          (prev) => {
            const next = new URLSearchParams(prev)
            next.set('tab', monitorTabToSearchParam(key))
            return next
          },
          { replace: true },
        )
      } else {
        setPanelTabOffLab(key)
      }
    },
    [isIframeLab, setSearchParams],
  )

  const [state, setState] = useState(() => performanceMonitor.getState())
  const [isMinimized, setIsMinimized] = useState(false)
  const [webVitals, setWebVitals] = useState<WebVitalsState | null>(null)
  const [aiText, setAiText] = useState<string | null>(null)
  const [showAi, setShowAi] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)

  useEffect(() => performanceMonitor.subscribe(() => setState(performanceMonitor.getState())), [])

  /** Reserve horizontal space for the dock so in-flow app content does not sit under the panel. */
  useEffect(() => {
    if (typeof document === 'undefined') return
    const root = document.documentElement
    const expanded = state.enabled && !isMinimized
    if (expanded) {
      root.style.setProperty('--elk-perf-monitor-offset', 'var(--elk-perf-panel-width)')
    } else {
      root.style.removeProperty('--elk-perf-monitor-offset')
    }
    return () => {
      root.style.removeProperty('--elk-perf-monitor-offset')
    }
  }, [state.enabled, isMinimized])

  const derived = useMemo(() => buildDerivedMetrics(state), [state])
  const slo = useMemo(() => buildSloSnapshot(derived), [derived])

  useEffect(() => {
    if (typeof window === 'undefined' || !('PerformanceObserver' in window)) return

    const vitals: WebVitalsState = {
      fcp: null,
      lcp: null,
      fid: null,
      cls: null,
      ttfb: null,
    }

    const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined
    if (nav) {
      vitals.ttfb = nav.responseStart - nav.requestStart
    }

    const paints = performance.getEntriesByType('paint')
    const fcp = paints.find((e) => e.name === 'first-contentful-paint')
    if (fcp) vitals.fcp = fcp.startTime

    let lcpObserver: PerformanceObserver | null = null
    try {
      lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries()
        const last = entries[entries.length - 1] as PerformanceEntry & {
          renderTime?: number
          loadTime?: number
        }
        vitals.lcp = last.renderTime ?? last.loadTime ?? last.startTime
        setWebVitals({ ...vitals })
      })
      lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true })
    } catch {
      /* unsupported */
    }

    let fidObserver: PerformanceObserver | null = null
    try {
      fidObserver = new PerformanceObserver((list) => {
        for (const e of list.getEntries()) {
          const fe = e as PerformanceEventTiming
          vitals.fid = fe.processingStart - fe.startTime
        }
        setWebVitals({ ...vitals })
      })
      fidObserver.observe({ type: 'first-input', buffered: true })
    } catch {
      /* unsupported */
    }

    let clsObserver: PerformanceObserver | null = null
    try {
      let cls = 0
      clsObserver = new PerformanceObserver((list) => {
        for (const e of list.getEntries() as Array<PerformanceEntry & { hadRecentInput?: boolean; value?: number }>) {
          if (!e.hadRecentInput && e.value != null) cls += e.value
        }
        vitals.cls = cls
        setWebVitals({ ...vitals })
      })
      clsObserver.observe({ type: 'layout-shift', buffered: true })
    } catch {
      /* unsupported */
    }

    setWebVitals({ ...vitals })

    return () => {
      lcpObserver?.disconnect()
      fidObserver?.disconnect()
      clsObserver?.disconnect()
    }
  }, [])

  const analyze = useCallback(async () => {
    setIsAnalyzing(true)
    setShowAi(true)
    await new Promise((r) => setTimeout(r, 400))
    const lines = [
      'Session tips (heuristic)',
      '----------------',
      `- HTTP calls: ${derived.totalCalls}, failed: ${derived.failedCalls}`,
      `- Client errors (window / unhandled): ${derived.clientErrors.length}`,
      `- Mean duration (completed): ${derived.meanDurationMs.toFixed(0)}ms`,
      `- Health: ${derived.health.level} — ${derived.health.headline}`,
      '',
      'If failures spike, use the Errors tab and mirror requests in DevTools Network.',
      'If mean duration grows, check waterfall ordering and backend logs for the slowest URL.',
    ]
    setAiText(lines.join('\n'))
    setIsAnalyzing(false)
  }, [derived])

  if (!state.enabled) {
    return (
      <div style={styles.enableButton}>
        <button type="button" onClick={() => performanceMonitor.enable()} style={styles.button}>
          Enable performance monitor
        </button>
      </div>
    )
  }

  if (isMinimized) {
    return (
      <div style={styles.minimized}>
        <button
          type="button"
          onClick={() => setIsMinimized(false)}
          style={styles.minimizedLauncher}
          aria-label={
            derived.totalCalls > 0
              ? `Open monitor, ${derived.totalCalls} HTTP observations recorded`
              : 'Open performance monitor'
          }
        >
          <Activity size={16} strokeWidth={2} aria-hidden style={{ flexShrink: 0, opacity: 0.9 }} />
          <span>Monitor</span>
          {derived.totalCalls > 0 ? (
            <span style={styles.minimizedCountBadge}>{derived.totalCalls}</span>
          ) : null}
        </button>
      </div>
    )
  }

  const healthColor =
    derived.health.level === 'good' ? '#52c41a' : derived.health.level === 'warning' ? '#faad14' : '#ff4d4f'

  const iframeDetected = derived.iframeInventory.length > 0

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'waterfall', label: 'Startup waterfall' },
    { key: 'vitals', label: 'Web Vitals' },
    { key: 'tracing', label: 'Tracing' },
    { key: 'errors', label: 'Errors' },
    { key: 'timeline', label: 'Timeline' },
    { key: 'iframes', label: 'Iframes' },
  ]

  return (
    <aside className="perf-panel-dock" aria-label="Performance monitor">
      <div style={styles.header}>
        <div>
          <h3 style={styles.title}>ELK Garden · Performance</h3>
          <div style={styles.appStatus}>
            <span style={{ ...styles.healthBadge, backgroundColor: healthColor }}>{derived.health.level}</span>
            <span style={styles.uptimeText}>
              HTTP {derived.totalCalls} · failed {derived.failedCalls}
            </span>
          </div>
          <div style={styles.panelModeLine}>
            <span style={styles.panelModeLabel}>Mode:</span>{' '}
            {iframeDetected ? 'Embedded App (iframe detected)' : 'Parent App (no iframe)'}
          </div>
        </div>
        <div style={styles.headerButtons}>
          <button type="button" onClick={() => performanceMonitor.clear()} style={styles.smallButton}>
            Clear
          </button>
          <button type="button" onClick={() => setIsMinimized(true)} style={styles.smallButton}>
            Minimize
          </button>
          <button type="button" onClick={() => performanceMonitor.disable()} style={styles.smallButton}>
            Disable
          </button>
        </div>
      </div>

      <div style={styles.tabContainer}>
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            style={effectiveTab === t.key ? styles.tabActive : styles.tab}
            onClick={() => selectTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="perf-panel-dock-scroll">
        <div style={styles.tabPanel}>
          {effectiveTab === 'overview' ? (
            <OverviewTab
              derived={derived}
              slo={slo}
              sessionStartedAtMs={state.sessionStartedAtMs}
              onAnalyze={analyze}
              isAnalyzing={isAnalyzing}
              aiText={aiText}
              showAi={showAi}
              setShowAi={setShowAi}
            />
          ) : null}
          {effectiveTab === 'waterfall' ? <WaterfallTab derived={derived} /> : null}
          {effectiveTab === 'vitals' ? <WebVitalsTab vitals={webVitals} /> : null}
          {effectiveTab === 'tracing' ? <TracingTab derived={derived} /> : null}
          {effectiveTab === 'errors' ? <ErrorsTab derived={derived} /> : null}
          {effectiveTab === 'timeline' ? <TimelineTab derived={derived} /> : null}
          {effectiveTab === 'iframes' ? <IframeDiscoveryTab derived={derived} /> : null}
        </div>
      </div>
    </aside>
  )
}
