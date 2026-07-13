import clsx from 'clsx'
import { ChevronDown, Terminal } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import type { ApiTraceRecord } from '../lib/api/sensorApiTrace'
import { useSensorApiTrace } from '../lib/api/useSensorApiTrace'
import { Card } from './Card'

const EDUCATION = [
  { term: 'POST', text: 'Send new data to the server — here, a sensor reading to save.' },
  { term: 'GET', text: 'Ask the server for data without changing anything — here, the latest reading.' },
  { term: 'JSON', text: 'Structured text both the browser and backend can read (objects with keys and values).' },
  { term: 'Endpoint', text: 'A specific URL path the API listens on, like /api/sensor-readings.' },
  { term: 'Backend state', text: 'Data the server keeps between requests. ELK Garden uses an in-memory array for now.' },
  { term: 'Polling', text: 'The frontend calls GET on a timer (every 3s during simulation) to stay up to date.' },
] as const

const FLOW_STEPS = [
  { label: 'Frontend', detail: 'React dashboard & Live Sensor panel' },
  { label: 'API Request', detail: 'fetch() sends HTTP over the network' },
  { label: 'Express Backend', detail: 'Node server on port 8788 handles routes' },
  { label: 'In-memory Store', detail: 'Readings array in server RAM' },
  { label: 'API Response', detail: 'JSON + status code back to browser' },
  { label: 'Frontend Refresh', detail: 'UI updates with new telemetry' },
] as const

function formatJson(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}

function formatTraceTime(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString()
}

function statusTone(code: number): string {
  if (code === 0) return 'text-rose-400'
  if (code >= 200 && code < 300) return 'text-emerald-400'
  if (code === 404) return 'text-amber-400'
  return 'text-rose-400'
}

function TraceField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <>
      <dt className="text-stone-500">{label}</dt>
      <dd className="mt-0.5 mb-3">{children}</dd>
    </>
  )
}

function TraceDetail({ trace }: { trace: ApiTraceRecord }) {
  return (
    <dl className="font-mono text-xs">
      <TraceField label="Method">
        <span className="font-bold text-sky-300">{trace.method}</span>
      </TraceField>
      <TraceField label="Endpoint">
        <span className="break-all text-emerald-300">{trace.endpoint}</span>
      </TraceField>
      <TraceField label="Path">
        <span className="text-stone-300">{trace.path}</span>
      </TraceField>
      <TraceField label="Timestamp">
        <span className="text-stone-300">{formatTraceTime(trace.timestampISO)}</span>
      </TraceField>
      {trace.trigger ? (
        <TraceField label="Triggered by">
          <span className="text-violet-300">{trace.trigger}</span>
        </TraceField>
      ) : null}
      <TraceField label="Status code">
        <span className={clsx('font-bold', statusTone(trace.statusCode))}>
          {trace.statusCode}
        </span>
      </TraceField>
      {trace.requestBody !== undefined ? (
        <TraceField label="Request JSON">
          <pre className="mt-1 max-h-40 overflow-auto rounded-lg bg-stone-950/80 p-2 text-[0.65rem] leading-relaxed text-stone-200">
            {formatJson(trace.requestBody)}
          </pre>
        </TraceField>
      ) : null}
      <TraceField label="Response JSON">
        <pre className="mt-1 max-h-48 overflow-auto rounded-lg bg-stone-950/80 p-2 text-[0.65rem] leading-relaxed text-stone-200">
          {formatJson(trace.responseBody)}
        </pre>
      </TraceField>
    </dl>
  )
}

function TraceBlock({
  title,
  emptyHint,
  trace,
}: {
  title: string
  emptyHint: string
  trace: ApiTraceRecord | null
}) {
  return (
    <section className="rounded-xl ring-1 ring-stone-700/80 bg-stone-900/95">
      <header className="border-b border-stone-700/80 px-3 py-2 sm:px-4">
        <h3 className="font-mono text-xs font-bold uppercase tracking-wide text-stone-300">
          {title}
        </h3>
      </header>
      <section className="p-3 sm:p-4">
        {!trace ? (
          <p className="font-mono text-xs text-stone-500">{emptyHint}</p>
        ) : (
          <TraceDetail trace={trace} />
        )}
      </section>
    </section>
  )
}

