import { useState } from 'react'
import { buildPerfTraceLogsUrl } from '../../config/traceLogsUrl'
import type { ApiCallEvent, CallOrigin, RequestKind, SLOMetricRow } from '../../core/types'
import { isCallFailed } from '../../core/types'
import { overlayStyles as styles } from '../overlay-styles'

const ORIGIN_LABEL: Record<CallOrigin, string> = {
  api_backend: 'API',
  same_origin: 'App',
  third_party: '3rd party',
  unknown: '?',
}

export function originLabel(o: CallOrigin): string {
  return ORIGIN_LABEL[o]
}

export function requestKindLabel(k: RequestKind): string {
  switch (k) {
    case 'frontend':
      return 'Frontend'
    case 'api':
      return 'API'
    case 'external':
      return 'External'
    default:
      return 'Unknown'
  }
}

/** Chip text aligned with Iframes tab: API/BFF for startup context. */
export function requestKindWaterfallLabel(k: RequestKind): string {
  if (k === 'api') return 'API/BFF'
  return requestKindLabel(k)
}

export function requestKindBadgeColors(k: RequestKind): { backgroundColor: string; color: string } {
  switch (k) {
    case 'api':
      return { backgroundColor: 'rgba(82, 196, 26, 0.14)', color: '#95de64' }
    case 'frontend':
      return { backgroundColor: 'rgba(24, 144, 255, 0.12)', color: '#69c0ff' }
    case 'external':
      return { backgroundColor: 'rgba(250, 173, 20, 0.14)', color: '#ffc069' }
    default:
      return { backgroundColor: 'rgba(140, 140, 140, 0.18)', color: '#bfbfbf' }
  }
}

export function originColor(o: CallOrigin): string {
  switch (o) {
    case 'api_backend':
      return '#52c41a'
    case 'same_origin':
      return '#1890ff'
    case 'third_party':
      return '#faad14'
    default:
      return '#8c8c8c'
  }
}

export function SLOMetricItem({ metric }: { metric: SLOMetricRow }) {
  const formatValue = (value: number, unit: SLOMetricRow['config']['unit']): string => {
    switch (unit) {
      case 'percent':
        return `${value.toFixed(1)}%`
      case 'milliseconds':
        return `${value.toFixed(0)}ms`
      case 'ratio':
        return value.toFixed(2)
      default:
        return String(value)
    }
  }

  const color = metric.isViolating
    ? metric.config.critical
      ? '#ff4d4f'
      : '#faad14'
    : '#52c41a'

  return (
    <div
      style={{
        padding: '12px 14px',
        backgroundColor: metric.isViolating ? 'rgba(255, 77, 79, 0.12)' : 'rgba(82, 196, 26, 0.1)',
        borderLeft: `4px solid ${color}`,
        marginBottom: '10px',
        borderRadius: '6px',
      }}
    >
      <div style={{ fontSize: '12px', fontWeight: '600', color: '#fff', marginBottom: '6px' }}>
        {metric.config.name}
      </div>
      <div style={{ fontSize: '11px', color: '#8c8c8c', marginBottom: '8px' }}>
        {metric.config.description}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <div style={{ fontSize: '20px', fontWeight: '700', color }}>{formatValue(metric.currentValue, metric.config.unit)}</div>
        <div style={{ fontSize: '11px', color: '#8c8c8c', textAlign: 'right' }}>
          Target: {formatValue(metric.config.target, metric.config.unit)}
        </div>
      </div>
    </div>
  )
}

export type WaterfallStartupPhase = 'before' | 'after' | 'inflight'

