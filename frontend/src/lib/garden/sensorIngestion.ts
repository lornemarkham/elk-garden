import type { Garden } from '../../types'
import type { RecommendationPriority, SignalDerivedSeverity } from '../../types/recommendation'
import {
  TOMATOES_ZONE_ID,
  type TomatoMoistureState,
} from './tomatoMoistureState'

export type GardenSignalKind =
  // Sensor signals
  | 'soil-moisture-low'
  | 'moisture-recovered'
  | 'humidity-dropping'
  | 'cool-soil-conditions'
  | 'temperature-spike'
  // Camera & Wildlife
  | 'pest-activity'
  | 'animal-activity'
  | 'leaf-yellowing'
  | 'plant-droop'
  | 'fruit-ripening'
  | 'weed-growth'
  // Environmental / heat
  | 'heat-stress'
  | 'frost-risk'
  // Weather
  | 'rain-incoming'
  | 'wind-advisory'
  | 'hot-afternoon'
  | 'cool-evening'
  | 'cloudy-low-light'
  // Human reports
  | 'watering-completed'
  | 'mulch-added'
  | 'harvest-completed'
  | 'plants-healthy'
  // Utility
  | 'healthy'

export type ActivityLogEntry = {
  id: string
  capturedAtISO: string
  message: string
  kind: GardenSignalKind
  source: GardenSignalEvent['source']
  zoneId?: string
  direction: 'alert' | 'positive'
}

export type GardenSignalSeverity = SignalDerivedSeverity

export type GardenSignalMetadata = {
  rowId?: string
  rowLabel?: string
  sensorLabel?: string
  confidence?: 'low' | 'medium' | 'high'
  detectedAtISO?: string
  reviewWindow?: string
  suggestedVerificationAction?: string
  urgencyScore?: number
  severity?: SignalDerivedSeverity
  [key: string]: string | number | boolean | undefined
}

export type GardenSignalEvent = {
  source: 'fake-dev-panel' | 'local-dev-tool' | 'api' | 'arduino' | 'camera' | 'weather'
  zoneId?: string
  kind: GardenSignalKind
  value?: number
  severity?: GardenSignalSeverity
  capturedAtISO: string
  metadata?: GardenSignalMetadata
}

export type GardenSignalIngestionResult = {
  garden: Garden
  added: boolean
  urgencyScore?: number
  severity?: SignalDerivedSeverity
  tomatoMoistureState?: TomatoMoistureState
  activityEntry?: ActivityLogEntry
}

type SignalConfig = {
  id: string
  title: string
  task: string
  detail: string
  recKind: Garden['recommendations'][number]['kind']
  insightKind: Garden['cameraInsights'][number]['kind']
  urgencyScore: number
  severity: SignalDerivedSeverity
  direction: 'alert' | 'positive'
}

const ZONE_MOISTURE_SENSORS: Readonly<Record<string, string>> = {
  zone_tomatoes: 'sensor_tomatoes_moisture',
  zone_greens: 'sensor_greens_moisture',
  zone_roots: 'sensor_roots_moisture',
  zone_melons: 'sensor_melons_moisture',
}

function zoneLabel(garden: Garden, event: GardenSignalEvent, includeRow = true) {
  if (!event.zoneId) return 'Garden'
  const zone = garden.zones.find((z) => z.id === event.zoneId)
  const base = zone ? `Zone ${zone.sortOrder} ${zone.name}` : event.zoneId
  const rowLabel = event.metadata?.rowLabel
  return includeRow && rowLabel ? `${base}, ${rowLabel}` : base
}

function confidenceLabel(event: GardenSignalEvent) {
  return event.metadata?.confidence
    ? ` Confidence: ${event.metadata.confidence}.`
    : ''
}

function verificationAction(event: GardenSignalEvent, fallback: string) {
  return event.metadata?.suggestedVerificationAction ?? fallback
}

function readingValueText(event: GardenSignalEvent) {
  if (typeof event.value !== 'number') return ''
  const unit = event.metadata?.readingUnit
  return typeof unit === 'string' ? ` (${event.value} ${unit})` : ` (${event.value})`
}

function severityFromUrgency(urgencyScore: number): SignalDerivedSeverity {
  if (urgencyScore >= 90) return 'critical'
  if (urgencyScore >= 70) return 'urgent'
  if (urgencyScore >= 40) return 'watch'
  return 'info'
}

