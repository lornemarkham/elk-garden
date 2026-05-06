import type { MonitorStore } from '../core/store'
import type {
  IframeInventoryItem,
  IframeLoadKind,
  IframeRelation,
  IframeVisibleHeuristic,
} from '../core/types'

const IFRAME_ID_SYM = Symbol.for('elkGarden.perfMonitor.iframeId')

function getOrCreateIframeDomId(el: HTMLIFrameElement): string {
  const bag = el as HTMLIFrameElement & { [k: symbol]: string | undefined }
  let id = bag[IFRAME_ID_SYM]
  if (!id) {
    id = `if-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`
    bag[IFRAME_ID_SYM] = id
  }
  return id
}

const PM_STRING_CAP = 72
const PM_LABEL_CAP = 96
const PM_KEY_BUDGET = 88
const PM_MAX_KEYS_LISTED = 6

function truncateLabel(s: string, max: number): string {
  if (s.length <= max) return s
  return `${s.slice(0, Math.max(0, max - 1))}…`
}

/** Compact representation of a `type` field value — never dumps nested payloads. */
function formatMessageTypeValue(value: unknown): string {
  if (value == null) return String(value)
  if (typeof value === 'string') return truncateLabel(value, PM_LABEL_CAP)
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  if (typeof value === 'bigint') return `${value}n`
  if (Array.isArray(value)) return `array(${value.length})`
  if (typeof value === 'object') {
    const keys = Object.keys(value as object)
    if (keys.length === 0) return '{}'
    if (keys.length <= 3) return `{${keys.join(',')}}`
    return `{${keys.length} keys}`
  }
  return typeof value
}

function objectTag(data: object): string {
  return Object.prototype.toString.call(data).slice(8, -1)
}

/** Key-only outline (no values). */
function summarizeKeyNames(keys: string[]): string {
  if (keys.length === 0) return '{}'
  const out: string[] = []
  let used = 0
  for (let i = 0; i < keys.length && i < PM_MAX_KEYS_LISTED; i++) {
    const k = keys[i]
    const sep = out.length ? ', ' : ''
    if (used + sep.length + k.length > PM_KEY_BUDGET) break
    out.push(k)
    used += sep.length + k.length
  }
  const listed = out.join(', ')
  if (out.length === keys.length) return `{${listed}}`
  const rest = keys.length - out.length
  return `{${listed}, +${rest}}`
}

function summarizeObjectKeys(obj: object): string {
  const keys = Object.keys(obj)
  if (keys.length === 0) {
    const tag = objectTag(obj)
    return tag === 'Object' ? '{}' : tag
  }
  return summarizeKeyNames(keys)
}

/**
 * Short labels for postMessage payloads — no full serialization, capped strings only.
 * @returns `summary` is the main line; `summaryDetail` adds compact extra context when useful.
 */
export function summarizeMessagePayload(data: unknown): { summary: string; summaryDetail?: string } {
  if (data == null) return { summary: String(data) }
  if (typeof data === 'string') {
    const summary =
      data.length > PM_STRING_CAP
        ? `${truncateLabel(data, PM_STRING_CAP)} · len=${data.length}`
        : data
    return { summary }
  }
  if (typeof data === 'number' || typeof data === 'boolean') return { summary: String(data) }
  if (typeof data === 'bigint') return { summary: `${data}n` }
  if (typeof data === 'object') {
    if (Array.isArray(data)) return { summary: `array(${data.length})` }
    const rec = data as Record<string, unknown>
    const keys = Object.keys(rec)
    if (Object.prototype.hasOwnProperty.call(rec, 'type')) {
      const summary = formatMessageTypeValue(rec.type)
      const otherKeys = keys.filter((k) => k !== 'type')
      if (otherKeys.length === 0) return { summary }
      return { summary, summaryDetail: summarizeKeyNames(otherKeys) }
    }
    return { summary: summarizeObjectKeys(rec) }
  }
  return { summary: typeof data }
}

function visibleHeuristic(el: HTMLIFrameElement): IframeVisibleHeuristic {
  const rect = el.getBoundingClientRect()
  if (rect.width < 2 || rect.height < 2) return 'hidden'
  try {
    const s = window.getComputedStyle(el)
    if (s.display === 'none' || s.visibility === 'hidden' || Number(s.opacity) === 0) return 'hidden'
  } catch {
    return 'unknown'
  }
  return 'visible'
}

