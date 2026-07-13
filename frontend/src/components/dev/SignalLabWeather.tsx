import clsx from 'clsx'
import type { useWeatherControls } from '../../lib/api/useWeatherControls'

export type WeatherControls = ReturnType<typeof useWeatherControls>

function formatFetchedAt(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2 text-[0.65rem]">
      <span className="text-stone-500">{label}</span>
      <span className="font-semibold tabular-nums text-stone-900">{value}</span>
    </div>
  )
}

const btn =
  'rounded-xl px-2 py-1.5 text-[0.65rem] font-semibold leading-snug ring-1 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 disabled:cursor-not-allowed disabled:opacity-50'
const btnPrimary = `${btn} bg-violet-700 text-white ring-violet-800 hover:bg-violet-800`

export function SignalLabWeather({ weather: controls }: { weather: WeatherControls }) {
  const w = controls.weather

  return (
    <section className="rounded-xl bg-violet-50/80 p-2.5 ring-1 ring-violet-200">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[0.6rem] font-bold uppercase tracking-wider text-violet-800">
            Real weather API
          </p>
          <p className="mt-0.5 text-[0.65rem] leading-snug text-violet-900/80">
            Vernon, BC via Open-Meteo — cloud cover adjusts zone sunlight.
          </p>
        </div>
        <span className="inline-flex shrink-0 rounded-full bg-violet-100 px-2 py-0.5 text-[0.58rem] font-bold uppercase tracking-wide text-violet-900 ring-1 ring-violet-200">
          Open-Meteo
        </span>
      </div>

      <div className="mt-2 space-y-0.5 rounded-lg bg-white/70 px-2 py-1.5 ring-1 ring-violet-100">
        {controls.loading && !w ? (
          <p className="text-[0.65rem] text-stone-600">Loading Vernon weather…</p>
        ) : w ? (
          <>
            <Metric label="Source" value={w.source} />
            <Metric label="Location" value={w.location} />
            <Metric label="Temperature" value={`${w.temperatureC}°C`} />
            <Metric label="Humidity" value={`${w.humidityPct}%`} />
            <Metric label="Cloud cover" value={`${w.cloudCoverPct}%`} />
            <Metric label="Precipitation" value={`${w.precipitationMm} mm`} />
            <Metric label="Wind" value={`${w.windKph} km/h`} />
            {w.highTempC != null && w.lowTempC != null ? (
              <Metric label="Today high/low" value={`${w.highTempC}°C / ${w.lowTempC}°C`} />
            ) : null}
            <Metric label="Fetched" value={formatFetchedAt(w.fetchedAtISO)} />
          </>
        ) : (
          <p className="text-[0.65rem] text-stone-600">No weather yet — try Refresh.</p>
        )}
      </div>

      {controls.error ? (
        <p className="mt-2 rounded-lg bg-rose-50 px-2 py-1 text-[0.65rem] font-medium text-rose-950 ring-1 ring-rose-200">
          {controls.error}
        </p>
      ) : null}

      <button
        type="button"
        onClick={() => void controls.refresh()}
        disabled={controls.loading}
        className={clsx(btnPrimary, 'mt-2 w-full')}
      >
        {controls.loading ? 'Refreshing…' : 'Refresh Weather'}
      </button>
    </section>
  )
}
