import { classifyRequestKind } from '../core/requestKind'
import { classifyFetchUrl } from './fetch-collector'
import type { MonitorStore } from '../core/store'
import { traceIdFromXhr } from './traceIdFromHeaders'

type AugmentedXhr = XMLHttpRequest & {
  __elkPmMethod?: string
  __elkPmUrl?: string
}

/**
 * Patches XMLHttpRequest while the monitor is active. Call uninstall on disable.
 */
export function installXhrCollector(store: MonitorStore): () => void {
  if (typeof window === 'undefined' || !window.XMLHttpRequest) {
    return () => {}
  }

  const proto = XMLHttpRequest.prototype
  const origOpen = proto.open
  const origSend = proto.send

  proto.open = function openPatched(this: XMLHttpRequest, ...args: unknown[]) {
    const x = this as AugmentedXhr
    const method = args[0]
    const url = args[1]
    x.__elkPmMethod = typeof method === 'string' ? method.toUpperCase() : String(method ?? 'GET').toUpperCase()
    x.__elkPmUrl =
      typeof url === 'string' ? url : url != null && typeof (url as URL).href === 'string' ? (url as URL).href : ''
    return origOpen.apply(this, args as Parameters<typeof origOpen>)
  }

  proto.send = function sendPatched(this: XMLHttpRequest, body?: Document | XMLHttpRequestBodyInit | null) {
    if (!store.getEnabled()) {
      return origSend.call(this, body)
    }

    const x = this as AugmentedXhr
    const rawUrl = x.__elkPmUrl ?? ''
    const method = x.__elkPmMethod ?? 'GET'
    let href: string
    try {
      href = new URL(rawUrl, window.location.href).href
    } catch {
      href = rawUrl
    }
    const { callOrigin, apiKind } = classifyFetchUrl(href)
    const requestKind = classifyRequestKind(href)

    const id = store.beginHttpCallEvent({
      url: href,
      method,
      startTime: performance.now(),
      source: 'xhr',
      requestKind,
      callOrigin,
      apiKind,
    })

    if (!id) {
      return origSend.call(this, body)
    }

    const onLoadEnd = () => {
      x.removeEventListener('loadend', onLoadEnd)
      const status = x.status
      let errorMessage: string | undefined
      if (status === 0 && x.readyState !== 0) {
        errorMessage = 'XHR completed with status 0 (network, CORS, or abort)'
      }
      const traceId = traceIdFromXhr(x)
      store.endHttpCallEvent(id, {
        endTime: performance.now(),
        status: Number.isFinite(status) ? status : undefined,
        errorMessage,
        ...(traceId != null ? { traceId } : {}),
      })
    }

    x.addEventListener('loadend', onLoadEnd)
    try {
      return origSend.call(this, body)
    } catch (err) {
      x.removeEventListener('loadend', onLoadEnd)
      const message = err instanceof Error ? err.message : 'XHR send error'
      store.endHttpCallEvent(id, {
        endTime: performance.now(),
        errorMessage: message,
      })
      throw err
    }
  }

  return () => {
    proto.open = origOpen
    proto.send = origSend
  }
}
