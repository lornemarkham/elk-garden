import { getApiBaseUrl } from '../../lib/apiBase'
import { classifyRequestKind } from '../core/requestKind'
import type { ApiKind, CallOrigin } from '../core/types'
import type { MonitorStore } from '../core/store'
import { traceIdFromHeaders } from './traceIdFromHeaders'

function resolveUrl(input: RequestInfo | URL): string {
  if (typeof input === 'string') return input
  if (input instanceof URL) return input.href
  return input.url
}

function methodFrom(input: RequestInfo | URL, init?: RequestInit): string {
  if (init?.method) return init.method.toUpperCase()
  if (input instanceof Request) return input.method.toUpperCase()
  return 'GET'
}

function normalizeApiBase(): string {
  try {
    const base = getApiBaseUrl()
    if (!base) return ''
    return new URL(base, window.location.origin).origin
  } catch {
    return ''
  }
}

/**
 * Classify URL for ELK Garden: Express API vs same SPA origin vs third parties.
 */
export function classifyFetchUrl(urlStr: string): { callOrigin: CallOrigin; apiKind: ApiKind } {
  let parsed: URL
  try {
    parsed = new URL(urlStr, window.location.href)
  } catch {
    return { callOrigin: 'unknown', apiKind: 'other' }
  }

  const apiOrigin = normalizeApiBase()
  if (apiOrigin && parsed.origin === apiOrigin) {
    return {
      callOrigin: 'api_backend',
      apiKind: parsed.pathname.includes('graphql') ? 'graphql' : 'rest',
    }
  }

  if (parsed.origin === window.location.origin) {
    return {
      callOrigin: 'same_origin',
      apiKind: parsed.pathname.includes('graphql') ? 'graphql' : 'rest',
    }
  }

  return {
    callOrigin: 'third_party',
    apiKind: 'rest',
  }
}

/**
 * Patches window.fetch while the monitor is active. Call uninstall on disable.
 */
export function installFetchCollector(store: MonitorStore): () => void {
  if (typeof window === 'undefined') {
    return () => {}
  }

  const original = window.fetch.bind(window)

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    if (!store.getEnabled()) {
      return original(input, init)
    }

    const url = resolveUrl(input)
    const method = methodFrom(input, init)
    const { callOrigin, apiKind } = classifyFetchUrl(url)
    const requestKind = classifyRequestKind(url)

    const id = store.beginHttpCallEvent({
      url,
      method,
      startTime: performance.now(),
      source: 'fetch',
      requestKind,
      callOrigin,
      apiKind,
    })

    if (!id) {
      return original(input, init)
    }

    try {
      const res = await original(input, init)
      const traceId = traceIdFromHeaders(res.headers)
      store.endHttpCallEvent(id, {
        endTime: performance.now(),
        status: res.status,
        ...(traceId != null ? { traceId } : {}),
      })
      return res
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Network error'
      store.endHttpCallEvent(id, {
        endTime: performance.now(),
        errorMessage: message,
      })
      throw err
    }
  }

  return () => {
    window.fetch = original
  }
}
