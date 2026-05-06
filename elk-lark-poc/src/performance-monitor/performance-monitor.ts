// ELK Lark PoC — performance monitoring (dev / demo). Safe to delete with `elk-lark-poc/`.
// Instruments window.fetch when enabled.

export interface ApiCallLog {
  id: string
  url: string
  method: string
  status?: number
  duration?: number
  startTime: number
  endTime?: number
  source: 'axios' | 'swr' | 'fetch'
  error?: string
  size?: number
  callOrigin: 'Frontend' | 'BFF' | 'SSR' | 'Unknown'
  apiType: 'REST' | 'GraphQL' | 'External'
}

export interface AppHealth {
  initTime: number
  uptime: number
  potentialFlakes: string[]
  healthScore: 'Good' | 'Warning' | 'Critical'
}

export interface PerformanceMetrics {
  apiCalls: ApiCallLog[]
  totalCalls: number
  failedCalls: number
  averageResponseTime: number
  slowestCall?: ApiCallLog
  fastestCall?: ApiCallLog
  appHealth: AppHealth
}

function isCallFailed(c: ApiCallLog): boolean {
  return !!(c.error || (c.status != null && c.status >= 400))
}

class PerformanceMonitor {
  private apiCalls: Map<string, ApiCallLog> = new Map()
  private listeners: Set<() => void> = new Set()
  private enabled: boolean = false
  private initTime: number
  private originalFetch: typeof fetch | null = null

  constructor() {
    this.initTime = Date.now()
    if (typeof window !== 'undefined') {
      this.enabled =
        localStorage.getItem('ELK_LARK_PERF_MONITOR') === 'true' ||
        localStorage.getItem('PERF_MONITOR_ENABLED') === 'true'
      if (this.enabled) {
        this.installFetchInterceptor()
      }
      console.log(
        `[ELK Lark Performance] ready at ${new Date(this.initTime).toLocaleTimeString()}`,
      )
    }
  }

  private resolveUrl(input: RequestInfo | URL): string {
    if (typeof input === 'string') return input
    if (input instanceof URL) return input.href
    return input.url
  }

  private detectCallOrigin(url: string): 'Frontend' | 'BFF' | 'SSR' | 'Unknown' {
    const u = url.toLowerCase()
    if (u.includes('/api/') || u.includes('/bff/')) return 'BFF'
    if (u.includes('/_next/')) return 'SSR'
    try {
      const parsed = new URL(url, window.location.origin)
      if (parsed.origin === window.location.origin && parsed.pathname.startsWith('/api'))
        return 'BFF'
      if (parsed.origin === window.location.origin) return 'Frontend'
    } catch {
      /* relative */
      if (url.startsWith('/api')) return 'BFF'
      if (url.startsWith('/')) return 'Frontend'
    }
    return 'Unknown'
  }

  private detectApiType(url: string): 'REST' | 'GraphQL' | 'External' {
    if (url.includes('/graphql')) return 'GraphQL'
    try {
      const parsed = new URL(url, window.location.origin)
      const local =
        parsed.hostname === 'localhost' ||
        parsed.hostname === '127.0.0.1' ||
        parsed.origin === window.location.origin
      if (!local) return 'External'
    } catch {
      if (!url.startsWith('http')) return 'REST'
    }
    return 'REST'
  }

  private detectFlakes(): string[] {
    const flakes: string[] = []
    const calls = Array.from(this.apiCalls.values())
    const completedCalls = calls.filter((c) => c.duration !== undefined)
    const failedCalls = calls.filter(isCallFailed)

    if (calls.length > 5 && failedCalls.length / calls.length > 0.3) {
      flakes.push(
        `High failure rate: ${((failedCalls.length / calls.length) * 100).toFixed(0)}% of calls failing`,
      )
    }

    const slowCalls = completedCalls.filter((c) => c.duration && c.duration > 3000)
    if (slowCalls.length > 0) {
      flakes.push(`${slowCalls.length} call(s) >3s (timeout risk)`)
    }

    const recentCalls = calls.slice(-5)
    const recentFailures = recentCalls.filter(isCallFailed)
    if (recentFailures.length >= 3) {
      flakes.push(`${recentFailures.length} recent failures in last 5 calls`)
    }

    const networkErrors = calls.filter(
      (c) =>
        c.error &&
        (c.error.includes('Network') ||
          c.error.includes('timeout') ||
          c.error.includes('ECONNREFUSED')),
    )
    if (networkErrors.length > 0) {
      flakes.push(`${networkErrors.length} network error(s) detected`)
    }

    if (calls.length > 50) {
      flakes.push(`High call volume: ${calls.length} calls (potential loop?)`)
    }

    const urlCounts = new Map<string, number>()
    calls.forEach((call) => {
      const baseUrl = call.url.split('?')[0]
      urlCounts.set(baseUrl, (urlCounts.get(baseUrl) || 0) + 1)
    })
    const duplicates = Array.from(urlCounts.entries()).filter(([, count]) => count > 5)
    if (duplicates.length > 0) {
      duplicates.forEach(([url, count]) => {
        flakes.push(`${url.split('/').pop()} called ${count} times (caching issue?)`)
      })
    }

    return flakes
  }