function priorityFromUrgency(urgencyScore: number): RecommendationPriority {
  if (urgencyScore >= 70) return 'high'
  if (urgencyScore >= 40) return 'medium'
  return 'low'
}

function urgencyForSignal(event: GardenSignalEvent): number {
  if (typeof event.metadata?.urgencyScore === 'number') {
    return Math.max(1, Math.min(100, Math.round(event.metadata.urgencyScore)))
  }
  switch (event.kind) {
    case 'frost-risk': return 95
    case 'soil-moisture-low': return 92
    case 'temperature-spike': return 78
    case 'heat-stress': return 72
    case 'plant-droop': return 68
    case 'hot-afternoon': return 65
    case 'pest-activity': return 62
    case 'animal-activity': return 55
    case 'leaf-yellowing': return 52
    case 'humidity-dropping': return 44
    case 'wind-advisory': return 38
    case 'weed-growth': return 28
    case 'cloudy-low-light': return 20
    default: return 10
  }
}

function signalConfig(garden: Garden, event: GardenSignalEvent): SignalConfig | null {
  const location = zoneLabel(garden, event)
  const zoneOnly = zoneLabel(garden, event, false)
  const rowLabel = event.metadata?.rowLabel
  const sensorLabel = event.metadata?.sensorLabel ?? 'Sensor'
  const valueText = readingValueText(event)
  const reviewWindow = event.metadata?.reviewWindow
    ? ` - review ${event.metadata.reviewWindow}`
    : ''
  const reviewTask = event.metadata?.reviewWindow
    ? `Review camera clip from ${event.metadata.reviewWindow}`
    : `Review camera clip and inspect ${zoneOnly} for deer damage`
  const heatTask = rowLabel
    ? `Inspect ${rowLabel} for heat stress`
    : `Check ${location} for heat stress`
  const urgencyScore = urgencyForSignal(event)
  const severity = event.metadata?.severity ?? severityFromUrgency(urgencyScore)

  switch (event.kind) {
    case 'soil-moisture-low':
      return {
        id: `signal_${event.zoneId ?? 'garden'}_soil_dry`,
        title: `${location}: soil moisture low`,
        task:
          event.zoneId === TOMATOES_ZONE_ID
            ? `${location}: water tonight`
            : `Check soil moisture in ${location}`,
        detail: `${sensorLabel} reported low moisture${valueText}. ${verificationAction(
          event,
          'Verify by checking the top inch of soil.',
        )}${confidenceLabel(event)}`,
        recKind: 'watering',
        insightKind: 'plantStress',
        urgencyScore,
        severity,
        direction: 'alert',
      }

    case 'moisture-recovered':
      return {
        id: `signal_${event.zoneId ?? 'garden'}_moisture_recovered`,
        title: `${zoneOnly}: moisture recovering`,
        task: `Monitor ${zoneOnly} — soil moisture improving`,
        detail: `${sensorLabel} shows moisture returning to a healthy range. Good news for your plants.`,
        recKind: 'check',
        insightKind: 'plantStress',
        urgencyScore,
        severity,
        direction: 'positive',
      }

    case 'humidity-dropping':
      return {
        id: 'signal_garden_humidity_drop',
        title: 'Humidity dropping — watch for faster drying',
        task: 'Check soil moisture in raised beds and containers today',
        detail: `${sensorLabel} detected falling humidity. Containers and raised beds may dry faster than usual.`,
        recKind: 'check',
        insightKind: 'plantStress',
        urgencyScore,
        severity,
        direction: 'alert',
      }

    case 'cool-soil-conditions':
      return {
        id: `signal_${event.zoneId ?? 'garden'}_cool_soil`,
        title: `${zoneOnly}: cool soil — good moisture retention`,
        task: `No immediate watering needed in ${zoneOnly}`,
        detail: `${sensorLabel} shows cooler soil temperatures, meaning moisture is being retained well.`,
        recKind: 'check',
        insightKind: 'plantStress',
        urgencyScore,
        severity,
        direction: 'positive',
      }

    case 'temperature-spike':
      return {
        id: `signal_${event.zoneId ?? 'garden'}_temp_spike`,
        title: `${location}: temperature spike`,
        task: `Check ${location} for heat stress and water if needed`,
        detail: `${sensorLabel} reported a sudden temperature spike${valueText}. Water early and check for leaf curl.`,
        recKind: 'check',
        insightKind: 'plantStress',
        urgencyScore,
        severity,
        direction: 'alert',
      }

    case 'pest-activity':
      return {
        id: `signal_${event.zoneId ?? 'garden'}_pests`,
        title: `${location}: bug activity suspected`,
        task: `Inspect ${location} for bugs`,
        detail: `${sensorLabel} flagged possible pest activity. ${verificationAction(
          event,
          'Look under leaves and around tender growth.',
        )}${confidenceLabel(event)}`,
        recKind: 'pest',
        insightKind: 'plantStress',
        urgencyScore,
        severity,
        direction: 'alert',
      }

    case 'animal-activity':
      return {
        id: `signal_${event.zoneId ?? 'garden'}_animal`,
        title: `Camera detected deer near ${zoneOnly}${reviewWindow}`,
        task: reviewTask,
        detail: `${sensorLabel} flagged animal movement. ${verificationAction(
          event,
          'Review the clip and look for tracks, nibbled leaves, or disturbed soil.',
        )}${confidenceLabel(event)}`,
        recKind: 'check',
        insightKind: 'animalActivity',
        urgencyScore,
        severity,
        direction: 'alert',
      }

    case 'leaf-yellowing':
      return {
        id: `signal_${event.zoneId ?? 'garden'}_yellowing`,
        title: `${zoneOnly}: possible leaf yellowing detected`,
        task: `Inspect ${zoneOnly} for yellowing leaves`,
        detail: `${sensorLabel} flagged possible yellowing. This can indicate nutrient issues, overwatering, or natural aging.${confidenceLabel(event)}`,
        recKind: 'check',
        insightKind: 'growthIssue',
        urgencyScore,
        severity,
        direction: 'alert',
      }

    case 'plant-droop':
      return {
        id: `signal_${event.zoneId ?? 'garden'}_droop`,
        title: `${zoneOnly}: plant drooping detected`,
        task: `Check soil moisture and heat exposure in ${zoneOnly}`,
        detail: `${sensorLabel} detected possible drooping. Check soil moisture and afternoon shade first — often a quick fix.${confidenceLabel(event)}`,
        recKind: 'watering',
        insightKind: 'plantStress',
        urgencyScore,
        severity,
        direction: 'alert',
      }

    case 'fruit-ripening':
      return {
        id: `signal_${event.zoneId ?? 'garden'}_ripening`,
        title: `${zoneOnly}: fruit ripening detected`,
        task: `Check ${zoneOnly} for harvest-ready crops`,
        detail: `${sensorLabel} detected signs of ripening. A gentle squeeze or color check can confirm readiness.${confidenceLabel(event)}`,
        recKind: 'harvest',
        insightKind: 'plantStress',
        urgencyScore,
        severity,
        direction: 'positive',
      }

    case 'weed-growth':
      return {
        id: `signal_${event.zoneId ?? 'garden'}_weeds`,
        title: `${zoneOnly}: weed growth detected`,
        task: `Clear weeds from ${zoneOnly} when time allows`,
        detail: `${sensorLabel} flagged weed growth. Weeds compete for moisture — clear them when convenient.${confidenceLabel(event)}`,
        recKind: 'check',
        insightKind: 'growthIssue',
        urgencyScore,
        severity,
        direction: 'alert',
      }

    case 'heat-stress':
      return {
        id: `signal_${event.zoneId ?? 'garden'}_heat`,
        title: `${location}: heat stress risk`,
        task: heatTask,
        detail: `${sensorLabel} reported heat stress conditions${valueText}. ${verificationAction(
          event,
          'Check leaf curl, wilting, and afternoon sun exposure.',
        )}${confidenceLabel(event)}`,
        recKind: 'check',
        insightKind: 'plantStress',
        urgencyScore,
        severity,
        direction: 'alert',
      }

    case 'frost-risk':
      return {
        id: 'signal_garden_frost',
        title: 'Frost risk tonight — protect sensitive plants',
        task: 'Cover sensitive plants tonight',
        detail: 'Future weather feeds would trigger this automatically.',
        recKind: 'check',
        insightKind: 'plantStress',
        urgencyScore,
        severity,
        direction: 'alert',
      }

    case 'rain-incoming':
      return {
        id: 'signal_garden_rain_incoming',
        title: 'Rain forecast — consider delaying irrigation',
        task: 'Hold off on watering today — rain is expected',
        detail: 'A weather update suggests rain is coming. Delaying irrigation prevents overwatering and stress.',
        recKind: 'watering',
        insightKind: 'plantStress',
        urgencyScore,
        severity,
        direction: 'positive',
      }

    case 'wind-advisory':
      return {
        id: 'signal_garden_wind',
        title: 'Wind advisory — check trellises and tall plants',
        task: 'Check staking and trellises for tomatoes and beans',
        detail: 'Higher winds expected today. Tomatoes and tall plants benefit from extra support.',
        recKind: 'check',
        insightKind: 'plantStress',
        urgencyScore,
        severity,
        direction: 'alert',
      }

    case 'hot-afternoon':
      return {
        id: 'signal_garden_hot_afternoon',
        title: 'Hot afternoon expected — water before midday',
        task: 'Water heat-sensitive beds before 10am',
        detail:
          'High afternoon temperatures are coming. Watering early helps plants stay cool through the hottest part of the day.',
        recKind: 'watering',
        insightKind: 'plantStress',
        urgencyScore,
        severity,
        direction: 'alert',
      }

    case 'cool-evening':
      return {
        id: 'signal_garden_cool_evening',
        title: 'Cool evening ahead — good watering window',
        task: 'Evening is a good time to water today',
        detail:
          'Cooler temperatures tonight mean water absorbs slowly and plants can recover from the day.',
        recKind: 'watering',
        insightKind: 'plantStress',
        urgencyScore,
        severity,
        direction: 'positive',
      }

    case 'cloudy-low-light':
      return {
        id: 'signal_garden_cloudy',
        title: 'Cloudy day — lower sunlight for sun-loving crops',
        task: 'Monitor tomatoes and melons on overcast days',
        detail: 'Reduced sunlight slows ripening for tomatoes and melons. No action needed today.',
        recKind: 'check',
        insightKind: 'plantStress',
        urgencyScore,
        severity,
        direction: 'alert',
      }

    case 'watering-completed':
      return {
        id: `signal_${event.zoneId ?? 'garden'}_watered`,
        title: `${zoneOnly}: watering completed`,
        task: `Check ${zoneOnly} soil in a few hours`,
        detail:
          'Great — your observation helps the system track moisture levels. Check the top inch in a few hours to confirm absorption.',
        recKind: 'check',
        insightKind: 'plantStress',
        urgencyScore,
        severity,
        direction: 'positive',
      }

    case 'mulch-added':
      return {
        id: `signal_${event.zoneId ?? 'garden'}_mulch`,
        title: `${zoneOnly}: mulch added`,
        task: `Monitor ${zoneOnly} — mulch improves moisture retention`,
        detail:
          'Mulch helps lock in moisture and regulate soil temperature. You may need to water less frequently over the coming days.',
        recKind: 'check',
        insightKind: 'plantStress',
        urgencyScore,
        severity,
        direction: 'positive',
      }

    case 'harvest-completed':
      return {
        id: `signal_${event.zoneId ?? 'garden'}_harvest`,
        title: `${zoneOnly}: harvest completed`,
        task: `Great work — monitor ${zoneOnly} for new growth`,
        detail: "Harvesting regularly encourages more growth. Your garden is producing — keep it up.",
        recKind: 'harvest',
        insightKind: 'plantStress',
        urgencyScore,
        severity,
        direction: 'positive',
      }

    case 'plants-healthy':
      return {
        id: `signal_${event.zoneId ?? 'garden'}_healthy_report`,
        title: `${zoneOnly}: plants looking healthy`,
        task: `Keep doing what you're doing in ${zoneOnly}`,
        detail:
          "Your observation helps build confidence in the garden outlook. Healthy-looking plants are a great sign.",
        recKind: 'check',
        insightKind: 'plantStress',
        urgencyScore,
        severity,
        direction: 'positive',
      }

    case 'healthy':
      return null
  }
}

