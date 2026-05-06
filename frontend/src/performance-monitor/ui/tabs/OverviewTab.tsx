import { useState } from 'react'
import type { DerivedMetrics, SLOSnapshot } from '../../core/types'
import { overlayStyles as styles } from '../overlay-styles'
import {
  ApiCallItem,
  originColor,
  originLabel,
  requestKindBadgeColors,
  requestKindLabel,
  SLOMetricItem,
} from './shared'
import type { CallOrigin, RequestKind } from '../../core/types'

type Props = {
  derived: DerivedMetrics
  slo: SLOSnapshot
  sessionStartedAtMs: number
  onAnalyze: () => void
  isAnalyzing: boolean
  aiText: string | null
  showAi: boolean
  setShowAi: (v: boolean) => void
}

const ORIGINS: CallOrigin[] = ['api_backend', 'same_origin', 'third_party', 'unknown']

const REQUEST_KIND_ORDER: RequestKind[] = ['api', 'frontend', 'external', 'unknown']

export function OverviewTab({
  derived,
  slo,
  sessionStartedAtMs,
  onAnalyze,
  isAnalyzing,
  aiText,
  showAi,
  setShowAi,
}: Props) {
  const [showSlo, setShowSlo] = useState(true)
  const uptimeSec = Math.floor((Date.now() - sessionStartedAtMs) / 1000)

  const healthColor =
    derived.health.level === 'good' ? '#52c41a' : derived.health.level === 'warning' ? '#faad14' : '#ff4d4f'

  const sloBadgeColor =
    slo.overallHealth === 'healthy' ? '#52c41a' : slo.overallHealth === 'warning' ? '#faad14' : '#ff4d4f'

  const mockAnalysisLines = aiText?.split('\n') ?? []

  return (
    <>
      <div
        style={{
          margin: '0 16px 12px',
          padding: '12px 14px',
          backgroundColor: 'rgba(24, 144, 255, 0.08)',
          border: '1px solid rgba(24, 144, 255, 0.35)',
          borderRadius: '8px',
          fontSize: '11px',
          lineHeight: 1.5,
          color: '#bfbfbf',
        }}
      >
        <strong style={{ color: '#fff' }}>Why calls can be empty:</strong> Dashboard, zones, and profile use local /
        mock data — no network. <strong style={{ color: '#fff' }}>Enable the monitor before opening Tasks</strong> so
        the automatic <code style={{ color: '#8c8c8c' }}>/api/tasks/generate</code> run is instrumented. Plan / Ask
        ELK &quot;generate&quot; uses <code style={{ color: '#8c8c8c' }}>/api/plans/build</code>.
      </div>

      {derived.pageNavigation ? (
        <div style={{ padding: '0 16px 16px', borderBottom: '1px solid #303030' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: '#fff', marginBottom: '8px' }}>
            Full page load (Navigation Timing — not SPA route changes)
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr auto',
              gap: '6px 16px',
              fontSize: '11px',
              color: '#8c8c8c',
            }}
          >
            <span>Type</span>
            <span style={{ color: '#fff', textAlign: 'right' }}>{derived.pageNavigation.navigationType}</span>
            <span>Total duration</span>
            <span style={{ color: '#fff', textAlign: 'right' }}>
              {derived.pageNavigation.durationMs.toFixed(0)}ms
            </span>
            <span>Request → first byte</span>
            <span style={{ color: '#fff', textAlign: 'right' }}>
              {derived.pageNavigation.requestToFirstByteMs.toFixed(0)}ms
            </span>
            <span>Response download</span>
            <span style={{ color: '#fff', textAlign: 'right' }}>
              {derived.pageNavigation.responseDownloadMs.toFixed(0)}ms
            </span>
            <span>DOMContentLoaded</span>
            <span style={{ color: '#fff', textAlign: 'right' }}>
              {derived.pageNavigation.domContentLoadedMs.toFixed(0)}ms
            </span>
          </div>
        </div>
      ) : null}

      <div style={styles.stats}>
        <div style={styles.statBox}>
          <div style={styles.statLabel}>HTTP calls</div>
          <div style={styles.statValue}>{derived.totalCalls}</div>
        </div>
        <div style={styles.statBox}>
          <div style={styles.statLabel}>Failed</div>
          <div style={{ ...styles.statValue, color: derived.failedCalls ? '#ff4d4f' : '#52c41a' }}>
            {derived.failedCalls}
          </div>
        </div>
        <div style={styles.statBox}>
          <div style={styles.statLabel}>Mean time</div>
          <div style={styles.statValue}>
            {derived.meanDurationMs > 0 ? `${derived.meanDurationMs.toFixed(0)}ms` : '—'}
          </div>
        </div>
        <div style={styles.statBox}>
          <div style={styles.statLabel}>Slowest</div>
          <div style={styles.statValue}>
            {derived.slowest?.durationMs != null ? `${derived.slowest.durationMs.toFixed(0)}ms` : '—'}
          </div>
        </div>
      </div>

      <div style={{ padding: '12px 16px', borderBottom: '1px solid #303030' }}>
        <div style={{ ...styles.originLabel, marginBottom: '10px' }}>Request target (URL rules)</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px', fontSize: '12px', alignItems: 'center' }}>
          {REQUEST_KIND_ORDER.map((k) => (
            <span key={k} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <span
                style={{
                  padding: '2px 8px',
                  borderRadius: '999px',
                  fontWeight: 600,
                  fontSize: '11px',
                  ...requestKindBadgeColors(k),
                }}
              >
                {requestKindLabel(k)}
              </span>
              <span style={{ color: '#fff', fontWeight: 700 }}>{derived.countsByRequestKind[k]}</span>
            </span>
          ))}
        </div>
        <div style={{ fontSize: '10px', color: '#666', marginTop: '8px', lineHeight: 1.4 }}>
          API: path <code style={{ color: '#8c8c8c' }}>/api/…</code> or API base origin · Frontend: same host as this
          page, not API · External: other hosts
        </div>
      </div>

      <div style={{ padding: '12px 16px', borderBottom: '1px solid #303030', fontSize: '12px', color: '#8c8c8c' }}>
        <strong style={{ color: '#fff' }}>Session health:</strong>{' '}
        <span style={{ color: healthColor, fontWeight: 700 }}>{derived.health.level}</span>
        {' — '}
        {derived.health.headline}
        {derived.health.hints.length > 0 ? (
          <ul style={{ margin: '8px 0 0', paddingLeft: '18px' }}>
            {derived.health.hints.map((h) => (
              <li key={h}>{h}</li>
            ))}
          </ul>
        ) : null}
      </div>

      <div style={styles.originBreakdown}>
        <div style={styles.originLabel}>Calls by origin (rule-based)</div>
        <div style={styles.originStats}>
          {ORIGINS.map((o) => (
            <div key={o} style={styles.originStat}>
              <span style={{ ...styles.originBadge, backgroundColor: originColor(o) }}>{originLabel(o)}</span>
              <span style={styles.originCount}>{derived.countsByOrigin[o]}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={styles.sloSection}>
        <div style={styles.sloHeader}>
          <span style={styles.sloTitle}>SLO snapshot (simple metrics)</span>
          <span style={{ ...styles.sloBadge, backgroundColor: sloBadgeColor }}>{slo.overallHealth}</span>
          {slo.violatingCount > 0 ? (
            <span style={styles.violationBadge}>{slo.violatingCount} off-target</span>
          ) : null}
          <button type="button" onClick={() => setShowSlo(!showSlo)} style={styles.toggleButton}>
            {showSlo ? '▼' : '▶'}
          </button>
        </div>
        {showSlo ? (
          <>
            {derived.totalCalls === 0 ? (
              <div style={{ fontSize: '11px', color: '#8c8c8c', marginBottom: '12px', lineHeight: 1.5 }}>
                With zero HTTP calls, success/error rate SLOs are placeholders — trigger Tasks or plan generation to get
                real values.
              </div>
            ) : null}
            <div style={styles.sloMetrics}>
              {slo.metrics.map((m) => (
                <SLOMetricItem key={m.config.id} metric={m} />
              ))}
            </div>
          </>
        ) : null}
      </div>

      <div style={styles.aiSection}>
        <div style={styles.aiExplainer}>
          <div style={{ fontSize: '12px', fontWeight: '600', marginBottom: '6px', color: '#141414' }}>
            Heuristic tips (not live AI)
          </div>
          <div style={{ fontSize: '11px', lineHeight: '1.5', color: '#595959' }}>
            Generates plain-English suggestions from the current session stats — useful for demos and
            walkthroughs.
          </div>
        </div>
        <button
          type="button"
          onClick={onAnalyze}
          disabled={isAnalyzing}
          style={{
            ...styles.aiButton,
            opacity: isAnalyzing ? 0.6 : 1,
            cursor: isAnalyzing ? 'not-allowed' : 'pointer',
          }}
        >
          {isAnalyzing ? 'Working…' : 'Generate tips from session'}
        </button>
        {showAi && aiText ? (
          <div style={styles.aiPanel}>
            <div style={styles.aiHeader}>
              <span>Tips</span>
              <button type="button" onClick={() => setShowAi(false)} style={styles.closeButton}>
                ✕
              </button>
            </div>
            <div style={styles.aiContent}>
              {mockAnalysisLines.map((line, i) => (
                <div key={i} style={{ marginBottom: '4px' }}>
                  {line}
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      <div style={styles.callsList}>
        <div style={styles.callsHeader}>
          <strong>Recent calls</strong>
        </div>
        {derived.apiCalls.slice(0, 20).map((call) => (
          <ApiCallItem key={call.id} call={call} />
        ))}
        {derived.apiCalls.length === 0 ? (
          <div style={styles.emptyState}>No HTTP calls recorded yet (fetch / XHR).</div>
        ) : null}
      </div>

      <div style={{ padding: '8px 16px 16px', fontSize: '11px', color: '#666' }}>
        Session uptime: {uptimeSec}s
      </div>
    </>
  )
}
