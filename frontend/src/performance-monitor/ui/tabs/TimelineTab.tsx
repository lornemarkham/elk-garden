import { useState } from 'react'
import type { DerivedMetrics } from '../../core/types'
import { requestKindLabel } from './shared'
import { overlayStyles as styles } from '../overlay-styles'

export function TimelineTab({ derived }: { derived: DerivedMetrics }) {
  const [showInfo, setShowInfo] = useState(false)
  const chronological = [...derived.apiCalls].sort((a, b) => a.startTime - b.startTime)

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ marginBottom: '24px', paddingBottom: '16px', borderBottom: '1px solid #303030' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <h3 style={{ color: '#fff', margin: 0, fontSize: '15px', fontWeight: '700' }}>Timeline</h3>
          <button type="button" onClick={() => setShowInfo(!showInfo)} style={styles.infoToggle}>
            {showInfo ? 'Hide' : 'Info'}
          </button>
        </div>
        {showInfo ? (
          <div style={styles.infoBox}>
            <div style={styles.infoText}>
              Chronological by <code>performance.now()</code> start time. Wall clock shown when the call settled.
            </div>
          </div>
        ) : null}
      </div>
      {chronological.map((call, index) => (
        <div
          key={call.id}
          style={{
            display: 'flex',
            marginBottom: '16px',
            paddingBottom: '16px',
            borderBottom: index < chronological.length - 1 ? '1px solid #2a2a2a' : 'none',
          }}
        >
          <div style={{ minWidth: '88px', color: '#8c8c8c', fontSize: '12px', paddingRight: '16px' }}>
            {call.settledAtMs != null ? new Date(call.settledAtMs).toLocaleTimeString() : '…'}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ color: '#fff', marginBottom: '4px', fontSize: '13px' }}>
              <span
                style={{
                  display: 'inline-block',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  backgroundColor:
                    call.method === 'GET' ? '#1890ff' : call.method === 'POST' ? '#52c41a' : '#faad14',
                  marginRight: '8px',
                  fontSize: '11px',
                  fontWeight: '600',
                }}
              >
                {call.method}
              </span>
              {call.url}
            </div>
            <div style={{ color: '#8c8c8c', fontSize: '12px' }}>
              {(call.durationMs ?? 0).toFixed(0)}ms • {call.status ?? '—'} • {requestKindLabel(call.requestKind)}
            </div>
          </div>
        </div>
      ))}
      {chronological.length === 0 ? <div style={styles.emptyState}>No timeline data.</div> : null}
    </div>
  )
}
