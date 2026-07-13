import { useSyncExternalStore } from 'react'
import type { CurrentWeather } from '../../types/currentWeather'
import {
  getSharedCurrentWeatherSnapshot,
  subscribeSharedCurrentWeather,
} from './sharedCurrentWeather'

export function useSharedCurrentWeather(): CurrentWeather | null {
  const snapshot = useSyncExternalStore(
    subscribeSharedCurrentWeather,
    getSharedCurrentWeatherSnapshot,
    getSharedCurrentWeatherSnapshot,
  )
  return snapshot.weather
}
