import type { SensorReading } from '../../types/sensorReading'
import type { DashboardViewModel } from './dashboardViewModel'

export const API_TELEMETRY_NOTE =
  'This recommendation is now derived from backend telemetry, not hardcoded frontend state.'

export type MorningAlertDisplay = DashboardViewModel['morningStatus']['alerts'][number] & {
  apiInfluenced?: boolean
}

export type MorningRecommendationDisplay =
  DashboardViewModel['morningStatus']['topRecommendations'][number] & {
    apiInfluenced?: boolean
  }

export type MorningStatusDisplay = Omit<
  DashboardViewModel['morningStatus'],
  'alerts' | 'topRecommendations'
> & {
  hasApiTelemetry: boolean
  apiTelemetryNote?: string
  healthScoreApiInfluenced?: boolean
  wateringGuidanceApiInfluenced?: boolean
  alerts: MorningAlertDisplay[]
  topRecommendations: MorningRecommendationDisplay[]
}

const ZONE_LABELS: Record<string, string> = {
  zone_tomatoes: 'Zone 1 Tomatoes',
  zone_greens: 'Zone 2 Greens',
  zone_roots: 'Zone 3 Roots',
  zone_melons: 'Zone 4 Melons',
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, Math.round(n)))
}

/** Map simulated raw ADC (180–900) to an approximate moisture %. Lower raw = drier. */
export function moisturePctFromRaw(raw: number) {
  return clamp(((raw - 180) / 720) * 58 + 16, 12, 78)
}

export function airTempCToF(c: number) {
  return clamp(c * (9 / 5) + 32, 45, 105)
}

function zoneLabel(zoneId: string) {
  return ZONE_LABELS[zoneId] ?? zoneId
}

/**
 * Blend API-backed telemetry into morning status when a latest reading exists.
 * Falls back to the simulated frontend-only view when `reading` is null.
 */
export function applyApiTelemetryToMorningStatus(
  base: DashboardViewModel['morningStatus'],
  reading: SensorReading | null,
): MorningStatusDisplay {
  if (!reading) {
    return { ...base, hasApiTelemetry: false }
  }

  const r = reading.readings
  const zone = zoneLabel(reading.zoneId)
  const moisturePct =
    r.soilMoistureRaw != null ? moisturePctFromRaw(r.soilMoistureRaw) : null
  const airC = r.airTempC
  const humidity = r.humidityPct
  const soilC = r.soilTempC

  let healthScore = base.healthScore
  if (moisturePct != null) {
    healthScore = clamp(base.healthScore * 0.35 + moisturePct * 0.65, 28, 96)
  }
  if (airC != null && airC >= 29) healthScore = clamp(healthScore - 6, 28, 96)
  if (moisturePct != null && moisturePct < 26) healthScore = clamp(healthScore - 10, 28, 96)
  if (humidity != null && humidity >= 75 && moisturePct != null && moisturePct > 45) {
    healthScore = clamp(healthScore + 4, 28, 96)
  }

  let wateringGuidance = base.wateringGuidance
  if (moisturePct != null && moisturePct < 30) {
    wateringGuidance = `Backend telemetry: ${zone} soil reads dry (raw ${Math.round(r.soilMoistureRaw!)}). Evening watering is worth a gentle check.`
  } else if (airC != null && airC >= 28 && (humidity == null || humidity < 48)) {
    wateringGuidance = `Backend telemetry: warm air (${airC}°C${humidity != null ? `, ${humidity}% humidity` : ''}). Spot-check full-sun beds before afternoon heat.`
  } else if (soilC != null && soilC <= 16 && moisturePct != null && moisturePct > 40) {
    wateringGuidance = `Backend telemetry: cool soil (${soilC}°C) is holding moisture well in ${zone}. No broad watering needed right now.`
  } else {
    wateringGuidance = `Backend telemetry from ${reading.nodeId} looks steady for ${zone}. Keep observing; no urgent watering.`
  }

  let apiAlert: MorningAlertDisplay | null = null
  if (moisturePct != null && moisturePct < 32) {
    apiAlert = {
      id: 'api-alert-moisture',
      label: `${zone}: soil moisture low per API (raw ${Math.round(r.soilMoistureRaw!)}, ~${moisturePct}%).`,
      tone: 'moisture',
      apiInfluenced: true,
    }
  } else if (airC != null && airC >= 29) {
    apiAlert = {
      id: 'api-alert-heat',
      label: `${zone}: air ${airC}°C from API — watch for afternoon heat stress.`,
      tone: 'heat',
      apiInfluenced: true,
    }
  } else if (humidity != null && humidity < 40) {
    apiAlert = {
      id: 'api-alert-humidity',
      label: `${zone}: humidity ${humidity}% — beds may dry faster than usual.`,
      tone: 'moisture',
      apiInfluenced: true,
    }
  }

  const alerts: MorningAlertDisplay[] = apiAlert
    ? [apiAlert, ...base.alerts.filter((a) => a.id !== apiAlert!.id)].slice(0, 4)
    : base.alerts

  const apiRecommendation: MorningRecommendationDisplay = {
    id: 'api-telemetry-morning-rec',
    title:
      moisturePct != null && moisturePct < 32
        ? `${zone}: plan watering check (API telemetry)`
        : airC != null && airC >= 29
          ? `${zone}: monitor heat stress (API telemetry)`
          : `${zone}: telemetry steady — light observation`,
    why:
      moisturePct != null
        ? `Latest POST from ${reading.nodeId} reports soil raw ${Math.round(r.soilMoistureRaw ?? 0)} (~${moisturePct}% estimated moisture)${airC != null ? ` with air ${airC}°C` : ''}.`
        : `Latest reading from ${reading.nodeId} at ${new Date(reading.receivedAtISO).toLocaleTimeString()} informs this guidance.`,
    apiInfluenced: true,
  }

  const topRecommendations: MorningRecommendationDisplay[] = [
    apiRecommendation,
    ...base.topRecommendations.filter((rec) => rec.id !== apiRecommendation.id),
  ].slice(0, 3)

  return {
    ...base,
    hasApiTelemetry: true,
    apiTelemetryNote: API_TELEMETRY_NOTE,
    healthScore,
    healthScoreApiInfluenced: true,
    headline:
      healthScore >= 82
        ? 'Backend telemetry looks calm this morning.'
        : 'Backend telemetry flagged something gentle to watch today.',
    wateringGuidance,
    wateringGuidanceApiInfluenced: true,
    alerts,
    topRecommendations,
  }
}
