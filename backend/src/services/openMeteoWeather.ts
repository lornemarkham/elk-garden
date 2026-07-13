import type { CurrentWeather } from '../types/currentWeather.js'

const VERNON_LAT = 50.267
const VERNON_LON = -119.272

const OPEN_METEO_URL = new URL('https://api.open-meteo.com/v1/forecast')
OPEN_METEO_URL.searchParams.set('latitude', String(VERNON_LAT))
OPEN_METEO_URL.searchParams.set('longitude', String(VERNON_LON))
OPEN_METEO_URL.searchParams.set(
  'current',
  'temperature_2m,relative_humidity_2m,precipitation,cloud_cover,wind_speed_10m',
)
OPEN_METEO_URL.searchParams.set('daily', 'temperature_2m_max,temperature_2m_min')
OPEN_METEO_URL.searchParams.set('timezone', 'America/Vancouver')
OPEN_METEO_URL.searchParams.set('wind_speed_unit', 'kmh')

function requireNumber(value: unknown, field: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`Open-Meteo response missing ${field}.`)
  }
  return value
}

export async function fetchVernonCurrentWeather(): Promise<CurrentWeather> {
  const res = await fetch(OPEN_METEO_URL, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(12_000),
  })

  if (!res.ok) {
    throw new Error(`Open-Meteo request failed (${res.status}).`)
  }

  const data = (await res.json()) as {
    current?: Record<string, unknown>
    daily?: {
      temperature_2m_max?: number[]
      temperature_2m_min?: number[]
    }
  }

  const current = data.current
  if (!current || typeof current !== 'object') {
    throw new Error('Open-Meteo response missing current conditions.')
  }

  const weather: CurrentWeather = {
    source: 'open-meteo',
    location: 'Vernon, BC',
    temperatureC: requireNumber(current.temperature_2m, 'temperature_2m'),
    humidityPct: requireNumber(current.relative_humidity_2m, 'relative_humidity_2m'),
    precipitationMm: requireNumber(current.precipitation, 'precipitation'),
    cloudCoverPct: requireNumber(current.cloud_cover, 'cloud_cover'),
    windKph: requireNumber(current.wind_speed_10m, 'wind_speed_10m'),
    fetchedAtISO: new Date().toISOString(),
  }

  const high = data.daily?.temperature_2m_max?.[0]
  const low = data.daily?.temperature_2m_min?.[0]
  if (typeof high === 'number' && Number.isFinite(high)) weather.highTempC = high
  if (typeof low === 'number' && Number.isFinite(low)) weather.lowTempC = low

  return weather
}
