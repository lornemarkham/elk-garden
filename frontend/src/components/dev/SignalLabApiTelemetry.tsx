import clsx from 'clsx'
import type { useApiTelemetryControls } from '../../lib/api/useApiTelemetryControls'
import { TELEMETRY_STATUS_LABEL } from '../../lib/sensorTelemetrySimulator'
import type { ApiTelemetryDisplayStatus } from '../../lib/api/useApiTelemetryControls'

export type ApiTelemetryControls = ReturnType<typeof useApiTelemetryControls>

const STATUS_LABEL: Record<ApiTelemetryDisplayStatus, string> = {
  ...TELEMETRY_STATUS_LABEL,
  offline: 'Backend offline',
}

function statusBadgeClass(status: ApiTelemetryDisplayStatus): string {
  switch (status) {
    case 'live':
      return 'bg-emerald-50 text-emerald-900 ring-emerald-200'
    case 'stale':
      return 'bg-amber-50 text-amber-900 ring-amber-200'
    case 'offline':
      return 'bg-rose-50 text-rose-900 ring-rose-200'
    case 'no-data':
      return 'bg-stone-100 text-stone-700 ring-stone-200'
    default:
      return 'bg-stone-100 text-stone-700 ring-stone-200'
  }
}

function formatMetric(value: number | undefined, unit: string): string {
  if (value == null || Number.isNaN(value)) return '—'
  return `${value}${unit}`
}

function formatReceivedAt(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })
}

const btn =
  'rounded-xl px-2 py-1.5 text-[0.65rem] font-semibold leading-snug ring-1 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 disabled:cursor-not-allowed disabled:opacity-50'
const btnPrimary = `${btn} bg-emerald-700 text-white ring-emerald-800 hover:bg-emerald-800`
const btnSecondary = `${btn} bg-white text-stone-800 ring-stone-200 hover:bg-stone-50`

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2 text-[0.65rem]">
      <span className="text-stone-500">{label}</span>
      <span className="font-semibold tabular-nums text-stone-900">{value}</span>
    </div>
  )
}

export function SignalLabApiTelemetry({ api }: { api: ApiTelemetryControls }) {
  const r = api.reading?.readings

  return (
    <section className="rounded-xl bg-sky-50/80 p-2.5 ring-1 ring-sky-200">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[0.6rem] font-bold uppercase tracking-wider text-sky-800">
            API telemetry
          </p>
          <p className="mt-0.5 text-[0.65rem] leading-snug text-sky-900/80">
            One POST per click — inspect in API Explorer below.
          </p>
        </div>
        <span
          className={clsx(
            'inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[0.58rem] font-bold uppercase tracking-wide ring-1',
            statusBadgeClass(api.telemetryStatus),
          )}
        >
          <span
            className={clsx(
              'h-1.5 w-1.5 rounded-full',
              api.telemetryStatus === 'live' && 'animate-pulse bg-emerald-500',
              api.telemetryStatus === 'stale' && 'bg-amber-500',
              api.telemetryStatus === 'offline' && 'bg-rose-500',
              api.telemetryStatus === 'no-data' && 'bg-stone-400',
            )}
            aria-hidden="true"
          />
          {STATUS_LABEL[api.telemetryStatus]}
        </span>
      </div>

      <div className="mt-2 space-y-0.5 rounded-lg bg-white/70 px-2 py-1.5 ring-1 ring-sky-100">
        {api.loading ? (
          <p className="text-[0.65rem] text-stone-600">Loading…</p>
        ) : api.reading ? (
          <>
            <Metric label="Received" value={formatReceivedAt(api.reading.receivedAtISO)} />
            <Metric label="nodeId" value={api.reading.nodeId} />
            <Metric label="zoneId" value={api.reading.zoneId} />
            <Metric label="airTempC" value={formatMetric(r?.airTempC, '°C')} />
            <Metric label="humidityPct" value={formatMetric(r?.humidityPct, '%')} />
            <Metric label="soilMoistureRaw" value={formatMetric(r?.soilMoistureRaw, '')} />
            <Metric label="soilTempC" value={formatMetric(r?.soilTempC, '°C')} />
          </>
        ) : (
          <p className="text-[0.65rem] text-stone-600">No reading yet — try Next Signal.</p>
        )}
      </div>

      {api.error ? (
        <p className="mt-2 rounded-lg bg-rose-50 px-2 py-1 text-[0.65rem] font-medium text-rose-950 ring-1 ring-rose-200">
          {api.error}
        </p>
      ) : null}

      {api.lastChangeExplanation ? (
        <p className="mt-2 rounded-lg bg-white/80 px-2 py-1 text-[0.62rem] leading-snug text-sky-950 ring-1 ring-sky-100">
          <span className="font-bold">Last change: </span>
          {api.lastChangeExplanation}
        </p>
      ) : null}

      <div className="mt-2 grid grid-cols-2 gap-1">
        <button
          type="button"
          onClick={() => void api.onNextSignal()}
          disabled={api.sending || api.loading}
          className={btnPrimary}
        >
          {api.sending ? 'Sending…' : 'Next Signal'}
        </button>
        <button
          type="button"
          onClick={() => void api.onResetSignals()}
          disabled={api.sending || api.loading}
          className={btnSecondary}
        >
          Reset Signals
        </button>
        <button
          type="button"
          onClick={() => void api.onSendTestReading()}
          disabled={api.sending || api.loading}
          className={clsx(btnSecondary, 'col-span-2')}
        >
          Send Test Reading (no tick)
        </button>
      </div>
    </section>
  )
}
