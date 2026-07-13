/** Normalized current weather from GET /api/weather/current. */
export type CurrentWeather = {
  source: 'open-meteo'
  location: 'Vernon, BC'
  temperatureC: number
  humidityPct: number
  precipitationMm: number
  cloudCoverPct: number
  windKph: number
  fetchedAtISO: string
  highTempC?: number
  lowTempC?: number
}
