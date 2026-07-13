/** Last captured HTTP exchange for the sensor readings API (dev / learning UI). */

export type ApiTraceRecord = {
  method: 'GET' | 'POST'
  /** Path only, e.g. /api/sensor-readings */
  path: string
  /** Full URL the browser called */
  endpoint: string
  timestampISO: string
  /** 0 means the request never reached the server (network / offline). */
  statusCode: number
  requestBody?: unknown
  responseBody: unknown
  /** Why the app made this call (shown in API Explorer). */
  trigger?: string
}

export type TraceSnapshot = {
  lastPost: ApiTraceRecord | null
  lastGet: ApiTraceRecord | null
  backendOffline: boolean
}

/** Stable empty snapshot for SSR and initial client render. */
export const EMPTY_TRACE_SNAPSHOT: TraceSnapshot = Object.freeze({
  lastPost: null,
  lastGet: null,
  backendOffline: false,
})

const data: TraceSnapshot = {
  lastPost: null,
  lastGet: null,
  backendOffline: false,
}

/** Reference returned by getSnapshot — only replaced when trace data changes. */
let cachedSnapshot: TraceSnapshot = EMPTY_TRACE_SNAPSHOT

const listeners = new Set<() => void>()

function publish() {
  cachedSnapshot = {
    lastPost: data.lastPost,
    lastGet: data.lastGet,
    backendOffline: data.backendOffline,
  }
  for (const fn of listeners) fn()
}

export function getSensorApiTraceSnapshot(): TraceSnapshot {
  return cachedSnapshot
}

export function subscribeSensorApiTrace(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function recordPostApiTrace(record: ApiTraceRecord) {
  data.lastPost = record
  if (record.statusCode === 0) {
    data.backendOffline = true
  } else if (record.statusCode > 0) {
    data.backendOffline = false
  }
  publish()
}

export function recordGetApiTrace(record: ApiTraceRecord) {
  data.lastGet = record
  data.backendOffline = record.statusCode === 0
  publish()
}

export function setSensorApiBackendOffline(offline: boolean) {
  if (data.backendOffline === offline) return
  data.backendOffline = offline
  publish()
}
