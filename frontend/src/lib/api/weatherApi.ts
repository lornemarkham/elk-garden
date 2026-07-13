import { getApiBaseUrl } from '../apiBase'
import type { CurrentWeather } from '../../types/currentWeather'

export const WEATHER_CURRENT_PATH = '/api/weather/current'

export class WeatherApiError extends Error {
  readonly offline: boolean

  constructor(message: string, offline = false) {
    super(message)
    this.name = 'WeatherApiError'
    this.offline = offline
  }
}

export function isWeatherApiOfflineError(err: unknown): err is WeatherApiError {
  return err instanceof WeatherApiError && err.offline
}

function apiUrl(path: string): string {
  const base = getApiBaseUrl()
  return base ? `${base}${path}` : path
}

function isCurrentWeather(data: unknown): data is CurrentWeather {
  if (!data || typeof data !== 'object') return false
  const w = data as Record<string, unknown>
  return (
    w.source === 'open-meteo' &&
    w.location === 'Vernon, BC' &&
    typeof w.temperatureC === 'number' &&
    typeof w.humidityPct === 'number' &&
    typeof w.precipitationMm === 'number' &&
    typeof w.cloudCoverPct === 'number' &&
    typeof w.windKph === 'number' &&
    typeof w.fetchedAtISO === 'string'
  )
}

export async function getCurrentWeather(): Promise<CurrentWeather> {
  let res: Response
  try {
    res = await fetch(apiUrl(WEATHER_CURRENT_PATH))
  } catch {
    throw new WeatherApiError('Backend offline — start the API with npm run dev (port 8788).', true)
  }

  const data = await res.json().catch(() => null)
  if (!res.ok) {
    const message =
      data &&
      typeof data === 'object' &&
      'error' in data &&
      typeof (data as { error: unknown }).error === 'string'
        ? (data as { error: string }).error
        : `Weather request failed (${res.status}).`
    throw new WeatherApiError(message)
  }

  if (!isCurrentWeather(data)) {
    throw new WeatherApiError('The weather API sent an invalid response.')
  }

  return data
}
