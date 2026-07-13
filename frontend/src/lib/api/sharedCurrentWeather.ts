import type { CurrentWeather } from '../../types/currentWeather'

type WeatherSnapshot = {
  weather: CurrentWeather | null
}

export const EMPTY_WEATHER_SNAPSHOT: WeatherSnapshot = Object.freeze({ weather: null })

let current: CurrentWeather | null = null
let cachedSnapshot: WeatherSnapshot = EMPTY_WEATHER_SNAPSHOT

const listeners = new Set<() => void>()

function publish() {
  cachedSnapshot = { weather: current }
  for (const fn of listeners) fn()
}

export function getSharedCurrentWeatherSnapshot(): WeatherSnapshot {
  return cachedSnapshot
}

export function subscribeSharedCurrentWeather(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function setSharedCurrentWeather(weather: CurrentWeather | null) {
  current = weather
  publish()
}
