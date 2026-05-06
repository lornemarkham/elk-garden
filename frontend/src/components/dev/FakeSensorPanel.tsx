import { useState } from 'react'
import { useGardenStore } from '../../lib/garden/GardenStore'
import type { GardenSignalEvent, GardenSignalKind } from '../../lib/garden/sensorIngestion'

type FakeSensorButton = {
  label: string
  zoneId: string
  kind: GardenSignalKind
  value?: number
  severity: GardenSignalEvent['severity']
  metadata?: GardenSignalEvent['metadata']
}

type RecentFakeEvent = {
  id: string
  label: string
  zoneLabel: string
  capturedAtISO: string
  added: boolean
}

const FAKE_EVENTS: FakeSensorButton[] = [
  {
    label: 'Zone 1: Low water saturation / dry soil',
    zoneId: 'zone_tomatoes',
    kind: 'soil-moisture-low',
    value: 21,
    severity: 'warning',
    metadata: {
      sensorLabel: 'Zone 1 tomato bed moisture probe',
      confidence: 'high',
      suggestedVerificationAction:
        'Check the top inch of soil around the tomato roots before watering.',
      readingUnit: 'percent',
    },
  },
  {
    label: 'Zone 2: Bug activity suspected',
    zoneId: 'zone_greens',
    kind: 'pest-activity',
    severity: 'warning',
    metadata: {
      rowId: 'zone_greens_row_4',
      rowLabel: 'Row 4',
      sensorLabel: 'Greens camera classifier',
      confidence: 'medium',
      suggestedVerificationAction:
        'Inspect the underside of leaves in Row 4 for eggs, aphids, or chew marks.',
      detector: 'fake image classifier',
    },
  },
  {
    label: 'Zone 2: Deer activity detected',
    zoneId: 'zone_greens',
    kind: 'animal-activity',
    severity: 'warning',
    metadata: {
      sensorLabel: 'North fence camera',
      confidence: 'medium',
      suggestedVerificationAction:
        'Review the camera clip and check nearby greens for nibbled leaves.',
      detector: 'fake motion sensor',
      species: 'deer',
    },
  },
  {
    label: 'Zone 3: Too much sun / heat stress',
    zoneId: 'zone_roots',
    kind: 'heat-stress',
    value: 91,
    severity: 'warning',
    metadata: {
      rowId: 'zone_roots_west_row',
      rowLabel: 'west row',
      sensorLabel: 'West row temperature sensor',
      confidence: 'medium',
      suggestedVerificationAction:
        'Check the west row for leaf curl, wilting, or dry soil crust.',
      readingUnit: 'fahrenheit',
    },
  },
]

const ZONE_LABELS: Record<string, string> = {
  zone_tomatoes: 'Zone 1',
  zone_greens: 'Zone 2',
  zone_roots: 'Zone 3',
}

function createFakeSensorEvent(config: FakeSensorButton): GardenSignalEvent {
  const capturedAtISO = new Date().toISOString()
  return {
    source: 'fake-dev-panel',
    zoneId: config.zoneId,
    kind: config.kind,
    value: config.value,
    severity: config.severity,
    capturedAtISO,
    metadata: {
      ...config.metadata,
      detectedAtISO: capturedAtISO,
      ...(config.kind === 'animal-activity'
        ? { reviewWindow: formatReviewWindow(capturedAtISO) }
        : {}),
    },
  }
}

function formatReviewWindow(capturedAtISO: string) {
  const end = new Date(capturedAtISO)
  const start = new Date(end.getTime() - 4 * 60_000)
  return `${formatEventTime(start.toISOString())} to ${formatEventTime(
    end.toISOString(),
  )}`
}

function formatEventTime(capturedAtISO: string) {
  return new Date(capturedAtISO).toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function FakeSensorPanel() {
  const { garden, ingestSignal } = useGardenStore()
  const [recentEvents, setRecentEvents] = useState<RecentFakeEvent[]>([])

  if (!garden || import.meta.env.PROD) return null

  const sendFakeEvent = (config: FakeSensorButton) => {
    // Fake panel: temporary hardware simulator. UI should react to garden state, not panel state.
    const event = createFakeSensorEvent(config)
    const result = ingestSignal(event)
    setRecentEvents((events) =>
      [
        {
          id: `${event.capturedAtISO}-${config.zoneId}-${config.kind}`,
          label: config.label.replace(/^Zone \d: /, ''),
          zoneLabel: ZONE_LABELS[config.zoneId] ?? config.zoneId,
          capturedAtISO: event.capturedAtISO,
          added: result?.added ?? false,
        },
        ...events,
      ].slice(0, 5),
    )
  }

  const lastEvent = recentEvents[0]

  return (
    <aside className="fixed right-3 top-3 z-40 w-[min(19rem,calc(100vw-1.5rem))] rounded-2xl bg-white/95 p-3 text-xs shadow-xl ring-1 ring-stone-200 backdrop-blur">
      <div>
        <p className="font-bold text-stone-900">Fake Sensor Panel</p>
        <p className="mt-0.5 text-[0.68rem] leading-snug text-stone-500">
          Temporary local hardware simulator for future Arduino, camera, and
          weather input.
        </p>
      </div>

      {lastEvent ? (
        <div className="mt-3 rounded-2xl bg-emerald-50 px-3 py-2 ring-1 ring-emerald-100">
          <p className="text-[0.62rem] font-bold uppercase tracking-wide text-emerald-700">
            Last sent
          </p>
          <p className="mt-0.5 font-bold text-emerald-950">
            {lastEvent.zoneLabel}: {lastEvent.label}
          </p>
          <p className="mt-1 text-[0.68rem] font-semibold text-emerald-800">
            {lastEvent.added
              ? 'New task/recommendation added'
              : 'Already active, no duplicate added'}
          </p>
        </div>
      ) : null}

      <div className="mt-3 grid gap-1.5">
        {FAKE_EVENTS.map((event) => (
          <button
            key={`${event.zoneId}-${event.kind}`}
            type="button"
            onClick={() => sendFakeEvent(event)}
            className="rounded-xl bg-stone-50 px-3 py-2 text-left font-semibold text-stone-800 ring-1 ring-stone-200 transition hover:bg-emerald-50 hover:text-emerald-950 hover:ring-emerald-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
          >
            {event.label}
          </button>
        ))}
      </div>

      {recentEvents.length > 0 ? (
        <div className="mt-3 border-t border-stone-200 pt-2">
          <p className="text-[0.62rem] font-bold uppercase tracking-wide text-stone-500">
            Recent Fake Events
          </p>
          <ol className="mt-1.5 grid gap-1">
            {recentEvents.map((event) => (
              <li
                key={event.id}
                className="flex items-start justify-between gap-2 rounded-xl bg-stone-50 px-2.5 py-1.5 text-[0.68rem] ring-1 ring-stone-100"
              >
                <span className="min-w-0">
                  <span className="font-bold text-stone-800">{event.zoneLabel}</span>
                  <span className="text-stone-500"> · {event.label}</span>
                </span>
                <span className="shrink-0 font-semibold text-stone-500">
                  {formatEventTime(event.capturedAtISO)}
                </span>
              </li>
            ))}
          </ol>
        </div>
      ) : null}
    </aside>
  )
}
