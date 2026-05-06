import { useSyncExternalStore } from 'react'
import type { ErrorPayload, RequestPayload } from './bridge-protocol'
import { isPageBridgeEnvelope } from './bridge-protocol'

const MAX_REQUESTS = 200
const MAX_ERRORS = 100

export type InstrumentationSnapshot = {
  /** When true, bridge events are ignored (lists and counts do not change). */
  recordingPaused: boolean
  /** Lifetime count of captured fetch + XHR completions (parent page only). */
  totalCalls: number
  /** Subset of totalCalls where the request is marked not OK (HTTP error, network error, etc.). */
  failedCalls: number
  /** Lifetime count of runtime errors + unhandled rejections. */
  totalPageErrors: number
  /** Newest-first capped list for the request log. */
  requests: RequestPayload[]
  /** Newest-first capped list for the error log. */
  errors: ErrorPayload[]
}

let requests: RequestPayload[] = []
let errors: ErrorPayload[] = []
let totalCalls = 0
let failedCalls = 0
let totalPageErrors = 0
let recordingPaused = false

const listeners = new Set<() => void>()

function emit(): void {
  for (const l of listeners) l()
}

function pushRequest(p: RequestPayload): void {
  totalCalls += 1
  if (!p.success) failedCalls += 1
  requests = [p, ...requests].slice(0, MAX_REQUESTS)
  emit()
}

function pushError(p: ErrorPayload): void {
  totalPageErrors += 1
  errors = [p, ...errors].slice(0, MAX_ERRORS)
  emit()
}

export function ingestPageMessage(data: unknown): void {
  if (recordingPaused) return
  if (!isPageBridgeEnvelope(data)) return
  if (data.kind === 'request') pushRequest(data.payload)
  else pushError(data.payload)
}

/** Pause or resume capture from the page bridge (no new rows while paused). */
export function setRecordingPaused(paused: boolean): void {
  if (recordingPaused === paused) return
  recordingPaused = paused
  emit()
}

/** Clear lists and zero counters for a fresh session (extension-only; does not affect the host page). */
export function resetInstrumentation(): void {
  if (
    totalCalls === 0 &&
    failedCalls === 0 &&
    totalPageErrors === 0 &&
    requests.length === 0 &&
    errors.length === 0
  ) {
    return
  }
  requests = []
  errors = []
  totalCalls = 0
  failedCalls = 0
  totalPageErrors = 0
  emit()
}

/**
 * useSyncExternalStore compares snapshots with Object.is. A new object literal every call
 * always looks "changed", so React re-renders forever (max update depth). Reuse one object
 * until module state actually changes (emit already runs after mutations).
 */
let snapshotCache: InstrumentationSnapshot | null = null

function getSnapshot(): InstrumentationSnapshot {
  if (
    snapshotCache !== null &&
    snapshotCache.recordingPaused === recordingPaused &&
    snapshotCache.totalCalls === totalCalls &&
    snapshotCache.failedCalls === failedCalls &&
    snapshotCache.totalPageErrors === totalPageErrors &&
    snapshotCache.requests === requests &&
    snapshotCache.errors === errors
  ) {
    return snapshotCache
  }
  snapshotCache = {
    recordingPaused,
    totalCalls,
    failedCalls,
    totalPageErrors,
    requests,
    errors,
  }
  return snapshotCache
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb)
  return () => {
    listeners.delete(cb)
  }
}

export function useInstrumentation(): InstrumentationSnapshot {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}
