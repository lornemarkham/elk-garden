import clsx from 'clsx'
import { useLiveSensorPoll } from '../../lib/api/useLiveSensorPoll'

/** ESP32 ADC raw values are typically 0–4095 (12-bit). */
const MOISTURE_RAW_MAX = 4095

function formatReceivedAt(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString([], { dateStyle: 'medium', timeStyle: 'medium' })
}

function formatMoisture(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return '—'
  return Math.round(value).toLocaleString()
}

function moistureBarPct(raw: number | null | undefined): number {
  if (raw == null || Number.isNaN(raw)) return 0
  return Math.max(0, Math.min(100, (raw / MOISTURE_RAW_MAX) * 100))
}

/** Temporary dev panel — polls GET /api/live-sensor every 200ms. */
export function LiveSensorDevPanel() {
  const { snapshot, loading, error, isLive } = useLiveSensorPoll()
  const moisture = snapshot?.soilMoistureRaw
  const barPct = moistureBarPct(moisture)

  return (
    <section
      className="mb-5 overflow-hidden rounded-[2rem] bg-stone-950 p-6 text-white shadow-lg ring-4 ring-emerald-400/80 sm:mb-6 sm:p-10"
      aria-label="Live ESP32 sensor debug panel"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <h2 className="font-mono text-3xl font-black uppercase tracking-[0.2em] text-emerald-300 sm:text-5xl">
          Live ESP32
        </h2>
        <span
          className={clsx(
            'inline-flex items-center gap-2.5 rounded-full px-5 py-2.5 text-lg font-black uppercase tracking-wider ring-2',
            isLive
              ? 'bg-emerald-500 text-emerald-950 ring-emerald-300'
              : 'bg-stone-800 text-stone-400 ring-stone-600',
          )}
        >
          <span
            className={clsx(
              'h-4 w-4 rounded-full',
              isLive ? 'animate-pulse bg-emerald-200 shadow-[0_0_12px_rgba(167,243,208,0.9)]' : 'bg-stone-500',
            )}
            aria-hidden="true"
          />
          {isLive ? 'Live' : 'Not live'}
        </span>
      </div>

      <div className="mt-8 text-center sm:mt-10">
        <p className="text-sm font-semibold uppercase tracking-[0.25em] text-stone-400 sm:text-base">
          Soil moisture (raw)
        </p>
        <p
          className="mt-2 font-mono text-[5.5rem] font-black leading-none tracking-tight text-white sm:text-[8rem]"
          aria-live="polite"
        >
          {loading && moisture == null ? '…' : formatMoisture(moisture)}
        </p>
      </div>

      <div className="mx-auto mt-8 max-w-xl sm:mt-10">
        <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-stone-500">
          <span>Dry</span>
          <span>Wet</span>
        </div>
        <div className="mt-2 h-8 overflow-hidden rounded-full bg-stone-800 ring-2 ring-stone-700">
          <div
            className="h-full rounded-full bg-gradient-to-r from-amber-400 via-emerald-400 to-sky-400 transition-[width] duration-150 ease-out"
            style={{ width: `${barPct}%` }}
          />
        </div>
        <p className="mt-2 text-center font-mono text-sm text-stone-500">
          {moisture != null ? `${barPct.toFixed(1)}% of ${MOISTURE_RAW_MAX}` : '—'}
        </p>
      </div>

      <div className="mt-8 grid gap-4 border-t border-stone-800 pt-5 text-center sm:mt-10 sm:grid-cols-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">
            Last update
          </p>
          <p className="mt-2 font-mono text-xl font-bold text-stone-200 sm:text-2xl">
            {formatReceivedAt(snapshot?.lastUpdate)}
          </p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">
            POST count
          </p>
          <p className="mt-2 font-mono text-xl font-bold text-emerald-300 sm:text-2xl">
            {snapshot?.postCount ?? 0}
          </p>
        </div>
      </div>

      {error ? (
        <p className="mt-4 rounded-xl bg-rose-950/80 px-4 py-3 text-center text-sm font-semibold text-rose-200 ring-1 ring-rose-800">
          {error}
        </p>
      ) : null}

      {!loading && snapshot?.postCount === 0 && !error ? (
        <p className="mt-4 text-center text-sm font-medium text-stone-500">
          No readings yet — waiting for ESP32 POST…
        </p>
      ) : null}
    </section>
  )
}
