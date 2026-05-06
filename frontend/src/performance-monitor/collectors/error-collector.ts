import type { MonitorStore } from '../core/store'

/**
 * Captures window 'error' and unhandledrejection. Unsubscribe via returned function.
 */
export function installErrorCollector(store: MonitorStore): () => void {
  if (typeof window === 'undefined') {
    return () => {}
  }

  const onError = (event: ErrorEvent) => {
    if (!store.getEnabled()) return
    const message =
      event.message ||
      (event.error instanceof Error ? event.error.message : null) ||
      'Script error'
    store.recordClientError({
      timestampMs: Date.now(),
      source: 'window_error',
      message,
      filename: event.filename || undefined,
      lineno: event.lineno || undefined,
      colno: event.colno || undefined,
      stack: event.error instanceof Error ? event.error.stack : undefined,
    })
  }

  const onRejection = (event: PromiseRejectionEvent) => {
    if (!store.getEnabled()) return
    const reason = event.reason
    const message =
      reason instanceof Error
        ? reason.message
        : typeof reason === 'string'
          ? reason
          : 'Unhandled promise rejection'
    const stack = reason instanceof Error ? reason.stack : undefined
    store.recordClientError({
      timestampMs: Date.now(),
      source: 'unhandledrejection',
      message,
      stack,
    })
  }

  window.addEventListener('error', onError)
  window.addEventListener('unhandledrejection', onRejection)

  return () => {
    window.removeEventListener('error', onError)
    window.removeEventListener('unhandledrejection', onRejection)
  }
}
