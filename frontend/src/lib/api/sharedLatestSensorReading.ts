import type { SensorReading } from '../../types/sensorReading'

type ReadingSnapshot = {
  reading: SensorReading | null
}

export const EMPTY_READING_SNAPSHOT: ReadingSnapshot = Object.freeze({ reading: null })

let latest: SensorReading | null = null
let cachedSnapshot: ReadingSnapshot = EMPTY_READING_SNAPSHOT

const listeners = new Set<() => void>()

function publish() {
  cachedSnapshot = { reading: latest }
  for (const fn of listeners) fn()
}

export function getSharedLatestSensorReadingSnapshot(): ReadingSnapshot {
  return cachedSnapshot
}

export function subscribeSharedLatestSensorReading(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** Called by Live Sensor Node when a reading is loaded or saved. */
export function setSharedLatestSensorReading(reading: SensorReading | null) {
  latest = reading
  publish()
}
