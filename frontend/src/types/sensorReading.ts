/** Optional environmental values from a sensor node (ESP32 or simulator). */
export type SensorReadingValues = {
  airTempC?: number
  humidityPct?: number
  soilMoistureRaw?: number
  soilTempC?: number
}

/** JSON body accepted by POST /api/sensor-readings. */
export type SensorReadingInput = {
  nodeId: string
  zoneId: string
  readings: SensorReadingValues
}

/** A stored reading with server-assigned id and receive timestamp. */
export type SensorReading = SensorReadingInput & {
  id: string
  receivedAtISO: string
}

/** Collection of sensor readings. */
export type SensorReadings = SensorReading[]