export function WaterfallItem({
  call,
  startupPhase,
  startupCritical = false,
  isNewlyAdded = false,
}: {
  call: ApiCallEvent
  /** When set, row is in “startup waterfall” mode with phase badges and API/BFF label. */
  startupPhase?: WaterfallStartupPhase
  /** Strong emphasis: API/BFF-style request completed before iframe-ready */
  startupCritical?: boolean
  /** Brief highlight when the row first appears (Startup waterfall demos). */
  isNewlyAdded?: boolean
}) {
  const [traceCopyHint, setTraceCopyHint] = useState(false)
  const maxDuration = 2000
  const duration = call.durationMs ?? 0
  const percentage = Math.min((duration / maxDuration) * 100, 100)
  const failed = isCallFailed(call)
  const barColor = failed
    ? 'linear-gradient(90deg, #ff4d4f 0%, #a8071a 100%)'
    : duration < 100
      ? '#52c41a'
      : duration < 500
        ? '#faad14'
        : '#ff4d4f'
  const startupMode = startupPhase != null
  const kindLabel = startupMode ? requestKindWaterfallLabel(call.requestKind) : requestKindLabel(call.requestKind)

  const failedBadge = failed ? (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        flexShrink: 0,
        padding: '2px 7px',
        borderRadius: '4px',
        fontSize: '9px',
        fontWeight: 800,
        letterSpacing: '0.05em',
        textTransform: 'uppercase' as const,
        background: 'rgba(255, 77, 79, 0.22)',
        color: '#ffccc7',
        border: '1px solid rgba(255, 77, 79, 0.65)',
        whiteSpace: 'nowrap',
      }}
    >
      <span style={{ fontSize: 11, lineHeight: 1 }} aria-hidden>
        ❌
      </span>
      Failed
    </span>
  ) : null

  const phaseBadge =
    startupPhase === 'before' ? (
      <span
        style={{
          display: 'inline-flex',
          flexShrink: 0,
          padding: '2px 7px',
          borderRadius: '4px',
          fontSize: '9px',
          fontWeight: 700,
          letterSpacing: '0.04em',
          textTransform: 'uppercase' as const,
          background: 'rgba(54, 207, 201, 0.2)',
          color: '#36cfc9',
          border: '1px solid rgba(54, 207, 201, 0.45)',
          whiteSpace: 'nowrap',
        }}
      >
        Before ready
      </span>
    ) : startupPhase === 'after' ? (
      <span
        style={{
          display: 'inline-flex',
          flexShrink: 0,
          padding: '2px 7px',
          borderRadius: '4px',
          fontSize: '9px',
          fontWeight: 700,
          letterSpacing: '0.04em',
          textTransform: 'uppercase' as const,
          background: 'rgba(140, 140, 140, 0.2)',
          color: '#bfbfbf',
          border: '1px solid #434343',
          whiteSpace: 'nowrap',
        }}
      >
        After ready
      </span>
    ) : startupPhase === 'inflight' ? (
      <span
        style={{
          display: 'inline-flex',
          flexShrink: 0,
          padding: '2px 7px',
          borderRadius: '4px',
          fontSize: '9px',
          fontWeight: 700,
          letterSpacing: '0.04em',
          textTransform: 'uppercase' as const,
          background: 'rgba(250, 173, 20, 0.12)',
          color: '#ffc069',
          border: '1px solid rgba(250, 173, 20, 0.35)',
          whiteSpace: 'nowrap',
        }}
      >
        In flight
      </span>
    ) : null

  const durationRight = `${duration.toFixed(0)}ms${failed ? ' · failed' : ''}${
    failed && call.status != null ? ` · HTTP ${call.status}` : ''
  }`

  const rowClass = isNewlyAdded ? 'perf-waterfall-row--new' : undefined
  const traceLogsUrl = call.traceId ? buildPerfTraceLogsUrl(call.traceId) : null

  const copyTraceId = async () => {
    if (!call.traceId) return
    try {
      await navigator.clipboard.writeText(call.traceId)
      setTraceCopyHint(true)
      window.setTimeout(() => setTraceCopyHint(false), 2000)
    } catch {
      /* clipboard denied or unavailable */
    }
  }

  return (
    <div
      className={rowClass}
      style={{
        marginBottom: '16px',
        padding: '12px',
        backgroundColor: failed
          ? 'rgba(255, 77, 79, 0.11)'
          : startupCritical
            ? 'rgba(54, 207, 201, 0.08)'
            : '#1a1a1a',
        borderRadius: '8px',
        boxShadow: failed ? 'inset 0 0 0 1px rgba(255, 77, 79, 0.12)' : undefined,
        border: `1px solid ${
          failed ? 'rgba(255, 77, 79, 0.6)' : startupCritical ? 'rgba(54, 207, 201, 0.4)' : '#303030'
        }`,
        borderLeft: failed ? '4px solid #ff4d4f' : startupCritical ? '3px solid #36cfc9' : undefined,
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: '8px', fontSize: '12px' }}>
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: '6px 8px',
          }}
        >
          {failedBadge}
          {phaseBadge}
          <span
            style={{
              display: 'inline-flex',
              padding: '2px 6px',
              borderRadius: '4px',
              backgroundColor:
                call.method === 'GET' ? '#1890ff' : call.method === 'POST' ? '#52c41a' : '#faad14',
              fontSize: '10px',
              fontWeight: '700',
              flexShrink: 0,
            }}
          >
            {call.method}
          </span>
          <span
            style={{
              display: 'inline-flex',
              padding: '2px 6px',
              borderRadius: '4px',
              fontSize: '10px',
              fontWeight: '600',
              flexShrink: 0,
              ...requestKindBadgeColors(call.requestKind),
            }}
          >
            {kindLabel}
          </span>
        </div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: 12,
            minWidth: 0,
          }}
        >
          <span
            style={{
              color: '#fff',
              fontWeight: '600',
              flex: 1,
              minWidth: 0,
              overflowWrap: 'anywhere',
              wordBreak: 'break-word',
              lineHeight: 1.35,
            }}
          >
            {call.url}
          </span>
          <span
            style={{
              color: failed ? '#ffccc7' : duration < 100 ? '#52c41a' : duration < 500 ? '#faad14' : '#ff4d4f',
              fontWeight: '700',
              textAlign: 'right',
              flexShrink: 0,
              whiteSpace: 'nowrap',
              lineHeight: 1.35,
            }}
          >
            {durationRight}
          </span>
        </div>
        {call.traceId ? (
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              gap: '6px 10px',
              fontSize: 10,
              color: '#737373',
              lineHeight: 1.35,
            }}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
              <span style={{ flexShrink: 0 }}>trace:</span>
              <button
                type="button"
                onClick={() => void copyTraceId()}
                title="Copy trace ID"
                style={{
                  margin: 0,
                  padding: 0,
                  border: 'none',
                  background: 'none',
                  cursor: 'pointer',
                  color: '#a3a3a3',
                  textDecoration: 'underline dotted',
                  textUnderlineOffset: 2,
                  overflowWrap: 'anywhere',
                  textAlign: 'left',
                  font: 'inherit',
                  fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', monospace",
                  fontSize: 10,
                }}
              >
                {call.traceId}
              </button>
            </span>
            {traceLogsUrl ? (
              <a
                href={traceLogsUrl}
                target="_blank"
                rel="noreferrer"
                style={{ color: '#69c0ff', flexShrink: 0, textDecoration: 'none' }}
              >
                View trace
              </a>
            ) : null}
            {traceCopyHint ? (
              <span style={{ color: '#95de64', flexShrink: 0 }}>Copied trace ID</span>
            ) : null}
          </div>
        ) : null}
      </div>
      {failed && startupPhase === 'before' ? (
        <div
          style={{
            fontSize: 10,
            color: '#ff9c9c',
            marginBottom: 10,
            lineHeight: 1.45,
            overflowWrap: 'anywhere',
          }}
        >
          Failed during startup window (before iframe-ready). Parent-observed only — not proof the embed caused it.
        </div>
      ) : null}
      <div
        style={{
          width: '100%',
          height: '28px',
          backgroundColor: failed ? 'rgba(20, 0, 0, 0.85)' : '#0f0f0f',
          borderRadius: '6px',
          overflow: 'hidden',
          border: failed ? '1px solid rgba(255, 77, 79, 0.35)' : '1px solid #2a2a2a',
        }}
      >
        <div
          style={{
            width: `${percentage}%`,
            height: '100%',
            background: barColor,
            borderRadius: '4px',
          }}
        />
      </div>
    </div>
  )
}

