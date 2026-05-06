import type {
  ApiCallEvent,
  ClientErrorEvent,
  IframeInventoryItem,
  IframeLoadObservation,
  MonitorState,
  PageNavigationSummary,
  PostMessageObservation,
} from './types'

const MAX_CLIENT_ERRORS = 100
const MAX_IFRAME_LOAD_LOG = 40
const MAX_POSTMESSAGE_LOG = 60

/**
 * Central mutable store. UI and collectors interact through PerformanceMonitor facade.
 */
export class MonitorStore {
  private enabled = false
  private readonly sessionStartedAtMs = Date.now()
  private readonly events = new Map<string, ApiCallEvent>()
  private clientErrors: ClientErrorEvent[] = []
  private pageNavigation: PageNavigationSummary | null = null
  private iframeInventory: IframeInventoryItem[] = []
  /** Set once per session when inventory first reports ≥1 iframe while enabled. */
  private iframeFirstDetectedAtMs: number | null = null
  private iframeLoadLog: IframeLoadObservation[] = []
  private postMessageLog: PostMessageObservation[] = []
  private listeners = new Set<() => void>()

  getEnabled(): boolean {
    return this.enabled
  }

  setEnabled(next: boolean): void {
    this.enabled = next
    this.notify()
  }

  getSnapshot(): MonitorState {
    const list = Array.from(this.events.values()).sort((a, b) => b.startTime - a.startTime)
    return {
      enabled: this.enabled,
      sessionStartedAtMs: this.sessionStartedAtMs,
      iframeFirstDetectedAtMs: this.iframeFirstDetectedAtMs,
      events: list,
      clientErrors: [...this.clientErrors],
      pageNavigation: this.pageNavigation,
      iframeInventory: [...this.iframeInventory],
      iframeLoadLog: [...this.iframeLoadLog],
      postMessageLog: [...this.postMessageLog],
    }
  }

  subscribe(fn: () => void): () => void {
    this.listeners.add(fn)
    return () => this.listeners.delete(fn)
  }

  /**
   * Start tracking an HTTP call (fetch or XHR). Returns id, or empty string if monitor disabled.
   */
  beginHttpCallEvent(event: Omit<ApiCallEvent, 'id'>): string {
    if (!this.enabled) return ''
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
    const row: ApiCallEvent = { ...event, id }
    this.events.set(id, row)
    this.notify()
    return id
  }

  endHttpCallEvent(
    id: string,
    patch: Pick<ApiCallEvent, 'status' | 'errorMessage' | 'traceId'> & {
      endTime: number
    },
  ): void {
    if (!id) return
    const row = this.events.get(id)
    if (!row) return
    const endTime = patch.endTime
    const durationMs = endTime - row.startTime
    const next: ApiCallEvent = {
      ...row,
      endTime,
      durationMs,
      status: patch.status,
      errorMessage: patch.errorMessage,
      settledAtMs: Date.now(),
    }
    if (patch.traceId !== undefined) {
      next.traceId = patch.traceId
    }
    this.events.set(id, next)
    this.notify()
  }

  recordClientError(event: Omit<ClientErrorEvent, 'id'>): void {
    if (!this.enabled) return
    const id = `err-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
    this.clientErrors = [...this.clientErrors, { ...event, id }].slice(-MAX_CLIENT_ERRORS)
    this.notify()
  }

  setPageNavigation(summary: PageNavigationSummary): void {
    if (!this.enabled) return
    this.pageNavigation = summary
    this.notify()
  }

  replaceIframeInventory(items: IframeInventoryItem[]): void {
    if (!this.enabled) return
    if (items.length > 0 && this.iframeFirstDetectedAtMs == null) {
      this.iframeFirstDetectedAtMs = Date.now()
    }
    this.iframeInventory = items
    this.notify()
  }

  recordIframeLoadObservation(entry: Omit<IframeLoadObservation, 'id'>): void {
    if (!this.enabled) return
    const id = `ifl-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    this.iframeLoadLog = [...this.iframeLoadLog, { ...entry, id }].slice(-MAX_IFRAME_LOAD_LOG)
    this.notify()
  }

  recordPostMessageObservation(entry: Omit<PostMessageObservation, 'id'>): void {
    if (!this.enabled) return
    const id = `pm-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    this.postMessageLog = [...this.postMessageLog, { ...entry, id }].slice(-MAX_POSTMESSAGE_LOG)
    this.notify()
  }

  clear(): void {
    this.events.clear()
    this.clientErrors = []
    this.iframeInventory = []
    this.iframeFirstDetectedAtMs = null
    this.iframeLoadLog = []
    this.postMessageLog = []
    this.notify()
  }

  private notify(): void {
    this.listeners.forEach((l) => l())
  }
}
