import type { SensorReading } from '../../types/sensorReading'
import type { ZoneMoistureStatus } from '../../types/domain'
import type { DashboardViewModel } from './dashboardViewModel'
import { airTempCToF, moisturePctFromRaw } from './applyApiTelemetryToMorningStatus'

export const ZONE_API_TELEMETRY_NOTE =
  'Zone status can now react to backend telemetry.'

export type ZoneApiInfluencedFields = {
  moisturePct?: boolean
  temperatureF?: boolean
  humidityPct?: boolean
  sunlightPct?: boolean
  healthScore?: boolean
  trend?: boolean
  recommendation?: boolean
}

export type ZoneStatusDisplay = DashboardViewModel['zones'][number] & {
  hasApiTelemetry: boolean
  apiInfluenced: ZoneApiInfluencedFields
  soilTempNote?: string
}

type ZoneTelemetryProfile = {
  /** How much API moisture replaces the demo value (roots change slower). */
  moistureBlend: number
  /** Offset applied after blend — melons read wetter, greens drier. */
  moistureOffset: number
  dryThreshold: number
  wetThreshold: number
  heatAirC: number
  humidityLow: number
  moistureTrendBelow: number
  heatHealthPenalty: number
  dryHealthPenalty: number
  humidityHealthPenalty: number
}

const ZONE_PROFILES: Record<string, ZoneTelemetryProfile> = {
  zone_tomatoes: {
    moistureBlend: 1,
    moistureOffset: 0,
    dryThreshold: 30,
    wetThreshold: 55,
    heatAirC: 27,
    humidityLow: 42,
    moistureTrendBelow: 32,
    heatHealthPenalty: 8,
    dryHealthPenalty: 12,
    humidityHealthPenalty: 5,
  },
  zone_greens: {
    moistureBlend: 0.85,
    moistureOffset: -3,
    dryThreshold: 32,
    wetThreshold: 56,
    heatAirC: 26,
    humidityLow: 45,
    moistureTrendBelow: 34,
    heatHealthPenalty: 10,
    dryHealthPenalty: 6,
    humidityHealthPenalty: 9,
  },
  zone_roots: {
    moistureBlend: 0.45,
    moistureOffset: 4,
    dryThreshold: 26,
    wetThreshold: 58,
    heatAirC: 30,
    humidityLow: 38,
    moistureTrendBelow: 24,
    heatHealthPenalty: 4,
    dryHealthPenalty: 6,
    humidityHealthPenalty: 3,
  },
  zone_melons: {
    moistureBlend: 0.9,
    moistureOffset: 5,
    dryThreshold: 25,
    wetThreshold: 54,
    heatAirC: 28,
    humidityLow: 40,
    moistureTrendBelow: 28,
    heatHealthPenalty: 9,
    dryHealthPenalty: 5,
    humidityHealthPenalty: 4,
  },
}

const DEFAULT_PROFILE = ZONE_PROFILES.zone_tomatoes

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, Math.round(n)))
}

function profileFor(zoneId: string): ZoneTelemetryProfile {
  return ZONE_PROFILES[zoneId] ?? DEFAULT_PROFILE
}

function moistureStatusFromPct(pct: number, profile: ZoneTelemetryProfile): ZoneMoistureStatus {
  if (pct < profile.dryThreshold) return 'dry'
  if (pct > profile.wetThreshold) return 'wet'
  return 'good'
}

function zoneMoisturePct(
  basePct: number,
  apiPct: number,
  profile: ZoneTelemetryProfile,
): number {
  const blended = basePct * (1 - profile.moistureBlend) + apiPct * profile.moistureBlend
  return clamp(blended + profile.moistureOffset, 12, 78)
}

function zoneHumidityPct(basePct: number, apiPct: number, profile: ZoneTelemetryProfile): number {
  const blend = profile.moistureBlend >= 0.8 ? 0.75 : 0.55
  return clamp(basePct * (1 - blend) + apiPct * blend, 24, 88)
}

function zoneTempF(baseF: number, apiF: number, profile: ZoneTelemetryProfile): number {
  // Greens and melons track garden air closely; roots lag slightly.
  const blend = profile.moistureBlend >= 0.8 ? 0.8 : profile.moistureBlend <= 0.5 ? 0.5 : 0.65
  const lag = profile.moistureBlend <= 0.5 ? -2 : 0
  return clamp(baseF * (1 - blend) + apiF * blend + lag, 45, 105)
}

function buildTrend(
  moisturePct: number,
  airC: number | undefined,
  humidity: number | undefined,
  profile: ZoneTelemetryProfile,
): DashboardViewModel['zones'][number]['trend'] {
  if (moisturePct < profile.moistureTrendBelow) return 'Moisture falling'
  if (airC != null && airC >= profile.heatAirC) return 'Moisture falling'
  if (humidity != null && humidity < profile.humidityLow) return 'Moisture falling'
  if (moisturePct >= profile.dryThreshold + 18) return 'Recovering after watering'
  return 'Stable'
}

