import { useCallback, useEffect, useRef, useState } from 'react'
import {
  advanceSimReadings,
  getTelemetryStatus,
  initialSimReadings,
  toSensorReadingInput,
  type TelemetryStatus,
} from '../sensorTelemetrySimulator'
import type { SensorReading } from '../../types/sensorReading'
import {
  getLatestSensorReading,
  isSensorApiOfflineError,
  postSensorReading,
} from './sensorReadingsApi'
import { setSharedLatestSensorReading } from './sharedLatestSensorReading'
import { useSensorApiTrace } from './useSensorApiTrace'
import { resetSignalMix, setSignalMixCategory } from '../signalLab/signalLabMix'

export type ApiTelemetryDisplayStatus = TelemetryStatus | 'offline'

export function useApiTelemetryControls() {
  const { backendOffline } = useSensorApiTrace()
  const [reading, setReading] = useState<SensorReading | null>(null)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [lastChangeExplanation, setLastChangeExplanation] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [clock, setClock] = useState(() => Date.now())

  const simReadingsRef = useRef(initialSimReadings())
  const tickCountRef = useRef(0)

  const refresh = useCallback(async (trigger = 'refresh') => {
    setError(null)
    try {
      const latest = await getLatestSensorReading(undefined, { trigger })
      setReading(latest)
    } catch (err) {
      setError(
        isSensorApiOfflineError(err)
          ? 'Backend offline — start the API with npm run dev (port 8788).'
          : err instanceof Error
            ? err.message
            : 'Could not load sensor reading.',
      )
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      await refresh('page-load')
      if (!cancelled) setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [refresh])

  useEffect(() => {
    setSharedLatestSensorReading(reading)
  }, [reading])

  useEffect(() => {
    const id = window.setInterval(() => setClock(Date.now()), 1_000)
    return () => window.clearInterval(id)
  }, [])

  const telemetryStatus: ApiTelemetryDisplayStatus = backendOffline
    ? 'offline'
    : getTelemetryStatus(reading, { now: clock })

  const postOneReading = async (trigger: string) => {
    tickCountRef.current += 1
    const { readings: next, explanation } = advanceSimReadings(
      simReadingsRef.current,
      tickCountRef.current,
    )
    simReadingsRef.current = next
    const saved = await postSensorReading(toSensorReadingInput(next), { trigger })
    setReading(saved)
    setLastChangeExplanation(explanation)
    setSignalMixCategory('moisture', 'api-backed')
    setError(null)
    return saved
  }

  const onNextSignal = async () => {
    setSending(true)
    setError(null)
    try {
      await postOneReading('next-signal')
    } catch (err) {
      setError(
        isSensorApiOfflineError(err)
          ? 'Backend offline — start the API with npm run dev (port 8788).'
          : err instanceof Error
            ? err.message
            : 'Could not send the next signal.',
      )
    } finally {
      setSending(false)
    }
  }

  const onSendTestReading = async () => {
    setSending(true)
    setError(null)
    try {
      await postSensorReading(toSensorReadingInput(simReadingsRef.current), {
        trigger: 'send-test-reading',
      }).then((saved) => {
        setReading(saved)
        setSignalMixCategory('moisture', 'api-backed')
      })
    } catch (err) {
      setError(
        isSensorApiOfflineError(err)
          ? 'Backend offline — start the API with npm run dev (port 8788).'
          : err instanceof Error
            ? err.message
            : 'Could not send test reading.',
      )
    } finally {
      setSending(false)
    }
  }

  const onResetSignals = async () => {
    setSending(true)
    setError(null)
    simReadingsRef.current = initialSimReadings()
    tickCountRef.current = 0
    setLastChangeExplanation(null)
    resetSignalMix()
    try {
      await refresh('reset-signals')
    } catch {
      setReading(null)
    } finally {
      setSending(false)
    }
  }

  return {
    reading,
    loading,
    sending,
    lastChangeExplanation,
    error,
    telemetryStatus,
    refresh,
    onNextSignal,
    onSendTestReading,
    onResetSignals,
  }
}
