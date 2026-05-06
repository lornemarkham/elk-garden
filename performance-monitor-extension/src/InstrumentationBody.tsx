import type { RequestKind } from './bridge-protocol'
import {
  resetInstrumentation,
  setRecordingPaused,
  useInstrumentation,
} from './instrumentation-store'
import { useCallback, useMemo, useState } from 'react'

function shorten(text: string, max: number): string {
  if (text.length <= max) return text
  return `${text.slice(0, max - 1)}…`
}

function statusLabel(status: number | null, success: boolean): string {
  if (status == null) return success ? '—' : 'ERR'
  return String(status)
}

function kindLabel(k: RequestKind): string {
  switch (k) {
    case 'api-bff':
      return 'API/BFF'
    case 'frontend':
      return 'Frontend'
    case 'external':
      return 'External'
    default:
      return 'Unknown'
  }
}

function formatClock(ms: number): string {
  try {
    return new Date(ms).toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  } catch {
    return String(ms)
  }
}

type MainTab = 'requests' | 'errors'

type RequestFilter = 'all' | 'failed' | RequestKind

export function InstrumentationBody() {
  const snap = useInstrumentation()
  const {
    recordingPaused,
    totalCalls,
    failedCalls,
    totalPageErrors,
    requests,
    errors,
  } = snap

  const [mainTab, setMainTab] = useState<MainTab>('requests')
  const [reqFilter, setReqFilter] = useState<RequestFilter>('all')

  const onPauseToggle = useCallback(() => {
    setRecordingPaused(!recordingPaused)
  }, [recordingPaused])

  const onReset = useCallback(() => {
    resetInstrumentation()
    setReqFilter('all')
    setMainTab('requests')
  }, [])

  const filteredRequests = useMemo(() => {
    if (reqFilter === 'all') return requests
    if (reqFilter === 'failed') return requests.filter((r) => !r.success)
    return requests.filter((r) => r.requestKind === reqFilter)
  }, [requests, reqFilter])

  const filterChip = (id: RequestFilter, label: string) => (
    <button
      key={id}
      type="button"
      className={`elk-perf-chip${reqFilter === id ? ' elk-perf-chip--on' : ''}`}
      onClick={() => setReqFilter(id)}
    >
      {label}
    </button>
  )

  return (
    <div className="elk-perf-instrumentation">
      <p className="elk-perf-scope-line">
        Extension · page-level instrumentation only (top-frame). No tracing, no iframe assumptions.
      </p>

      <div className="elk-perf-toolbar">
        <div className="elk-perf-toolbar-status">
          <span className={recordingPaused ? 'elk-perf-status elk-perf-status--paused' : 'elk-perf-status'}>
            {recordingPaused ? 'Paused' : 'Recording'}
          </span>
          <span className="elk-perf-toolbar-hint">
            Lists cap at 200 requests / 100 errors (oldest dropped).
          </span>
        </div>
        <div className="elk-perf-toolbar-actions">
          <button type="button" className="elk-perf-text-btn" onClick={onPauseToggle}>
            {recordingPaused ? 'Resume' : 'Pause'}
          </button>
          <button type="button" className="elk-perf-text-btn" onClick={onReset}>
            Reset session
          </button>
        </div>
      </div>

      <div className="elk-perf-stats">
        <div className="elk-perf-stat">
          <span className="elk-perf-stat-label">Total calls</span>
          <span className="elk-perf-stat-value">{totalCalls}</span>
        </div>
        <div className="elk-perf-stat">
          <span className="elk-perf-stat-label">Failed calls</span>
          <span className={`elk-perf-stat-value${failedCalls > 0 ? ' elk-perf-stat-value--warn' : ''}`}>
            {failedCalls}
          </span>
        </div>
        <div className="elk-perf-stat">
          <span className="elk-perf-stat-label">Page errors</span>
          <span className={`elk-perf-stat-value${totalPageErrors > 0 ? ' elk-perf-stat-value--warn' : ''}`}>
            {totalPageErrors}
          </span>
        </div>
      </div>

      <div className="elk-perf-tab-bar" role="tablist" aria-label="Instrumentation views">
        <button
          type="button"
          role="tab"
          aria-selected={mainTab === 'requests'}
          className={`elk-perf-tab${mainTab === 'requests' ? ' elk-perf-tab--active' : ''}`}
          onClick={() => setMainTab('requests')}
        >
          Requests
          <span className="elk-perf-tab-count">{requests.length}</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mainTab === 'errors'}
          className={`elk-perf-tab${mainTab === 'errors' ? ' elk-perf-tab--active' : ''}`}
          onClick={() => setMainTab('errors')}
        >
          Errors
          <span className="elk-perf-tab-count">{errors.length}</span>
        </button>
      </div>

      {mainTab === 'requests' ? (
        <section className="elk-perf-section">
          <div className="elk-perf-filter-row">
            {filterChip('all', 'All')}
            {filterChip('failed', 'Failed')}
            {filterChip('api-bff', 'API/BFF')}
            {filterChip('frontend', 'Frontend')}
            {filterChip('external', 'External')}
            {filterChip('unknown', 'Unknown')}
          </div>
          {filteredRequests.length === 0 ? (
            <p className="elk-perf-empty">
              {requests.length === 0
                ? 'No requests captured yet.'
                : 'No requests match this filter.'}
            </p>
          ) : (
            <ul className="elk-perf-list">
              {filteredRequests.map((r) => (
                <li
                  key={r.id}
                  className={`elk-perf-list-item elk-perf-req${r.success ? '' : ' elk-perf-req--bad'}`}
                >
                  <div className="elk-perf-req-row">
                    <span className="elk-perf-req-kind">{r.source.toUpperCase()}</span>
                    <span className={`elk-perf-kind-badge elk-perf-kind-badge--${r.requestKind}`}>
                      {kindLabel(r.requestKind)}
                    </span>
                    <span className="elk-perf-req-method">{r.method}</span>
                    <span className="elk-perf-req-status">{statusLabel(r.status, r.success)}</span>
                    <span className="elk-perf-req-ms">{r.durationMs} ms</span>
                  </div>
                  <div className="elk-perf-req-meta">
                    {formatClock(r.startTime)} → {formatClock(r.endTime)}
                  </div>
                  <div className="elk-perf-req-url" title={r.url}>
                    {shorten(r.url, 72)}
                  </div>
                  {r.error ? <div className="elk-perf-req-err">{r.error}</div> : null}
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : (
        <section className="elk-perf-section">
          <h2 className="elk-perf-section-title visually-hidden">Errors</h2>
          {errors.length === 0 ? (
            <p className="elk-perf-empty">No runtime errors or unhandled rejections yet.</p>
          ) : (
            <ul className="elk-perf-list">
              {errors.map((e) => (
                <li key={e.id} className="elk-perf-list-item elk-perf-err">
                  <div className="elk-perf-err-row">
                    <span className="elk-perf-err-src">
                      {e.type === 'runtime-error' ? 'Runtime error' : 'Unhandled rejection'}
                    </span>
                    <span className="elk-perf-err-time">{formatClock(e.timestamp)}</span>
                  </div>
                  <div className="elk-perf-err-msg">{e.message}</div>
                  {e.stack ? <pre className="elk-perf-err-detail">{shorten(e.stack, 600)}</pre> : null}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  )
}
