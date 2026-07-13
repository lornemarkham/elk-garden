/** Optional environmental and power values from a sensor node (ESP32 or simulator). */
export type SensorReadingValues = {
  batteryVoltage?: number
  solarVoltage?: number
  chargeCurrent?: number
  loadCurrent?: number
  airTempC?: number
  humidityPct?: number
  soilMoistureRaw?: number
  soilTempC?: number
}

/** JSON body accepted by POST /api/sensor-readings. */
export type SensorReadingInput = {
  nodeId: string
  zoneId?: string
  readings: SensorReadingValues
}

/** A stored reading with server-assigned id and receive timestamp. */
export type SensorReading = SensorReadingInput & {
  id: string
  receivedAtISO: string
}

/** In-memory collection of sensor readings (newest appended last). */
export type SensorReadings = SensorReading[]
