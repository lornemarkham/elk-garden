import type { SensorReading as SensorReadingRow } from '@prisma/client'
import { prisma } from '../lib/prisma.js'
import type { SensorReading, SensorReadingInput } from '../types/sensorReading.js'

function toApiReading(row: SensorReadingRow): SensorReading {
  return {
    id: row.id,
    nodeId: row.nodeId,
    zoneId: row.zoneId ?? undefined,
    readings: {
      batteryVoltage: row.batteryVoltage ?? undefined,
      solarVoltage: row.solarVoltage ?? undefined,
      chargeCurrent: row.chargeCurrent ?? undefined,
      loadCurrent: row.loadCurrent ?? undefined,
      airTempC: row.airTempC ?? undefined,
      humidityPct: row.humidityPct ?? undefined,
      soilMoistureRaw: row.soilMoistureRaw ?? undefined,
      soilTempC: row.soilTempC ?? undefined,
    },
    receivedAtISO: row.receivedAt.toISOString(),
  }
}

export async function appendSensorReading(input: SensorReadingInput): Promise<SensorReading> {
  const row = await prisma.sensorReading.create({
    data: {
      nodeId: input.nodeId,
      zoneId: input.zoneId,
      batteryVoltage: input.readings.batteryVoltage,
      solarVoltage: input.readings.solarVoltage,
      chargeCurrent: input.readings.chargeCurrent,
      loadCurrent: input.readings.loadCurrent,
      airTempC: input.readings.airTempC,
      humidityPct: input.readings.humidityPct,
      soilMoistureRaw: input.readings.soilMoistureRaw,
      soilTempC: input.readings.soilTempC,
    },
  })
  return toApiReading(row)
}

/** Latest reading overall, or latest for `zoneId` when provided. */
export async function getLatestSensorReading(zoneId?: string): Promise<SensorReading | undefined> {
  console.log('[sensor-readings] about to call prisma.sensorReading.findFirst', {
    zoneId: zoneId ?? null,
  })
  try {
    const row = await prisma.sensorReading.findFirst({
      where: zoneId ? { zoneId } : undefined,
      orderBy: { receivedAt: 'desc' },
    })
    console.log('[sensor-readings] findFirst returned', row ? { id: row.id } : null)
    return row ? toApiReading(row) : undefined
  } catch (err) {
    const e = err as {
      name?: string
      code?: string
      message?: string
      meta?: unknown
      cause?: unknown
      stack?: string
    }
    console.error('[sensor-readings] findFirst FAILED — exact error dump:')
    console.error('[sensor-readings] name:', e?.name)
    console.error('[sensor-readings] code:', e?.code)
    console.error('[sensor-readings] message:', e?.message)
    console.error('[sensor-readings] meta:', JSON.stringify(e?.meta ?? null))
    console.error('[sensor-readings] cause:', e?.cause)
    console.error('[sensor-readings] stack:', e?.stack)
    throw err
  }
}

export type SensorReadingHistoryQuery = {
  nodeId?: string
  zoneId?: string
  limit?: number
}

const DEFAULT_HISTORY_LIMIT = 200
const MAX_HISTORY_LIMIT = 1000

/** Readings matching the given filters, oldest first (chart-ready order). */
export async function getSensorReadingHistory(
  query: SensorReadingHistoryQuery,
): Promise<SensorReading[]> {
  const limit = Math.min(
    Math.max(1, query.limit ?? DEFAULT_HISTORY_LIMIT),
    MAX_HISTORY_LIMIT,
  )
  const rows = await prisma.sensorReading.findMany({
    where: {
      ...(query.nodeId ? { nodeId: query.nodeId } : {}),
      ...(query.zoneId ? { zoneId: query.zoneId } : {}),
    },
    orderBy: { receivedAt: 'desc' },
    take: limit,
  })
  return rows.reverse().map(toApiReading)
}
