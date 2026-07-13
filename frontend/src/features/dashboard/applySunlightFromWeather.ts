import type { CurrentWeather } from '../../types/currentWeather'
import { sunlightPctFromCloudCover } from '../../lib/weather/sunlightFromCloudCover'
import type { ZoneStatusDisplay } from './applyApiTelemetryToZoneStatus'

/** Apply Vernon cloud cover to each zone’s sunlight %. */
export function applySunlightFromWeather(
  zones: ZoneStatusDisplay[],
  weather: CurrentWeather | null,
): ZoneStatusDisplay[] {
  if (!weather) return zones

  return zones.map((z) => ({
    ...z,
    sunlightPct: sunlightPctFromCloudCover(z.sunlightPct, weather.cloudCoverPct),
    apiInfluenced: { ...z.apiInfluenced, sunlightPct: true },
  }))
}
