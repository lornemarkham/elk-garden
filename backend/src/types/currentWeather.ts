/** Normalized current weather from Open-Meteo for Vernon, BC. */
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