function buildActivityMessage(
  event: GardenSignalEvent,
  zone: { name: string } | undefined,
): string {
  const loc = zone ? ` — ${zone.name}` : ''
  const locNear = zone ? ` near ${zone.name}` : ''
  switch (event.kind) {
    case 'soil-moisture-low':
      return event.source === 'fake-dev-panel'
        ? `You reported dry soil${loc}`
        : `Soil moisture low${loc}`
    case 'moisture-recovered':
      return `Moisture recovering${loc}`
    case 'humidity-dropping':
      return 'Humidity dropping in garden'
    case 'cool-soil-conditions':
      return `Cool soil conditions${loc}`
    case 'temperature-spike':
      return `Temperature spike detected${loc}`
    case 'pest-activity':
      return event.source === 'fake-dev-panel'
        ? `You reported pests${loc}`
        : `Bug activity suspected${loc}`
    case 'animal-activity':
      return `Deer activity detected${locNear}`
    case 'leaf-yellowing':
      return `Leaf yellowing detected${loc}`
    case 'plant-droop':
      return `Plant drooping detected${loc}`
    case 'fruit-ripening':
      return `Fruit ripening${loc}`
    case 'weed-growth':
      return `Weed growth detected${loc}`
    case 'heat-stress':
      return `Heat stress detected${loc}`
    case 'frost-risk':
      return 'Frost warning tonight'
    case 'rain-incoming':
      return 'Rain forecast received'
    case 'wind-advisory':
      return 'Wind advisory issued'
    case 'hot-afternoon':
      return 'Hot afternoon expected'
    case 'cool-evening':
      return 'Cool evening ahead'
    case 'cloudy-low-light':
      return 'Cloudy low-light day'
    case 'watering-completed':
      return `You reported: watering completed${loc}`
    case 'mulch-added':
      return `You reported: mulch added${loc}`
    case 'harvest-completed':
      return `You reported: harvest completed${loc}`
    case 'plants-healthy':
      return `You reported: plants looking healthy${loc}`
    default:
      return 'Garden signal received'
  }
}

