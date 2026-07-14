import { Router } from 'express'
import { prisma } from '../lib/prisma.js'

/**
 * TEMPORARY debug route — remove after verifying Postgres writes work.
 * Inserts one hard-coded SensorReading; does not touch ESP32 / live-sensor paths.
 */
export const debugSensorWriteRouter = Router()

debugSensorWriteRouter.post('/api/debug/sensor-reading', async (_req, res) => {
  try {
    const row = await prisma.sensorReading.create({
      data: {
        nodeId: 'debug-write-probe',
        zoneId: 'zone_debug',
        soilMoistureRaw: 777,
        airTempC: 22.5,
        humidityPct: 48,
      },
    })
    console.log('[debug-sensor-write] SUCCESS inserted SensorReading', row.id)
    return res.status(201).json(row)
  } catch (err) {
    console.error('[debug-sensor-write] FAILED', err)
    return res.status(500).json({
      error: 'Debug SensorReading insert failed.',
      detail: err instanceof Error ? err.message : String(err),
    })
  }
})
