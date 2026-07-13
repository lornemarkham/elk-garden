import { Router } from 'express'
import { ingestLiveSensorReading } from '../store/liveSensorStore.js'
import {
  getLatestSensorReading,
  getSensorReadingHistory,
} from '../store/sensorReadingsStore.js'

export const sensorReadingsRouter = Router()

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function optionalQueryString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined
}

function parseLiveEsp32Reading(body: unknown):
  | { nodeId: string; soilMoistureRaw: number; timestamp?: number }
  | { error: string } {
  if (body == null || typeof body !== 'object' || Array.isArray(body)) {
    return { error: 'Request body must be a JSON object.' }
  }
  const raw = body as Record<string, unknown>
  if (!isNonEmptyString(raw.nodeId)) {
    return { error: 'nodeId is required and must be a non-empty string.' }
  }
  if (!isFiniteNumber(raw.soilMoistureRaw)) {
    return { error: 'soilMoistureRaw is required and must be a number.' }
  }
  if ('timestamp' in raw && raw.timestamp != null && !isFiniteNumber(raw.timestamp)) {
    return { error: 'timestamp must be a number when provided.' }
  }
  return {
    nodeId: raw.nodeId.trim(),
    soilMoistureRaw: raw.soilMoistureRaw,
    timestamp: isFiniteNumber(raw.timestamp) ? raw.timestamp : undefined,
  }
}

/**
 * POST /api/sensor-readings
 * Dev ingest for ESP32 — flat JSON, in-memory only (no database).
 */
sensorReadingsRouter.post('/api/sensor-readings', (req, res) => {
  const parsed = parseLiveEsp32Reading(req.body)
  if ('error' in parsed) {
    return res.status(400).json({ error: parsed.error })
  }
  const snapshot = ingestLiveSensorReading(parsed)
  return res.status(201).json(snapshot)
})

/**
 * GET /api/sensor-readings/latest
 * Returns the most recent reading overall, or the most recent for `?zoneId=`.
 */
sensorReadingsRouter.get('/api/sensor-readings/latest', async (req, res) => {
  const zoneId = optionalQueryString(req.query.zoneId)
  try {
    const latest = await getLatestSensorReading(zoneId)
    if (!latest) {
      return res.status(404).json({
        error: zoneId ? `No readings found for zoneId "${zoneId}".` : 'No sensor readings yet.',
      })
    }
    return res.json(latest)
  } catch (err) {
    console.error('[sensor-readings] failed to load latest reading', err)
    return res.status(500).json({ error: 'Could not load the latest sensor reading.' })
  }
})

/**
 * GET /api/sensor-readings/history
 * Returns readings matching `?nodeId=` / `?zoneId=`, oldest first, capped by `?limit=`.
 */
sensorReadingsRouter.get('/api/sensor-readings/history', async (req, res) => {
  const nodeId = optionalQueryString(req.query.nodeId)
  const zoneId = optionalQueryString(req.query.zoneId)
  const limitRaw = optionalQueryString(req.query.limit)
  const limit = limitRaw && Number.isFinite(Number(limitRaw)) ? Number(limitRaw) : undefined

  try {
    const history = await getSensorReadingHistory({ nodeId, zoneId, limit })
    return res.json(history)
  } catch (err) {
    console.error('[sensor-readings] failed to load history', err)
    return res.status(500).json({ error: 'Could not load sensor reading history.' })
  }
})