function PipelineDiagram() {
  return (
    <ol className="relative space-y-0 border-l-2 border-emerald-500/60 pl-4">
      {FLOW_STEPS.map((step, i) => (
        <li key={step.label} className="relative pb-4 last:pb-0">
          <span
            className="absolute -left-[1.35rem] top-0.5 grid h-5 w-5 place-items-center rounded-full bg-emerald-600 text-[0.6rem] font-bold text-white"
            aria-hidden="true"
          >
            {i + 1}
          </span>
          <p className="text-sm font-bold text-stone-950">{step.label}</p>
          <p className="mt-0.5 text-xs leading-relaxed text-stone-600">{step.detail}</p>
          {i < FLOW_STEPS.length - 1 ? (
            <span className="mt-2 block text-center text-xs font-bold text-emerald-600" aria-hidden="true">
              ↓
            </span>
          ) : null}
        </li>
      ))}
    </ol>
  )
}

function FlowVisualizer() {
  const parts = [
    'Frontend',
    'POST /api/sensor-readings',
    'Backend Store',
    'GET /api/sensor-readings/latest',
    'Dashboard UI',
  ]
  return (
    <p className="overflow-x-auto rounded-xl bg-stone-900 px-3 py-2.5 font-mono text-[0.65rem] leading-relaxed text-emerald-300 sm:text-xs">
      {parts.join('  →  ')}
    </p>
  )
}

export function ApiExplorerPanel() {
  const [open, setOpen] = useState(true)
  const { lastPost, lastGet, backendOffline } = useSensorApiTrace()

  return (
    <Card className="mb-5 overflow-hidden sm:mb-6">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left sm:px-5 sm:py-4"
        aria-expanded={open}
      >
        <span className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-stone-900 ring-1 ring-stone-700">
            <Terminal className="h-4 w-4 text-emerald-400" aria-hidden="true" />
          </span>
          <span>
            <span className="block text-xs font-bold uppercase tracking-wide text-stone-500">
              Developer panel
            </span>
            <span className="block text-base font-semibold text-stone-950">
              API Explorer — Learn the System
            </span>
          </span>
        </span>
        <ChevronDown
          className={clsx('h-5 w-5 shrink-0 text-stone-500 transition', open && 'rotate-180')}
          aria-hidden="true"
        />
      </button>

      {open ? (
        <>
          <section className="space-y-5 border-t border-stone-200 px-4 pb-4 pt-4 sm:px-5 sm:pb-5">
            {backendOffline ? (
              <p
                className="rounded-2xl bg-amber-50 px-4 py-3 text-sm font-medium text-amber-950 ring-1 ring-amber-200"
                role="status"
              >
                Backend offline — the learning panel still works, but HTTP calls cannot reach
                Express. Run <strong>npm run dev</strong> to start the API on port 8788.
              </p>
            ) : null}

            <section>
              <h3 className="text-sm font-bold text-stone-950">How data moves</h3>
              <p className="mt-1 text-xs leading-relaxed text-stone-600">
                Each button in Live Sensor Node triggers real HTTP calls you can inspect below.
              </p>
              <section className="mt-3">
                <PipelineDiagram />
              </section>
            </section>

            <section>
              <h3 className="text-sm font-bold text-stone-950">API flow (one line)</h3>
              <section className="mt-2">
                <FlowVisualizer />
              </section>
            </section>

            <section>
              <h3 className="text-sm font-bold text-stone-950">Quick definitions</h3>
              <ul className="mt-2 grid gap-2 sm:grid-cols-2">
                {EDUCATION.map((item) => (
                  <li
                    key={item.term}
                    className="rounded-xl bg-stone-50 px-3 py-2 ring-1 ring-stone-200"
                  >
                    <p className="text-xs font-bold text-emerald-800">{item.term}</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-stone-700">{item.text}</p>
                  </li>
                ))}
              </ul>
            </section>

            <section className="grid gap-4 lg:grid-cols-2">
              <TraceBlock
                title="Latest POST (Send Test Reading / Simulation)"
                emptyHint="Click Send Test Reading or Start Simulation to capture a POST."
                trace={lastPost}
              />
              <TraceBlock
                title="Latest GET Request"
                emptyHint="Loads on page open, Refresh, or during simulation polling."
                trace={lastGet}
              />
            </section>

            <p className="text-xs leading-relaxed text-stone-500">
              Tip: Use <strong className="text-stone-700">Send Test Reading</strong> for a single
              POST trace, then watch GET traces appear when the dashboard refreshes.
            </p>
          </section>
        </>
      ) : null}
    </Card>
  )
}