function buildRecommendation(
  zoneName: string,
  moisturePct: number,
  airC: number | undefined,
  humidity: number | undefined,
  soilC: number | undefined,
  profile: ZoneTelemetryProfile,
  zoneId: string,
): string {
  if (zoneId === 'zone_tomatoes' && moisturePct < profile.dryThreshold) {
    return `Backend telemetry: ${zoneName} is drying down quickly — tomatoes feel low moisture first. Check this evening.`
  }
  if (zoneId === 'zone_greens' && airC != null && airC >= profile.heatAirC) {
    return `Backend telemetry: ${zoneName} is heat- and humidity-sensitive — greens may wilt before other beds (${airC}°C air).`
  }
  if (zoneId === 'zone_greens' && humidity != null && humidity < profile.humidityLow) {
    return `Backend telemetry: low humidity (${humidity}%) at ${zoneName} — leafy beds may need a gentle mist or shade check.`
  }
  if (zoneId === 'zone_roots' && moisturePct < profile.dryThreshold) {
    return `Backend telemetry: ${zoneName} root crops are still stable, but soil is trending dry — observe before watering.`
  }
  if (zoneId === 'zone_melons' && airC != null && airC >= profile.heatAirC) {
    return `Backend telemetry: ${zoneName} melons tolerate drier soil but watch heat (${airC}°C) — containers warm fast.`
  }
  if (moisturePct < profile.dryThreshold) {
    return `Backend telemetry: ${zoneName} soil reads dry for this crop mix. Plan a light moisture check.`
  }
  if (airC != null && airC >= profile.heatAirC && (humidity == null || humidity < profile.humidityLow + 3)) {
    return `Backend telemetry: warm, dry air at ${zoneName} (${airC}°C). Watch for afternoon stress.`
  }
  if (soilC != null && soilC <= 16 && moisturePct > profile.dryThreshold + 10) {
    return `Backend telemetry: cool soil (${soilC}°C) is holding moisture in ${zoneName}. No broad watering needed.`
  }
  return `Backend telemetry looks steady for ${zoneName}. Keep observing.`
}

function buildHealthScore(
  baseScore: number,
  moisturePct: number,
  airC: number | undefined,
  humidity: number | undefined,
  profile: ZoneTelemetryProfile,
): number {
  let score = clamp(baseScore * 0.35 + moisturePct * 0.65, 30, 96)
  if (airC != null && airC >= profile.heatAirC) {
    score = clamp(score - profile.heatHealthPenalty, 30, 96)
  }
  if (moisturePct < profile.dryThreshold) {
    score = clamp(score - profile.dryHealthPenalty, 30, 96)
  }
  if (humidity != null && humidity < profile.humidityLow) {
    score = clamp(score - profile.humidityHealthPenalty, 30, 96)
  }
  if (humidity != null && humidity >= 75 && moisturePct > profile.dryThreshold + 12) {
    score = clamp(score + 4, 30, 96)
  }
  return score
}

/**
 * Blend garden-wide API telemetry into a zone card with crop-specific sensitivity.
 */
export function applyApiTelemetryToZoneStatus(
  base: DashboardViewModel['zones'][number],
  reading: SensorReading,
): ZoneStatusDisplay {
  const r = reading.readings
  const profile = profileFor(base.id)
  const apiInfluenced: ZoneApiInfluencedFields = {}

  const airC = r.airTempC
  const humidity = r.humidityPct
  const soilC = r.soilTempC
  const apiMoisture =
    r.soilMoistureRaw != null ? moisturePctFromRaw(r.soilMoistureRaw) : null

  let moisturePct = base.moisturePct
  let moistureStatus = base.moistureStatus
  if (apiMoisture != null) {
    moisturePct = zoneMoisturePct(base.moisturePct, apiMoisture, profile)
    moistureStatus = moistureStatusFromPct(moisturePct, profile)
    apiInfluenced.moisturePct = true
  }

  let temperatureF = base.temperatureF
  if (r.airTempC != null) {
    temperatureF = zoneTempF(base.temperatureF, airTempCToF(r.airTempC), profile)
    apiInfluenced.temperatureF = true
  }

  let humidityPct = base.humidityPct
  if (r.humidityPct != null) {
    humidityPct = zoneHumidityPct(base.humidityPct, r.humidityPct, profile)
    apiInfluenced.humidityPct = true
  }

  const hasMetricOverlay = Object.keys(apiInfluenced).length > 0
  if (!hasMetricOverlay) {
    return { ...base, hasApiTelemetry: false, apiInfluenced: {} }
  }

  const healthScore = buildHealthScore(
    base.healthScore,
    moisturePct,
    airC,
    humidity,
    profile,
  )
  apiInfluenced.healthScore = true

  const trend = buildTrend(moisturePct, airC, humidity, profile)
  apiInfluenced.trend = true

  const apiRecommendation = buildRecommendation(
    base.name,
    moisturePct,
    airC,
    humidity,
    soilC,
    profile,
    base.id,
  )
  apiInfluenced.recommendation = true

  const soilTempNote =
    base.id === reading.zoneId && soilC != null
      ? `Soil temp ${soilC}°C (API at sensor bed) — ${soilC <= 16 ? 'cool soil, moisture holding' : soilC >= 24 ? 'warm soil, watch drying' : 'moderate soil temperature'}.`
      : undefined

  return {
    ...base,
    moistureStatus,
    moisturePct,
    temperatureF,
    humidityPct,
    healthScore,
    trend,
    recommendation: apiRecommendation,
    recommendedAction: apiRecommendation,
    hasApiTelemetry: true,
    apiInfluenced,
    soilTempNote,
  }
}