function buildActivityLogEntry(
  event: GardenSignalEvent,
  config: SignalConfig,
  zone: { name: string } | undefined,
): ActivityLogEntry {
  return {
    id: `${event.capturedAtISO}-${event.kind}-${event.zoneId ?? 'garden'}`,
    capturedAtISO: event.capturedAtISO,
    message: buildActivityMessage(event, zone),
    kind: event.kind,
    source: event.source,
    zoneId: event.zoneId,
    direction: config.direction,
  }
}

function updateZoneFromSignal(garden: Garden, event: GardenSignalEvent): Garden['zones'] {
  if (!event.zoneId) return garden.zones
  const config = signalConfig(garden, event)
  return garden.zones.map((z) => {
    if (z.id !== event.zoneId) return z
    if (event.kind === 'soil-moisture-low') {
      return {
        ...z,
        moistureStatus: 'dry',
        health: 'watch',
        headline: config?.title ?? 'Sensor signal says this area is drying out.',
      }
    }
    if (
      event.kind === 'pest-activity' ||
      event.kind === 'animal-activity' ||
      event.kind === 'heat-stress' ||
      event.kind === 'temperature-spike' ||
      event.kind === 'plant-droop' ||
      event.kind === 'leaf-yellowing'
    ) {
      return {
        ...z,
        health: z.health === 'action' ? 'action' : 'watch',
        headline: config?.title ?? z.headline,
      }
    }
    return z
  })
}

