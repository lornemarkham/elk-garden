import { useCallback, useEffect, useState } from 'react'
import {
  getLiveSensor,
  isLiveSensorApiOfflineError,
  type LiveSensorResponse,
} from './liveSensorApi'

const POLL_MS = 200

export function useLiveSensorPoll() {
  const [snapshot, setSnapshot] = useState<LiveSensorResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    try {
      const data = await getLiveSensor()
      setSnapshot(data)
      setError(null)
    } catch (err) {
      if (isLiveSensorApiOfflineError(err)) {
        setError('Backend offline')
        return
      }
      setError(err instanceof Error ? err.message : 'Could not load live sensor data.')
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    const runInitial = async () => {
      setLoading(true)
      await refresh()
      if (!cancelled) setLoading(false)
    }

    void runInitial()
    const pollId = window.setInterval(() => void refresh(), POLL_MS)

    return () => {
      cancelled = true
      window.clearInterval(pollId)
    }
  }, [refresh])

  return {
    snapshot,
    loading,
    error,
    isLive: snapshot?.connected === true,
  }
}