  private calculateHealthScore(): 'Good' | 'Warning' | 'Critical' {
    const flakes = this.detectFlakes()
    const calls = Array.from(this.apiCalls.values())
    const failedCalls = calls.filter(isCallFailed)
    const failureRate = calls.length > 0 ? failedCalls.length / calls.length : 0

    if (flakes.length >= 3 || failureRate > 0.5) return 'Critical'
    if (flakes.length > 0 || failureRate > 0.2) return 'Warning'
    return 'Good'
  }

  private installFetchInterceptor(): void {
    if (typeof window === 'undefined' || this.originalFetch) return
    this.originalFetch = window.fetch.bind(window)
    const self = this
    window.fetch = async function elkLarkMonitoredFetch(
      input: RequestInfo | URL,
      init?: RequestInit,
    ): Promise<Response> {
      if (!self.enabled) {
        return self.originalFetch!(input, init)
      }
      const urlStr = self.resolveUrl(input)
      const method = init?.method || (input instanceof Request ? input.method : 'GET')
      const id = self.startApiCall(urlStr, method, 'fetch')
      if (!id) {
        return self.originalFetch!(input, init)
      }
      try {
        const res = await self.originalFetch!(input, init)
        self.endApiCall(id, res.status)
        return res
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Network error'
        self.endApiCall(id, undefined, msg)
        throw e
      }
    }
  }

  private removeFetchInterceptor(): void {
    if (typeof window !== 'undefined' && this.originalFetch) {
      window.fetch = this.originalFetch
      this.originalFetch = null
    }
  }

  enable(): void {
    this.enabled = true
    if (typeof window !== 'undefined') {
      localStorage.setItem('ELK_LARK_PERF_MONITOR', 'true')
      localStorage.setItem('PERF_MONITOR_ENABLED', 'true')
      this.installFetchInterceptor()
    }
    this.notifyListeners()
  }

  disable(): void {
    this.removeFetchInterceptor()
    this.enabled = false
    if (typeof window !== 'undefined') {
      localStorage.removeItem('ELK_LARK_PERF_MONITOR')
      localStorage.removeItem('PERF_MONITOR_ENABLED')
    }
    this.notifyListeners()
  }

  isEnabled(): boolean {
    return this.enabled
  }

  toggle(): void {
    if (this.enabled) this.disable()
    else this.enable()
  }

  startApiCall(
    url: string,
    method: string,
    source: 'axios' | 'swr' | 'fetch' = 'fetch',
  ): string {
    if (!this.enabled) return ''

    const id = `${Date.now()}-${Math.random()}`
    const call: ApiCallLog = {
      id,
      url,
      method: method.toUpperCase(),
      startTime: performance.now(),
      source,
      callOrigin: this.detectCallOrigin(url),
      apiType: this.detectApiType(url),
    }

    this.apiCalls.set(id, call)
    this.notifyListeners()
    return id
  }

  endApiCall(id: string, status?: number, error?: string, size?: number): void {
    if (!this.enabled || !id) return

    const call = this.apiCalls.get(id)
    if (call) {
      call.endTime = performance.now()
      call.duration = call.endTime - call.startTime
      call.status = status
      call.error = error
      call.size = size
      this.apiCalls.set(id, call)
      this.notifyListeners()
    }
  }

  getMetrics(): PerformanceMetrics {
    const calls = Array.from(this.apiCalls.values())
    const completedCalls = calls.filter((c) => c.duration !== undefined)
    const failedCalls = calls.filter(isCallFailed)

    const durations = completedCalls.map((c) => c.duration!).filter((d) => d > 0)
    const averageResponseTime =
      durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0

    const slowestCall = completedCalls.reduce(
      (slowest, call) => {
        if (!slowest || (call.duration && call.duration > (slowest.duration || 0))) return call
        return slowest
      },
      completedCalls[0],
    )

    const fastestCall = completedCalls.reduce(
      (fastest, call) => {
        if (!fastest || (call.duration && call.duration < (fastest.duration || Infinity)))
          return call
        return fastest
      },
      completedCalls[0],
    )

    const uptime = Date.now() - this.initTime
    const potentialFlakes = this.detectFlakes()
    const healthScore = this.calculateHealthScore()

    return {
      apiCalls: calls.sort((a, b) => b.startTime - a.startTime),
      totalCalls: calls.length,
      failedCalls: failedCalls.length,
      averageResponseTime,
      slowestCall,
      fastestCall,
      appHealth: {
        initTime: this.initTime,
        uptime,
        potentialFlakes,
        healthScore,
      },
    }
  }

  clearLogs(): void {
    this.apiCalls.clear()
    this.notifyListeners()
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private notifyListeners(): void {
    this.listeners.forEach((listener) => listener())
  }

  logComponentRender(componentName: string, duration: number): void {
    if (!this.enabled) return
    console.log(`[PERF] ${componentName} rendered in ${duration.toFixed(2)}ms`)
  }
}

export const performanceMonitor = new PerformanceMonitor()

if (typeof window !== 'undefined') {
  ;(window as unknown as { perfMonitor: PerformanceMonitor }).perfMonitor = performanceMonitor
}
