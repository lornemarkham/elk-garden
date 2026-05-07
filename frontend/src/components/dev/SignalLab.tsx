import { useEffect, useState } from 'react'
import clsx from 'clsx'
import { useGardenStore } from '../../lib/garden/GardenStore'
import type { GardenSignalEvent, GardenSignalKind } from '../../lib/garden/sensorIngestion'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type SignalButton = {
  label: string
  zoneId?: string
  kind: GardenSignalKind
  value?: number
  severity: GardenSignalEvent['severity']
  metadata?: GardenSignalEvent['metadata']
  /** Visual hint — does not change button behavior, just the direction dot color */
  direction: 'positive' | 'alert'
}

type TabId = 'sensors' | 'weather' | 'camera' | 'human'

type TabDef = {
  id: TabId
  label: string
  source: GardenSignalEvent['source']
  signals: SignalButton[]
}

// ---------------------------------------------------------------------------
// Signal definitions
// ---------------------------------------------------------------------------

const TABS: TabDef[] = [
  {
    id: 'sensors',
    label: 'Sensors',
    source: 'arduino',
    signals: [
      {
        label: 'Soil moisture low',
        kind: 'soil-moisture-low',
        zoneId: 'zone_tomatoes',
        value: 21,
        severity: 'critical',
        direction: 'alert',
        metadata: {
          sensorLabel: 'Zone 1 moisture probe',
          confidence: 'high',
          suggestedVerificationAction:
            'Check the top inch of soil around the tomato roots before watering.',
          readingUnit: 'percent',
        },
      },
      {
        label: 'Moisture recovered',
        kind: 'moisture-recovered',
        zoneId: 'zone_tomatoes',
        severity: 'info',
        direction: 'positive',
        metadata: { sensorLabel: 'Zone 1 moisture probe', confidence: 'high' },
      },
      {
        label: 'High heat stress',
        kind: 'heat-stress',
        zoneId: 'zone_roots',
        value: 94,
        severity: 'urgent',
        direction: 'alert',
        metadata: {
          rowLabel: 'west row',
          sensorLabel: 'West row temperature sensor',
          confidence: 'medium',
        },
      },
      {
        label: 'Humidity dropping',
        kind: 'humidity-dropping',
        severity: 'watch',
        direction: 'alert',
        metadata: { sensorLabel: 'Garden humidity sensor', confidence: 'medium' },
      },
      {
        label: 'Cool soil conditions',
        kind: 'cool-soil-conditions',
        zoneId: 'zone_greens',
        severity: 'info',
        direction: 'positive',
        metadata: { sensorLabel: 'Greens bed probe', confidence: 'high' },
      },
      {
        label: 'Temperature spike',
        kind: 'temperature-spike',
        zoneId: 'zone_tomatoes',
        value: 97,
        severity: 'urgent',
        direction: 'alert',
        metadata: { sensorLabel: 'Garden thermometer', confidence: 'high' },
      },
    ],
  },
  {
    id: 'weather',
    label: 'Weather',
    source: 'weather',
    signals: [
      {
        label: 'Rain incoming',
        kind: 'rain-incoming',
        severity: 'info',
        direction: 'positive',
        metadata: { sensorLabel: 'Weather service', confidence: 'high' },
      },
      {
        label: 'Wind advisory',
        kind: 'wind-advisory',
        severity: 'watch',
        direction: 'alert',
        metadata: { sensorLabel: 'Weather service', confidence: 'medium' },
      },
      {
        label: 'Hot afternoon',
        kind: 'hot-afternoon',
        severity: 'watch',
        direction: 'alert',
        metadata: { sensorLabel: 'Weather service', confidence: 'high' },
      },
      {
        label: 'Cool evening',
        kind: 'cool-evening',
        severity: 'info',
        direction: 'positive',
        metadata: { sensorLabel: 'Weather service', confidence: 'high' },
      },
      {
        label: 'Frost warning',
        kind: 'frost-risk',
        severity: 'critical',
        direction: 'alert',
        metadata: { sensorLabel: 'Weather service', confidence: 'medium' },
      },
      {
        label: 'Cloudy low-light day',
        kind: 'cloudy-low-light',
        severity: 'info',
        direction: 'alert',
        metadata: { sensorLabel: 'Weather service', confidence: 'medium' },
      },
    ],
  },
  {
    id: 'camera',
    label: 'Camera & Wildlife',
    source: 'camera',
    signals: [
      {
        label: 'Deer detected',
        kind: 'animal-activity',
        zoneId: 'zone_greens',
        severity: 'watch',
        direction: 'alert',
        metadata: {
          sensorLabel: 'North fence camera',
          confidence: 'medium',
          suggestedVerificationAction:
            'Review the camera clip and check nearby greens for nibbled leaves.',
          species: 'deer',
        },
      },
      {
        label: 'Bug activity suspected',
        kind: 'pest-activity',
        zoneId: 'zone_greens',
        severity: 'watch',
        direction: 'alert',
        metadata: {
          rowLabel: 'Row 4',
          sensorLabel: 'Greens camera classifier',
          confidence: 'medium',
        },
      },
      {
        label: 'Leaf yellowing detected',
        kind: 'leaf-yellowing',
        zoneId: 'zone_tomatoes',
        severity: 'watch',
        direction: 'alert',
        metadata: { sensorLabel: 'Garden camera', confidence: 'low' },
      },
      {
        label: 'Plant droop detected',
        kind: 'plant-droop',
        zoneId: 'zone_tomatoes',
        severity: 'watch',
        direction: 'alert',
        metadata: { sensorLabel: 'Garden camera', confidence: 'medium' },
      },
      {
        label: 'Fruit ripening detected',
        kind: 'fruit-ripening',
        zoneId: 'zone_tomatoes',
        severity: 'info',
        direction: 'positive',
        metadata: { sensorLabel: 'Garden camera', confidence: 'high' },
      },
      {
        label: 'Weed growth detected',
        kind: 'weed-growth',
        zoneId: 'zone_melons',
        severity: 'info',
        direction: 'alert',
        metadata: { sensorLabel: 'Garden camera', confidence: 'low' },
      },
    ],
  },
  {
    id: 'human',
    label: 'Human Reports',
    source: 'fake-dev-panel',
    signals: [
      {
        label: 'Soil feels dry',
        kind: 'soil-moisture-low',
        zoneId: 'zone_tomatoes',
        severity: 'urgent',
        direction: 'alert',
        metadata: {
          sensorLabel: 'Your observation',
          confidence: 'high',
          suggestedVerificationAction:
            'Trust your hands — check the top inch of soil.',
        },
      },
      {
        label: 'Watering completed',
        kind: 'watering-completed',
        zoneId: 'zone_tomatoes',
        severity: 'info',
        direction: 'positive',
        metadata: { sensorLabel: 'Your observation', confidence: 'high' },
      },
      {
        label: 'Added mulch',
        kind: 'mulch-added',
        zoneId: 'zone_roots',
        severity: 'info',
        direction: 'positive',
        metadata: { sensorLabel: 'Your observation', confidence: 'high' },
      },
      {
        label: 'Harvest completed',
        kind: 'harvest-completed',
        zoneId: 'zone_greens',
        severity: 'info',
        direction: 'positive',
        metadata: { sensorLabel: 'Your observation', confidence: 'high' },
      },
      {
        label: 'Saw pests',
        kind: 'pest-activity',
        zoneId: 'zone_greens',
        severity: 'watch',
        direction: 'alert',
        metadata: {
          sensorLabel: 'Your observation',
          confidence: 'medium',
          suggestedVerificationAction:
            'Look under leaves for eggs, aphids, or chew marks.',
        },
      },
      {
        label: 'Plants looking healthy',
        kind: 'plants-healthy',
        zoneId: 'zone_tomatoes',
        severity: 'info',
        direction: 'positive',
        metadata: { sensorLabel: 'Your observation', confidence: 'high' },
      },
    ],
  },
]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatEventTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

