import type { SensorReading, SensorReadingInput } from '../types/sensorReading'

export const SIM_NODE_ID = 'sim-node-01'
export const SIM_ZONE_ID = 'zone_tomatoes'
export const SIM_TICK_MS = 5_000
/** Reading newer than this is considered live telemetry. */
export const TELEMETRY_LIVE_MS = 15_000

export type TelemetryStatus = 'live' | 'stale' | 'no-data' | 'paused'

export type SimReadings = {
  airTempC: number
  humidityPct: number
  soilMoistureRaw: number
  soilTempC: number
}

export type SimTickResult = {
  readings: SimReadings
  explanation: string
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function round1(value: number): number {
  return Math.round(value * 10) / 10
}

export function initialSimReadings(): SimReadings {
  return {
    airTempC: 22.5,
    humidityPct: 58,
    soilMoistureRaw: 620,
    soilTempC: 18.5,
  }
}

/**
 * Advance one simulation tick with dramatic, easy-to-see drift for learning.
 */
export function advanceSimReadings(prev: SimReadings, tickNumber: number): SimTickResult {
  const moistureDrop = 40 + Math.round(Math.random() * 35)
  const tempDelta = (Math.random() > 0.35 ? 1 : -1) * (1.5 + Math.random() * 2)
  const humidityDelta = (Math.random() > 0.4 ? 1 : -1) * (5 + Math.random() * 7)
  const soilTempDelta = (Math.random() > 0.45 ? 1 : -1) * (1 + Math.random() * 1.5)

  const next: SimReadings = {
    airTempC: round1(clamp(prev.airTempC + tempDelta, 18, 34)),
    humidityPct: round1(clamp(prev.humidityPct + humidityDelta, 28, 92)),
    soilMoistureRaw: round1(clamp(prev.soilMoistureRaw - moistureDrop, 160, 900)),
    soilTempC: round1(clamp(prev.soilTempC + soilTempDelta, 14, 28)),
  }

  const details: string[] = [
    `soil moisture dropped from ${Math.round(prev.soilMoistureRaw)} to ${Math.round(next.soilMoistureRaw)}`,
    `air temp ${prev.airTempC}°C → ${next.airTempC}°C`,
    `humidity ${prev.humidityPct}% → ${next.humidityPct}%`,
    `soil temp ${prev.soilTempC}°C → ${next.soilTempC}°C`,
  ]

  const mayTriggerWatering = next.soilMoistureRaw < 420
  const effect = mayTriggerWatering ? ', which may trigger watering guidance' : ''

  return {
    readings: next,
    explanation: `Tick ${tickNumber}: ${details.join('; ')}${effect}.`,
  }
}

export function toSensorReadingInput(readings: SimReadings): SensorReadingInput {
  return {
    nodeId: SIM_NODE_ID,
    zoneId: SIM_ZONE_ID,
    readings: { ...readings },
  }
}

export function getTelemetryStatus(
  reading: SensorReading | null,
  options?: { simulating?: boolean; paused?: boolean; now?: number },
): TelemetryStatus {
  if (options?.paused) return 'paused'
  if (!reading) return 'no-data'

  const now = options?.now ?? Date.now()
  const receivedMs = new Date(reading.receivedAtISO).getTime()
  if (Number.isNaN(receivedMs)) return 'stale'

  const ageMs = now - receivedMs
  if (options?.simulating || ageMs <= TELEMETRY_LIVE_MS) {
    return 'live'
  }

  return 'stale'
}

export const TELEMETRY_STATUS_LABEL: Record<TelemetryStatus, string> = {
  live: 'Live',
  stale: 'Stale',
  'no-data': 'No data',
  paused: 'Paused',
}