function measureIframe(el: HTMLIFrameElement, index: number): IframeInventoryItem {
  const id = getOrCreateIframeDomId(el)
  const srcAttr = el.getAttribute('src')
  const rect = el.getBoundingClientRect()
  let resolvedUrl: string | null = null
  let iframeOrigin: string | null = null
  let relation: IframeRelation = 'unknown'
  let embeddedReadyState: string | null = null
  let limitationNote: string | undefined

  const hasSrcdoc = Boolean(el.srcdoc && el.srcdoc.length > 0)

  if (hasSrcdoc) {
    relation = 'srcdoc'
    resolvedUrl = 'about:srcdoc'
    iframeOrigin = window.location.origin
    try {
      embeddedReadyState = el.contentDocument?.readyState ?? null
    } catch {
      limitationNote = 'srcdoc document not readable (sandbox or timing).'
    }
  } else if (srcAttr != null && srcAttr !== '') {
    try {
      const u = new URL(srcAttr, window.location.href)
      resolvedUrl = u.href
      iframeOrigin = u.origin
      relation = u.origin === window.location.origin ? 'same_origin' : 'cross_origin'
    } catch {
      limitationNote = 'Could not parse iframe src URL.'
    }

    if (relation === 'same_origin' || relation === 'cross_origin') {
      try {
        const doc = el.contentDocument
        embeddedReadyState = doc?.readyState ?? null
      } catch {
        embeddedReadyState = null
      }
      if (relation === 'cross_origin' && embeddedReadyState == null) {
        limitationNote =
          limitationNote ??
          'Cross-origin: parent cannot read embedded document or readyState (browser isolation).'
      }
    }
  } else {
    limitationNote = 'No src and no srcdoc — empty frame until set.'
  }

  return {
    id,
    index,
    srcAttribute: srcAttr,
    resolvedUrl,
    iframeOrigin,
    relation,
    attrWidth: el.getAttribute('width'),
    attrHeight: el.getAttribute('height'),
    layoutWidth: Math.round(rect.width * 100) / 100,
    layoutHeight: Math.round(rect.height * 100) / 100,
    visibleHeuristic: visibleHeuristic(el),
    embeddedReadyState,
    limitationNote,
  }
}

/**
 * Discovery-only: iframe inventory, load/error on iframe elements, parent postMessage observations.
 * Does not access cross-origin frame JS or network.
 */
export function installIframeDiscoveryCollector(store: MonitorStore): () => void {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return () => {}
  }

  const cleanups: Array<() => void> = []
  const wired = new WeakSet<HTMLIFrameElement>()

  const scan = () => {
    if (!store.getEnabled()) return
    const list = Array.from(document.querySelectorAll('iframe'))
    store.replaceIframeInventory(list.map((el, i) => measureIframe(el, i)))

    for (const el of list) {
      if (wired.has(el)) continue
      wired.add(el)
      const iframeId = getOrCreateIframeDomId(el)
      const onLoad = () => {
        if (!store.getEnabled()) return
        store.recordIframeLoadObservation({ timestampMs: Date.now(), iframeId, kind: 'load' as IframeLoadKind })
        scan()
      }
      const onErr = () => {
        if (!store.getEnabled()) return
        store.recordIframeLoadObservation({ timestampMs: Date.now(), iframeId, kind: 'error' as IframeLoadKind })
      }
      el.addEventListener('load', onLoad)
      el.addEventListener('error', onErr)
      cleanups.push(() => {
        el.removeEventListener('load', onLoad)
        el.removeEventListener('error', onErr)
      })
    }
  }

  let t: ReturnType<typeof setTimeout> | null = null
  const debouncedScan = () => {
    if (t != null) clearTimeout(t)
    t = setTimeout(() => {
      t = null
      scan()
    }, 280)
  }

  scan()

  const mo = new MutationObserver(debouncedScan)
  mo.observe(document.documentElement, { childList: true, subtree: true })
  cleanups.push(() => mo.disconnect())

  const interval = window.setInterval(() => {
    if (store.getEnabled()) scan()
  }, 8000)
  cleanups.push(() => clearInterval(interval))

  const onMessage = (ev: MessageEvent) => {
    if (!store.getEnabled()) return
    store.recordPostMessageObservation({
      timestampMs: Date.now(),
      direction: 'received',
      origin: ev.origin || '(empty)',
      ...summarizeMessagePayload(ev.data),
    })
  }
  window.addEventListener('message', onMessage)
  cleanups.push(() => window.removeEventListener('message', onMessage))

  const origPostMessage = Window.prototype.postMessage
  Window.prototype.postMessage = function postMessagePatched(this: Window, ...args: unknown[]): void {
    if (store.getEnabled() && this === window && args.length >= 2) {
      store.recordPostMessageObservation({
        timestampMs: Date.now(),
        direction: 'sent',
        origin: String(args[1]),
        ...summarizeMessagePayload(args[0]),
      })
    }
    return origPostMessage.apply(this, args as Parameters<typeof origPostMessage>)
  }
  cleanups.push(() => {
    Window.prototype.postMessage = origPostMessage
  })

  return () => {
    if (t != null) clearTimeout(t)
    cleanups.forEach((fn) => fn())
  }
}
