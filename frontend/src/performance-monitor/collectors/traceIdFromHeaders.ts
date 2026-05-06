/**
 * Resolve a single correlation / trace value from common response headers (fetch + XHR).
 * Order: x-trace-id → x-request-id → traceparent → x-correlation-id
 */

const TRACE_HEADER_KEYS = ['x-trace-id', 'x-request-id', 'traceparent', 'x-correlation-id'] as const

/** W3C traceparent: {version}-{trace-id}-{parent-id}-{flags}; return hex trace-id segment when valid. */
export function parseTraceparentHeader(value: string): string {
  const t = value.trim()
  const parts = t.split('-')
  if (parts.length >= 2 && /^[0-9a-f]{2}$/i.test(parts[0] ?? '') && (parts[1]?.length ?? 0) >= 8) {
    return parts[1]!
  }
  return t
}

function traceIdFromHeaderLookup(get: (name: string) => string | null): string | undefined {
  for (const key of TRACE_HEADER_KEYS) {
    const raw = get(key)?.trim()
    if (!raw) continue
    if (key === 'traceparent') return parseTraceparentHeader(raw)
    return raw
  }
  return undefined
}

export function traceIdFromHeaders(headers: Headers): string | undefined {
  return traceIdFromHeaderLookup((name) => headers.get(name))
}

export function traceIdFromXhr(xhr: XMLHttpRequest): string | undefined {
  return traceIdFromHeaderLookup((name) => {
    try {
      return xhr.getResponseHeader(name)
    } catch {
      return null
    }
  })
}
