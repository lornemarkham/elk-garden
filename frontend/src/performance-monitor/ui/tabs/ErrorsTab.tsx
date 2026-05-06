import { useState } from 'react'
import type { ApiCallEvent, DerivedMetrics } from '../../core/types'
import { isCallFailed } from '../../core/types'
import { overlayStyles as styles } from '../overlay-styles'

export function ErrorsTab({ derived }: { derived: DerivedMetrics }) {
  const [showInfo, setShowInfo] = useState(false)
  const errorCalls = derived.apiCalls.filter(isCallFailed)
  const grouped = new Map<string, ApiCallEvent[]>()
  for (const call of errorCalls) {
    const key = `${call.status ?? 'net'}:${call.errorMessage ?? ''}:${call.url.split('?')[0]}`
    const list = grouped.get(key) ?? []
    list.push(call)
    grouped.set(key, list)
  }

  const clientErrs = derived.clientErrors

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ marginBottom: '24px', paddingBottom: '16px', borderBottom: '1px solid #303030' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <h3 style={{ color: '#fff', margin: 0, fontSize: '15px', fontWeight: '700' }}>Errors</h3>
          <button type="button" onClick={() => setShowInfo(!showInfo)} style={styles.infoToggle}>
            {showInfo ? 'Hide' : 'Info'}
          </button>
        </div>
        {showInfo ? (
          <div style={styles.infoBox}>
            <div style={styles.infoText}>
              Failed HTTP calls come from fetch/XHR instrumentation. Client errors below are from{' '}
              <code>window.onerror</code> and <code>unhandledrejection</code> — useful for crashes independent of
              network.
            </div>
          </div>
        ) : null}
      </div>

      {clientErrs.length > 0 ? (
        <div style={{ marginBottom: '28px' }}>
          <h4 style={{ color: '#fff', fontSize: '13px', margin: '0 0 12px' }}>Client runtime ({clientErrs.length})</h4>
          {clientErrs.map((e) => (
            <div
              key={e.id}
              style={{
                padding: '14px 16px',
                backgroundColor: 'rgba(250, 173, 20, 0.08)',
                borderRadius: '8px',
                marginBottom: '10px',
                border: '1px solid rgba(250, 173, 20, 0.35)',
                borderLeft: '4px solid #faad14',
              }}
            >
              <div style={{ fontSize: '11px', color: '#8c8c8c', marginBottom: '6px' }}>
                {new Date(e.timestampMs).toLocaleTimeString()} · {e.source}
              </div>
              <div style={{ color: '#fff', fontSize: '12px', wordBreak: 'break-word' }}>{e.message}</div>
              {e.stack ? (
                <pre
                  style={{
                    marginTop: '10px',
                    fontSize: '10px',
                    color: '#a6a6a6',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-all',
                    maxHeight: '120px',
                    overflow: 'auto',
                  }}
                >
                  {e.stack}
                </pre>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}

      <h4 style={{ color: '#fff', fontSize: '13px', margin: '0 0 12px' }}>Failed HTTP calls</h4>
      {[...grouped.entries()].map(([key, calls]) => (
        <div
          key={key}
          style={{
            padding: '16px 18px',
            backgroundColor: 'rgba(255, 77, 79, 0.08)',
            borderRadius: '8px',
            marginBottom: '12px',
            border: '1px solid rgba(255, 77, 79, 0.3)',
            borderLeft: '4px solid #ff4d4f',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <div style={{ color: '#fff', fontWeight: '600', fontSize: '12px', wordBreak: 'break-all' }}>{key}</div>
            <div style={{ color: '#ff4d4f', fontWeight: '600' }}>{calls.length}×</div>
          </div>
        </div>
      ))}
      {errorCalls.length === 0 && clientErrs.length === 0 ? (
        <div style={styles.emptyState}>No client or HTTP errors recorded in this session.</div>
      ) : null}
      {errorCalls.length === 0 && clientErrs.length > 0 ? (
        <div style={{ ...styles.emptyState, marginTop: '8px' }}>No failed HTTP calls.</div>
      ) : null}
    </div>
  )
}
