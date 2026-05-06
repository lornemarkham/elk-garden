import { useState } from 'react'
import { overlayStyles as styles } from '../overlay-styles'

export type WebVitalsState = {
  fcp: number | null
  lcp: number | null
  fid: number | null
  cls: number | null
  ttfb: number | null
}

export function WebVitalsTab({ vitals }: { vitals: WebVitalsState | null }) {
  const [showInfo, setShowInfo] = useState(false)

  if (!vitals) {
    return (
      <div style={{ padding: '20px' }}>
        <div style={styles.emptyState}>Collecting Web Vitals…</div>
      </div>
    )
  }

  const getVitalStatus = (metric: string, value: number | null) => {
    if (value === null) return { color: '#8c8c8c', status: 'N/A' as const }
    const thresholds: Record<string, { good: number; poor: number }> = {
      fcp: { good: 1800, poor: 3000 },
      lcp: { good: 2500, poor: 4000 },
      fid: { good: 100, poor: 300 },
      cls: { good: 0.1, poor: 0.25 },
      ttfb: { good: 800, poor: 1800 },
    }
    const t = thresholds[metric]
    if (!t) return { color: '#8c8c8c', status: 'Unknown' as const }
    if (value <= t.good) return { color: '#52c41a', status: 'Good' as const }
    if (value <= t.poor) return { color: '#faad14', status: 'Needs improvement' as const }
    return { color: '#ff4d4f', status: 'Poor' as const }
  }

  const metrics = [
    { key: 'fcp', name: 'First Contentful Paint (FCP)', unit: 'ms' as const },
    { key: 'lcp', name: 'Largest Contentful Paint (LCP)', unit: 'ms' as const },
    { key: 'fid', name: 'First Input Delay (FID)', unit: 'ms' as const },
    { key: 'cls', name: 'Cumulative Layout Shift (CLS)', unit: '' as const },
    { key: 'ttfb', name: 'Time to First Byte (TTFB)', unit: 'ms' as const },
  ] as const

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ marginBottom: '24px', paddingBottom: '16px', borderBottom: '1px solid #303030' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <h3 style={{ color: '#fff', margin: 0, fontSize: '15px', fontWeight: '700' }}>Web Vitals</h3>
          <button type="button" onClick={() => setShowInfo(!showInfo)} style={styles.infoToggle}>
            {showInfo ? 'Hide' : 'Info'}
          </button>
        </div>
        {showInfo ? (
          <div style={styles.infoBox}>
            <div style={styles.infoTitle}>Browser-reported UX metrics</div>
            <div style={styles.infoText}>
              Values come from the Performance API in this tab only — useful for regressions, not a full RUM
              substitute.
            </div>
          </div>
        ) : null}
      </div>
      {metrics.map((metric) => {
        const value = vitals[metric.key as keyof WebVitalsState]
        const status = getVitalStatus(metric.key, value)
        return (
          <div
            key={metric.key}
            style={{
              padding: '16px 18px',
              backgroundColor: '#1a1a1a',
              borderRadius: '8px',
              marginBottom: '12px',
              border: '1px solid #303030',
              borderLeft: `4px solid ${status.color}`,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ color: '#fff', fontWeight: '600' }}>{metric.name}</div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ color: status.color, fontSize: '22px', fontWeight: '700' }}>
                  {value !== null
                    ? metric.unit
                      ? `${value.toFixed(0)}${metric.unit}`
                      : value.toFixed(3)
                    : 'N/A'}
                </div>
                <div style={{ color: status.color, fontSize: '11px' }}>{status.status}</div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
