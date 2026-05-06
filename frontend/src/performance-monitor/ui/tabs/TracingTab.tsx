import { useState } from 'react'
import type { DerivedMetrics } from '../../core/types'
import { overlayStyles as styles } from '../overlay-styles'
import { TraceItem } from './shared'

export function TracingTab({ derived }: { derived: DerivedMetrics }) {
  const [showInfo, setShowInfo] = useState(false)

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ marginBottom: '24px', paddingBottom: '16px', borderBottom: '1px solid #303030' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <h3 style={{ color: '#fff', margin: 0, fontSize: '15px', fontWeight: '700' }}>Trace-style view</h3>
          <button type="button" onClick={() => setShowInfo(!showInfo)} style={styles.infoToggle}>
            {showInfo ? 'Hide' : 'Info'}
          </button>
        </div>
        {showInfo ? (
          <div style={styles.infoBox}>
            <div style={styles.infoText}>
              Layers are <strong>illustrative</strong> splits of total fetch time for demos. Real distributed tracing
              would need server correlation IDs.
            </div>
          </div>
        ) : null}
      </div>
      {derived.apiCalls.slice(0, 5).map((call) => (
        <TraceItem key={call.id} call={call} />
      ))}
      {derived.apiCalls.length === 0 ? <div style={styles.emptyState}>No traces yet.</div> : null}
    </div>
  )
}
