import { useCallback, useEffect, useState } from 'react'
import { setSignalMixCategory } from '../signalLab/signalLabMix'
import type { CurrentWeather } from '../../types/currentWeather'
import { getCurrentWeather, isWeatherApiOfflineError } from './weatherApi'
import { setSharedCurrentWeather } from './sharedCurrentWeather'

export function useWeatherControls() {
  const [weather, setWeather] = useState<CurrentWeather | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const next = await getCurrentWeather()
      setWeather(next)
      setSharedCurrentWeather(next)
      setSignalMixCategory('weather', 'api-backed')
    } catch (err) {
      const message = isWeatherApiOfflineError(err)
        ? err.message
        : err instanceof Error
          ? err.message
          : 'Could not load weather.'
      setError(message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  return { weather, loading, error, refresh }
}
