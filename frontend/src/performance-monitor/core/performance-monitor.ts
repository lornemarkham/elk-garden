import { installErrorCollector } from '../collectors/error-collector'
import { installFetchCollector } from '../collectors/fetch-collector'
import { installIframeDiscoveryCollector } from '../collectors/iframe-discovery-collector'
import { installNavigationCollector } from '../collectors/navigation-collector'
import { installXhrCollector } from '../collectors/xhr-collector'
import { buildDerivedMetrics, buildSloSnapshot } from './selectors'
import { MonitorStore } from './store'
import type { DerivedMetrics, MonitorState, SLOSnapshot } from './types'

const STORAGE_KEY = 'ELK_GARDEN_PERF_MONITOR'

function installAllCollectors(store: MonitorStore): () => void {
  const uninstallers = [
    installFetchCollector(store),
    installXhrCollector(store),
    installErrorCollector(store),
    installNavigationCollector(store),
    installIframeDiscoveryCollector(store),
  ]
  return () => {
    for (const u of uninstallers) u()
  }
}

/**
 * Facade: lifecycle, instrumentation, read-only snapshots for UI.
 */
class PerformanceMonitor {
  private readonly store = new MonitorStore()
  private uninstallCollectors: (() => void) | null = null

  constructor() {
    if (typeof window === 'undefined') return
    if (localStorage.getItem(STORAGE_KEY) === 'true') {
      this.store.setEnabled(true)
      this.uninstallCollectors = installAllCollectors(this.store)
    }
  }

  enable(): void {
    this.store.setEnabled(true)
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, 'true')
    }
    if (!this.uninstallCollectors) {
      this.uninstallCollectors = installAllCollectors(this.store)
    }
  }

  disable(): void {
    if (this.uninstallCollectors) {
      this.uninstallCollectors()
      this.uninstallCollectors = null
    }
    this.store.setEnabled(false)
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY)
    }
  }

  isEnabled(): boolean {
    return this.store.getEnabled()
  }

  toggle(): void {
    if (this.isEnabled()) this.disable()
    else this.enable()
  }

  subscribe(listener: () => void): () => void {
    return this.store.subscribe(listener)
  }

  /** Raw store snapshot (immutable-ish array). */
  getState(): MonitorState {
    return this.store.getSnapshot()
  }

  getDerivedMetrics(): DerivedMetrics {
    return buildDerivedMetrics(this.store.getSnapshot())
  }

  getSloSnapshot(): SLOSnapshot {
    return buildSloSnapshot(this.getDerivedMetrics())
  }

  clear(): void {
    this.store.clear()
  }
}

export const performanceMonitor = new PerformanceMonitor()

if (typeof window !== 'undefined') {
  ;(window as unknown as { elkPerformanceMonitor: PerformanceMonitor }).elkPerformanceMonitor =
    performanceMonitor
}
