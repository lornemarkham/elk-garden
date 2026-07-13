import { getApiBaseUrl } from '../apiBase'

export type LiveSensorResponse = {
  connected: boolean
  soilMoistureRaw: number | null
  lastUpdate: string | null
  postCount: number
}

export const LIVE_SENSOR_PATH = '/api/live-sensor'

function apiUrl(path: string): string {
  const base = getApiBaseUrl()
  if (base) return `${base}${path}`
  return path
}

export class LiveSensorApiError extends Error {
  readonly offline: boolean

  constructor(message: string, offline = false) {
    super(message)
    this.name = 'LiveSensorApiError'
    this.offline = offline
  }
}

export function isLiveSensorApiOfflineError(err: unknown): err is LiveSensorApiError {
  return err instanceof LiveSensorApiError && err.offline
}

export async function getLiveSensor(): Promise<LiveSensorResponse> {
  const url = apiUrl(LIVE_SENSOR_PATH)
  let res: Response
  try {
    res = await fetch(url)
  } catch {
    throw new LiveSensorApiError('Backend offline', true)
  }

  if (!res.ok) {
    throw new LiveSensorApiError('Could not load live sensor data.')
  }

  const data = (await res.json()) as LiveSensorResponse
  return data
}
