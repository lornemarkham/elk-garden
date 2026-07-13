import { getApiBaseUrl } from '../apiBase'
import type { SensorReading, SensorReadingInput } from '../../types/sensorReading'
import {
  recordGetApiTrace,
  recordPostApiTrace,
  setSensorApiBackendOffline,
} from './sensorApiTrace'

export class SensorApiError extends Error {
  readonly offline: boolean

  constructor(message: string, offline = false) {
    super(message)
    this.name = 'SensorApiError'
    this.offline = offline
  }
}

export function isSensorApiOfflineError(err: unknown): err is SensorApiError {
  return err instanceof SensorApiError && err.offline
}

export const SENSOR_READINGS_PATH = '/api/sensor-readings'
export const SENSOR_READINGS_LATEST_PATH = '/api/sensor-readings/latest'

export type SensorApiCallMeta = {
  trigger?: string
}

function apiUrl(path: string, query?: Record<string, string>): string {
  const base = getApiBaseUrl()
  const qs =
    query && Object.keys(query).length > 0
      ? `?${new URLSearchParams(query).toString()}`
      : ''
  if (base) return `${base}${path}${qs}`
  return `${path}${qs}`
}

async function parseJsonResponse(res: Response): Promise<unknown> {
  const text = await res.text()
  if (!text.length) return null
  try {
    return JSON.parse(text) as unknown
  } catch {
    throw new Error('The sensor API sent an invalid response.')
  }
}

function errorMessage(data: unknown, fallback: string): string {
  if (
    data &&
    typeof data === 'object' &&
    'error' in data &&
    typeof (data as { error: unknown }).error === 'string'
  ) {
    return (data as { error: string }).error
  }
  return fallback
}

const OFFLINE_RESPONSE = {
  error: 'Backend offline',
  hint: 'Start the API with npm run dev (Express on port 8788).',
} as const

async function fetchSensorApi(
  url: string,
  init?: RequestInit,
): Promise<Response> {
  try {
    return await fetch(url, init)
  } catch {
    throw new SensorApiError('Backend offline', true)
  }
}

function isSensorReading(data: unknown): data is SensorReading {
  if (!data || typeof data !== 'object') return false
  const r = data as Record<string, unknown>
  return (
    typeof r.id === 'string' &&
    typeof r.nodeId === 'string' &&
    typeof r.zoneId === 'string' &&
    typeof r.receivedAtISO === 'string' &&
    r.readings != null &&
    typeof r.readings === 'object' &&
    !Array.isArray(r.readings)
  )
}

/** Latest reading from the backend, or null when none exist yet (404). */
export async function getLatestSensorReading(
  zoneId?: string,
  meta?: SensorApiCallMeta,
): Promise<SensorReading | null> {
  const path = SENSOR_READINGS_LATEST_PATH
  const pathWithQuery = zoneId?.trim()
    ? `${path}?zoneId=${encodeURIComponent(zoneId.trim())}`
    : path
  const url = apiUrl(path, zoneId?.trim() ? { zoneId: zoneId.trim() } : undefined)
  const timestampISO = new Date().toISOString()

  let res: Response
  try {
    res = await fetchSensorApi(url)
  } catch (err) {
    recordGetApiTrace({
      method: 'GET',
      path: pathWithQuery,
      endpoint: url,
      timestampISO,
      statusCode: 0,
      responseBody: OFFLINE_RESPONSE,
      trigger: meta?.trigger,
    })
    setSensorApiBackendOffline(true)
    throw err
  }

  const data = await parseJsonResponse(res)

  recordGetApiTrace({
    method: 'GET',
    path: pathWithQuery,
    endpoint: url,
    timestampISO,
    statusCode: res.status,
    responseBody: data ?? { note: '(empty body)' },
    trigger: meta?.trigger,
  })
  setSensorApiBackendOffline(false)

  if (res.status === 404) {
    return null
  }

  if (!res.ok) {
    throw new Error(errorMessage(data, 'Could not load the latest sensor reading.'))
  }

  if (!isSensorReading(data)) {
    throw new Error('The sensor API returned an unexpected response.')
  }

  return data
}

/** POST one reading batch; returns the saved record from the backend. */
export async function postSensorReading(
  input: SensorReadingInput,
  meta?: SensorApiCallMeta,
): Promise<SensorReading> {
  const path = SENSOR_READINGS_PATH
  const url = apiUrl(path)
  const timestampISO = new Date().toISOString()

  let res: Response
  try {
    res = await fetchSensorApi(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    })
  } catch (err) {
    recordPostApiTrace({
      method: 'POST',
      path,
      endpoint: url,
      timestampISO,
      statusCode: 0,
      requestBody: input,
      responseBody: OFFLINE_RESPONSE,
      trigger: meta?.trigger,
    })
    setSensorApiBackendOffline(true)
    throw err
  }

  const data = await parseJsonResponse(res)

  recordPostApiTrace({
    method: 'POST',
    path,
    endpoint: url,
    timestampISO,
    statusCode: res.status,
    requestBody: input,
    responseBody: data ?? { note: '(empty body)' },
    trigger: meta?.trigger,
  })
  setSensorApiBackendOffline(false)

  if (!res.ok) {
    throw new Error(errorMessage(data, 'Could not save the sensor reading.'))
  }

  if (!isSensorReading(data)) {
    throw new Error('The sensor API returned an unexpected response.')
  }

  return data
}
