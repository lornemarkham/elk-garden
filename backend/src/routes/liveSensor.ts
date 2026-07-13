import { Router } from 'express'
import { getLiveSensorSnapshot } from '../store/liveSensorStore.js'

export const liveSensorRouter = Router()

/**
 * GET /api/live-sensor
 * Dev-only snapshot of the latest in-memory ESP32 reading.
 */
liveSensorRouter.get('/api/live-sensor', (_req, res) => {
  return res.json(getLiveSensorSnapshot())
})
