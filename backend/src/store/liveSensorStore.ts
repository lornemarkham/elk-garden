export type LiveSensorIngest = {
  nodeId: string
  soilMoistureRaw: number
  timestamp?: number
}

export type LiveSensorSnapshot = {
  connected: boolean
  soilMoistureRaw: number | null
  lastUpdate: string | null
  postCount: number
}

/** Reading newer than this counts as connected / live. */
export const LIVE_SENSOR_CONNECTED_MS = 15_000

let postCount = 0
let soilMoistureRaw: number | null = null
let lastUpdate: string | null = null

export function ingestLiveSensorReading(input: LiveSensorIngest): LiveSensorSnapshot {
  postCount += 1
  soilMoistureRaw = input.soilMoistureRaw
  lastUpdate = new Date().toISOString()
  return getLiveSensorSnapshot()
}

export function getLiveSensorSnapshot(now = Date.now()): LiveSensorSnapshot {
  const hasData = postCount > 0 && lastUpdate != null && soilMoistureRaw != null
  const lastMs = lastUpdate ? new Date(lastUpdate).getTime() : NaN
  const ageMs = Number.isFinite(lastMs) ? now - lastMs : Number.POSITIVE_INFINITY
  const connected = hasData && ageMs <= LIVE_SENSOR_CONNECTED_MS

  return {
    connected,
    soilMoistureRaw,
    lastUpdate,
    postCount,
  }
}
