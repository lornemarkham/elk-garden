import { getApiBaseUrl } from '../../lib/apiBase'
import type { RequestKind } from './types'

function normalizeApiOrigin(): string {
  try {
    const base = getApiBaseUrl()
    if (!base) return ''
    return new URL(base, window.location.origin).origin
  } catch {
    return ''
  }
}

/**
 * Classify URL for UI grouping:
 * - Path `/api` or `/api/...` on any host → api
 * - Origin matches configured API base (e.g. dev Express) → api
 * - Else same host as the SPA → frontend
 * - Else another host → external
 * - Parse failure → unknown
 */
export function classifyRequestKind(urlStr: string): RequestKind {
  if (typeof window === 'undefined') return 'unknown'

  let parsed: URL
  try {
    parsed = new URL(urlStr, window.location.href)
  } catch {
    return 'unknown'
  }

  const path = parsed.pathname || '/'
  if (path === '/api' || path.startsWith('/api/')) {
    return 'api'
  }

  const apiOrigin = normalizeApiOrigin()
  if (apiOrigin && parsed.origin === apiOrigin) {
    return 'api'
  }

  if (parsed.origin === window.location.origin) {
    return 'frontend'
  }

  if (parsed.origin !== window.location.origin) {
    return 'external'
  }

  return 'unknown'
}