function traceFractions(seed: string, total: number) {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h + seed.charCodeAt(i) * (i + 1)) % 997
  const next = () => {
    h = (h * 31 + 17) % 1000
    return h / 1000
  }
  const weights = [0.15, 0.25, 0.3, 0.3]
  return {
    network: total * weights[0] * (0.8 + 0.4 * next()),
    api: total * weights[1] * (0.8 + 0.4 * next()),
    service: total * weights[2] * (0.8 + 0.4 * next()),
    database: total * weights[3] * (0.8 + 0.4 * next()),
  }
}

export function TraceItem({ call }: { call: ApiCallEvent }) {
  const total = call.durationMs ?? 0
  const b = traceFractions(call.id, total)
  const ok = call.status != null && call.status >= 200 && call.status < 300 && !call.errorMessage

  return (
    <div
      style={{
        marginBottom: '16px',
        padding: '18px',
        backgroundColor: '#1a1a1a',
        borderRadius: '8px',
        border: '1px solid #303030',
        borderLeft: `4px solid ${ok ? '#52c41a' : '#ff4d4f'}`,
      }}
    >
      <div style={{ color: '#8c8c8c', fontSize: '11px', marginBottom: '8px' }}>
        Illustrative layer split (not measured end-to-end) — total is from HTTP client timing (fetch/XHR).
      </div>
      <div style={{ color: '#fff', fontWeight: '600', marginBottom: '12px' }}>
        {call.method} {call.url}
      </div>
      <div style={{ marginLeft: '0px', fontSize: '12px' }}>
        <div style={{ marginBottom: '8px' }}>
          <span style={{ color: '#1890ff' }}>→</span>
          <span style={{ color: '#fff', marginLeft: '8px' }}>Browser / network</span>
          <span style={{ color: '#8c8c8c', marginLeft: '8px' }}>~{b.network.toFixed(0)}ms</span>
        </div>
        <div style={{ marginLeft: '20px', marginBottom: '8px' }}>
          <span style={{ color: '#52c41a' }}>→</span>
          <span style={{ color: '#fff', marginLeft: '8px' }}>API edge</span>
          <span style={{ color: '#8c8c8c', marginLeft: '8px' }}>~{b.api.toFixed(0)}ms</span>
        </div>
        <div style={{ marginLeft: '40px', marginBottom: '8px' }}>
          <span style={{ color: '#faad14' }}>→</span>
          <span style={{ color: '#fff', marginLeft: '8px' }}>Application</span>
          <span style={{ color: '#8c8c8c', marginLeft: '8px' }}>~{b.service.toFixed(0)}ms</span>
        </div>
        <div style={{ marginLeft: '60px' }}>
          <span style={{ color: '#ff4d4f' }}>→</span>
          <span style={{ color: '#fff', marginLeft: '8px' }}>Data / persistence</span>
          <span style={{ color: '#8c8c8c', marginLeft: '8px' }}>~{b.database.toFixed(0)}ms</span>
        </div>
      </div>
      <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #2a2a2a', fontSize: '12px' }}>
        <span style={{ color: '#8c8c8c' }}>HTTP total: </span>
        <span style={{ color: '#fff', fontWeight: '600' }}>{total.toFixed(0)}ms</span>
      </div>
    </div>
  )
}