function positiveZoneUpdate(garden: Garden, event: GardenSignalEvent): Garden['zones'] {
  if (!event.zoneId) return garden.zones
  return garden.zones.map((z) => {
    if (z.id !== event.zoneId) return z
    switch (event.kind) {
      case 'moisture-recovered':
      case 'watering-completed':
        return {
          ...z,
          moistureStatus: 'good',
          health: z.health === 'action' ? 'watch' : 'good',
          headline: 'Moisture levels are recovering.',
        }
      case 'plants-healthy':
      case 'cool-soil-conditions':
        return z.health === 'watch'
          ? { ...z, health: 'good', headline: 'Garden looking well.' }
          : z
      case 'mulch-added':
        return { ...z, headline: 'Mulch applied — moisture retention improving.' }
      case 'harvest-completed':
        return { ...z, headline: 'Harvest recorded — monitor for new growth.' }
      default:
        return z
    }
  })
}

function positiveReadingsUpdate(garden: Garden, event: GardenSignalEvent): Garden['readings'] {
  if (!event.zoneId) return garden.readings
  if (event.kind !== 'moisture-recovered' && event.kind !== 'watering-completed') {
    return garden.readings
  }
  const sensorId = ZONE_MOISTURE_SENSORS[event.zoneId]
  if (!sensorId) return garden.readings
  return garden.readings.map((r) => (r.sensorId === sensorId ? { ...r, value: 38 } : r))
}