function formatReviewWindow(capturedAtISO: string) {
  const end = new Date(capturedAtISO)
  const start = new Date(end.getTime() - 4 * 60_000)
  return `${formatEventTime(start.toISOString())} to ${formatEventTime(end.toISOString())}`
}

function createSignalEvent(tab: TabDef, signal: SignalButton): GardenSignalEvent {
  const capturedAtISO = new Date().toISOString()
  return {
    source: tab.source,
    zoneId: signal.zoneId,
    kind: signal.kind,
    value: signal.value,
    severity: signal.severity,
    capturedAtISO,
    metadata: {
      ...signal.metadata,
      detectedAtISO: capturedAtISO,
      ...(signal.kind === 'animal-activity'
        ? { reviewWindow: formatReviewWindow(capturedAtISO) }
        : {}),
    },
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SignalLab({ enabled }: { enabled: boolean }) {
  const { garden, ingestSignal, activityLog, resetGarden, advanceTime, clearActivityLog } =
    useGardenStore()

  const [activeTab, setActiveTab] = useState<TabId>('sensors')
  const [expanded, setExpanded] = useState(false)
  const [lastFiredKey, setLastFiredKey] = useState<string | null>(null)
  const [isResetting, setIsResetting] = useState(false)

  // Auto-clear the "just fired" highlight after 1.5 s
  useEffect(() => {
    if (!lastFiredKey) return
    const timer = setTimeout(() => setLastFiredKey(null), 1500)
    return () => clearTimeout(timer)
  }, [lastFiredKey])

  if (!garden || !enabled) return null

  const currentTab = TABS.find((t) => t.id === activeTab) ?? TABS[0]

  const sendSignal = (signal: SignalButton) => {
    const key = `${activeTab}-${signal.zoneId ?? 'garden'}-${signal.kind}`
    const event = createSignalEvent(currentTab, signal)
    ingestSignal(event)
    setLastFiredKey(key)
  }

  const handleReset = async () => {
    setIsResetting(true)
    await resetGarden()
    setIsResetting(false)
  }

  const recentActivity = activityLog.slice(0, 5)

  return (
    <aside className="fixed bottom-[6.25rem] right-3 z-40 w-[min(22rem,calc(100vw-1.5rem))] rounded-2xl bg-white/97 text-xs shadow-xl ring-1 ring-stone-200 backdrop-blur sm:bottom-auto sm:top-20">
      {/* Header */}
      <button
        type="button"
        onClick={() => setExpanded((open) => !open)}
        className="flex w-full items-start gap-3 rounded-2xl p-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
        aria-expanded={expanded}
      >
        <span className="flex-1 min-w-0">
          <span className="flex items-center gap-2">
            <span className="block font-bold tracking-tight text-stone-900">Signal Lab</span>
            <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-wider text-stone-500 ring-1 ring-stone-200">
              demo
            </span>
          </span>
          <span className="mt-0.5 block text-[0.68rem] leading-snug text-stone-500">
            Signals simulate future sensor, weather, camera, and human garden events.
          </span>
        </span>
        <span className="shrink-0 rounded-full bg-stone-100 px-2 py-1 text-[0.62rem] font-bold uppercase tracking-wide text-stone-600 ring-1 ring-stone-200 sm:hidden">
          {expanded ? 'Hide' : 'Open'}
        </span>
      </button>

      <div className={expanded ? 'block pb-3' : 'hidden sm:block sm:pb-3'}>
        {/* Tab strip */}
        <div className="mx-3 mb-2 grid grid-cols-4 gap-1 rounded-xl bg-stone-100 p-1 ring-1 ring-stone-200">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={clsx(
                'rounded-lg py-1.5 text-[0.62rem] font-bold leading-tight transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600',
                activeTab === tab.id
                  ? 'bg-white text-stone-900 shadow-sm ring-1 ring-stone-200'
                  : 'text-stone-500 hover:text-stone-700',
              )}
            >
              {tab.label === 'Camera & Wildlife' ? (
                <>Camera<br />&amp; Wildlife</>
              ) : tab.label === 'Human Reports' ? (
                <>Human<br />Reports</>
              ) : (
                tab.label
              )}
            </button>
          ))}
        </div>

        {/* Human reports tagline */}
        {activeTab === 'human' ? (
          <p className="mx-3 mb-2 text-[0.68rem] font-semibold italic text-stone-500">
            Humans are sensors too.
          </p>
        ) : null}

        {/* Signal buttons — action triggers, not toggles */}
        <div className="mx-3 grid grid-cols-2 gap-1.5">
          {currentTab.signals.map((signal) => {
            const key = `${activeTab}-${signal.zoneId ?? 'garden'}-${signal.kind}`
            const justFired = lastFiredKey === key
            return (
              <button
                key={key}
                type="button"
                onClick={() => sendSignal(signal)}
                className={clsx(
                  'flex items-start gap-1.5 rounded-xl px-2.5 py-2 text-left text-[0.7rem] font-semibold leading-snug ring-1 transition-all duration-150',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600',
                  justFired
                    ? 'scale-[0.97] bg-stone-100 text-stone-500 ring-stone-200'
                    : 'bg-white text-stone-800 ring-stone-200 hover:bg-stone-50 hover:ring-stone-300 active:scale-[0.97]',
                )}
              >
                {/* Direction dot — visual hint only, not a persistent state */}
                <span
                  className={clsx(
                    'mt-1 h-1.5 w-1.5 shrink-0 rounded-full',
                    justFired
                      ? 'bg-stone-400'
                      : signal.direction === 'positive'
                        ? 'bg-emerald-400'
                        : 'bg-amber-400',
                  )}
                  aria-hidden="true"
                />
                <span>{justFired ? '✓ Sent' : signal.label}</span>
              </button>
            )
          })}
        </div>

        {/* Recent activity */}
        {recentActivity.length > 0 ? (
          <div className="mx-3 mt-3 border-t border-stone-100 pt-2.5">
            <p className="text-[0.6rem] font-bold uppercase tracking-wider text-stone-400">
              Recent signals
            </p>
            <ol className="mt-1.5 grid gap-1">
              {recentActivity.map((entry) => (
                <li
                  key={entry.id}
                  className="flex items-start gap-2 rounded-xl bg-stone-50 px-2.5 py-1.5 ring-1 ring-stone-100"
                >
                  <span
                    className={clsx(
                      'mt-0.5 shrink-0 text-[0.6rem] font-bold',
                      entry.direction === 'positive' ? 'text-emerald-500' : 'text-amber-500',
                    )}
                  >
                    {entry.direction === 'positive' ? '↑' : '↓'}
                  </span>
                  <span className="min-w-0 flex-1 text-[0.68rem] font-medium leading-snug text-stone-700">
                    {entry.message}
                  </span>
                  <span className="shrink-0 text-[0.62rem] text-stone-400">
                    {formatEventTime(entry.capturedAtISO)}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        ) : null}

        {/* Simulation Controls */}
        <div className="mx-3 mt-3 border-t border-stone-100 pt-2.5">
          <p className="text-[0.6rem] font-bold uppercase tracking-wider text-stone-400">
            Simulation Controls
          </p>
          <p className="mt-1 text-[0.65rem] text-stone-400">
            Explore how the garden reacts over time.
          </p>

          {/* Advance time */}
          <div className="mt-2 grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={() => advanceTime(6)}
              className="rounded-xl bg-stone-50 px-2.5 py-2 text-left text-[0.7rem] font-semibold text-stone-700 ring-1 ring-stone-200 transition hover:bg-stone-100 hover:ring-stone-300 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
            >
              ⏱ Advance 6 Hours
            </button>
            <button
              type="button"
              onClick={() => advanceTime(24)}
              className="rounded-xl bg-stone-50 px-2.5 py-2 text-left text-[0.7rem] font-semibold text-stone-700 ring-1 ring-stone-200 transition hover:bg-stone-100 hover:ring-stone-300 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
            >
              📅 Advance 24 Hours
            </button>
          </div>

          {/* Reset / Clear */}
          <div className="mt-1.5 grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={handleReset}
              disabled={isResetting}
              className="rounded-xl bg-stone-50 px-2.5 py-2 text-left text-[0.7rem] font-semibold text-stone-600 ring-1 ring-stone-200 transition hover:bg-rose-50 hover:text-rose-900 hover:ring-rose-200 active:scale-[0.97] disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
            >
              {isResetting ? '↺ Resetting…' : '↺ Reset Simulation'}
            </button>
            <button
              type="button"
              onClick={() => clearActivityLog()}
              className="rounded-xl bg-stone-50 px-2.5 py-2 text-left text-[0.7rem] font-semibold text-stone-600 ring-1 ring-stone-200 transition hover:bg-stone-100 hover:ring-stone-300 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
            >
              ✕ Clear Activity
            </button>
          </div>
        </div>
      </div>
    </aside>
  )
}