export function ApiCallItem({ call }: { call: ApiCallEvent }) {
  const [isExpanded, setIsExpanded] = useState(false)
  const baseUrl = call.url.split('?')[0]
  const queryString = call.url.includes('?') ? call.url.split('?')[1] : null

  const statusDisplay =
    call.errorMessage && call.status == null ? 'ERR' : call.status != null ? String(call.status) : '…'

  const getStatusColor = (status: number | undefined, err?: string) => {
    if (err && status == null) return '#ff4d4f'
    if (status == null) return '#faad14'
    if (status >= 200 && status < 300) return '#52c41a'
    if (status >= 400) return '#ff4d4f'
    return '#faad14'
  }

  const getDurationColor = (duration: number) => {
    if (duration < 100) return '#52c41a'
    if (duration < 500) return '#faad14'
    return '#ff4d4f'
  }

  const getMethodColor = (method: string) => {
    switch (method) {
      case 'GET':
        return '#1890ff'
      case 'POST':
        return '#52c41a'
      case 'PUT':
        return '#faad14'
      case 'DELETE':
        return '#ff4d4f'
      default:
        return '#8c8c8c'
    }
  }

  return (
    <div style={styles.callItem}>
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        style={{ ...styles.callHeader, border: 'none', width: '100%', background: 'transparent' }}
      >
        <div style={styles.callMethod}>
          <span style={{ ...styles.methodBadge, backgroundColor: getMethodColor(call.method) }}>{call.method}</span>
          <span
            style={{
              ...styles.originBadge,
              backgroundColor: '#434343',
              fontSize: '9px',
              textTransform: 'uppercase',
            }}
          >
            {call.source}
          </span>
          <span
            style={{
              ...styles.originBadge,
              fontSize: '10px',
              fontWeight: '600',
              ...requestKindBadgeColors(call.requestKind),
            }}
          >
            {requestKindLabel(call.requestKind)}
          </span>
        </div>
        <div style={styles.callUrl}>
          <div style={styles.baseUrl}>{baseUrl}</div>
          {queryString ? <div style={styles.queryString}>?{queryString}</div> : null}
        </div>
        <div style={styles.callMeta}>
          <span style={{ ...styles.statusBadge, color: getStatusColor(call.status, call.errorMessage) }}>
            {statusDisplay}
          </span>
          <span
            style={{
              ...styles.durationBadge,
              color: getDurationColor(call.durationMs ?? 0),
            }}
          >
            {call.durationMs != null ? call.durationMs.toFixed(0) : '—'}ms
          </span>
          <span style={styles.expandIcon}>{isExpanded ? '▼' : '\u25B6'}</span>
        </div>
      </button>

      {isExpanded ? (
        <div style={styles.callDetails}>
          <div style={styles.detailRow}>
            <strong>Source:</strong> {call.source}
          </div>
          <div style={styles.detailRow}>
            <strong>Request target:</strong> {call.requestKind} ({requestKindLabel(call.requestKind)})
          </div>
          <div style={styles.detailRow}>
            <strong>Origin class (legacy):</strong> {call.callOrigin}
          </div>
          <div style={styles.detailRow}>
            <strong>Full URL:</strong> {call.url}
          </div>
          {call.errorMessage ? (
            <div
              style={{
                marginTop: '12px',
                padding: '12px',
                backgroundColor: 'rgba(255, 77, 79, 0.1)',
                borderRadius: '6px',
                borderLeft: '3px solid #ff4d4f',
                color: '#d9d9d9',
                fontSize: '11px',
              }}
            >
              <strong style={{ color: '#ff4d4f' }}>Error</strong>
              <div style={{ marginTop: '6px' }}>{call.errorMessage}</div>
            </div>
          ) : null}
          {call.status != null && call.status >= 400 ? (
            <div style={{ marginTop: '12px', fontSize: '11px', color: '#ff4d4f' }}>
              HTTP {call.status} — check Network tab and server logs.
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