export function ingestGardenSignal(
  garden: Garden,
  event: GardenSignalEvent,
): GardenSignalIngestionResult {
  const config = signalConfig(garden, event)
  if (!config) return { garden, added: false }

  const zone = event.zoneId ? garden.zones.find((z) => z.id === event.zoneId) : undefined
  const activityEntry = buildActivityLogEntry(event, config, zone)
  const insightId = `ext_${config.id}`
  const hasInsight = garden.cameraInsights.some((i) => i.id === insightId)

  // Positive signals: improve zone state, skip adding alert tasks/recommendations
  if (config.direction === 'positive') {
    const nextGarden: Garden = {
      ...garden,
      zones: positiveZoneUpdate(garden, event),
      readings: positiveReadingsUpdate(garden, event),
      cameraInsights: hasInsight
        ? garden.cameraInsights
        : [
            {
              id: insightId,
              gardenId: garden.id,
              zoneId: event.zoneId,
              kind: config.insightKind,
              title: config.title,
              detail: config.detail,
              capturedAtISO: event.capturedAtISO,
              urgencyScore: config.urgencyScore,
              severity: config.severity,
              confidence: event.metadata?.confidence ?? 'medium',
            },
            ...garden.cameraInsights,
          ],
    }
    return {
      garden: nextGarden,
      added: !hasInsight,
      urgencyScore: config.urgencyScore,
      severity: config.severity,
      tomatoMoistureState:
        (event.kind === 'watering-completed' || event.kind === 'moisture-recovered') &&
        event.zoneId === TOMATOES_ZONE_ID
          ? {
              moistureStatus: 'ok',
              lastWateredAt: event.capturedAtISO,
              needsFollowUpCheck: true,
              source: 'sensor-ingestion',
            }
          : undefined,
      activityEntry,
    }
  }

  // Alert signals: create recommendations, tasks, and insights
  const recId = `ext_rec_${config.id}`
  const taskId = `ext_task_${config.id}`
  const hasRecommendation = garden.recommendations.some((r) => r.id === recId)
  const hasTask = garden.tasks.some((t) => t.id === taskId)
  const added = !hasInsight || !hasRecommendation || !hasTask

  const nextGarden: Garden = {
    ...garden,
    zones: updateZoneFromSignal(garden, event),
    cameraInsights: hasInsight
      ? garden.cameraInsights
      : [
          {
            id: insightId,
            gardenId: garden.id,
            zoneId: event.zoneId,
            kind: config.insightKind,
            title: config.title,
            detail: config.detail,
            capturedAtISO: event.capturedAtISO,
            urgencyScore: config.urgencyScore,
            severity: config.severity,
            confidence:
              event.metadata?.confidence ??
              (event.severity === 'critical'
                ? 'high'
                : event.severity === 'info'
                  ? 'low'
                  : 'medium'),
          },
          ...garden.cameraInsights,
        ],
    recommendations: hasRecommendation
      ? garden.recommendations
      : [
          {
            id: recId,
            gardenId: garden.id,
            zoneId: event.zoneId,
            kind: config.recKind,
            priority: priorityFromUrgency(config.urgencyScore),
            title: config.task,
            whyThisMatters: config.detail,
            nextStep: config.task,
            due: 'today',
            urgencyScore: config.urgencyScore,
            severity: config.severity,
            capturedAtISO: event.capturedAtISO,
          },
          ...garden.recommendations,
        ],
    tasks: hasTask
      ? garden.tasks
      : [
          {
            id: taskId,
            gardenId: garden.id,
            zoneId: event.zoneId,
            title: config.task,
            supportiveNote: config.detail,
            completed: false,
            urgencyScore: config.urgencyScore,
            severity: config.severity,
            capturedAtISO: event.capturedAtISO,
          },
          ...garden.tasks,
        ],
  }

  return {
    garden: nextGarden,
    added,
    urgencyScore: config.urgencyScore,
    severity: config.severity,
    tomatoMoistureState:
      event.kind === 'soil-moisture-low' && event.zoneId === TOMATOES_ZONE_ID
        ? {
            moistureStatus: 'dry',
            lastWateredAt: null,
            needsFollowUpCheck: false,
            source: 'sensor-ingestion',
          }
        : undefined,
    activityEntry,
  }
}
