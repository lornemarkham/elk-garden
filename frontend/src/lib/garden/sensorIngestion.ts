import type { Garden } from '../../types'
import {
  TOMATOES_ZONE_ID,
  type TomatoMoistureState,
} from './tomatoMoistureState'

export type GardenSignalKind =
  | 'soil-moisture-low'
  | 'pest-activity'
  | 'animal-activity'
  | 'heat-stress'
  | 'frost-risk'
  | 'healthy'

export type GardenSignalSeverity = 'info' | 'warning' | 'critical'

export type GardenSignalMetadata = {
  rowId?: string
  rowLabel?: string
  sensorLabel?: string
  confidence?: 'low' | 'medium' | 'high'
  detectedAtISO?: string
  reviewWindow?: string
  suggestedVerificationAction?: string
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
  tomatoMoistureState?: TomatoMoistureState
}

type SignalConfig = {
  id: string
  title: string
  task: string
  detail: string
  recKind: Garden['recommendations'][number]['kind']
  priority: Garden['recommendations'][number]['priority']
  insightKind: Garden['cameraInsights'][number]['kind']
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
        priority: 'high',
        insightKind: 'plantStress',
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
        priority: 'medium',
        insightKind: 'plantStress',
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
        priority: 'medium',
        insightKind: 'animalActivity',
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
        priority: 'medium',
        insightKind: 'plantStress',
      }
    case 'frost-risk':
      return {
        id: 'signal_garden_frost',
        title: 'Frost risk tonight — protect sensitive plants',
        task: 'Cover sensitive plants tonight',
        detail: 'Future weather feeds would trigger this automatically.',
        recKind: 'check',
        priority: 'high',
        insightKind: 'plantStress',
      }
    case 'healthy':
      return null
  }
}

function updateZoneFromSignal(
  garden: Garden,
  event: GardenSignalEvent,
): Garden['zones'] {
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
      event.kind === 'heat-stress'
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

export function ingestGardenSignal(
  garden: Garden,
  event: GardenSignalEvent,
): GardenSignalIngestionResult {
  const config = signalConfig(garden, event)
  if (!config) return { garden, added: false }

  const insightId = `ext_${config.id}`
  const recId = `ext_rec_${config.id}`
  const taskId = `ext_task_${config.id}`
  const hasInsight = garden.cameraInsights.some((i) => i.id === insightId)
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
            priority: config.priority,
            title: config.task,
            whyThisMatters: config.detail,
            nextStep: config.task,
            due: 'today',
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
          },
          ...garden.tasks,
        ],
  }

  return {
    garden: nextGarden,
    added,
    tomatoMoistureState:
      event.kind === 'soil-moisture-low' && event.zoneId === TOMATOES_ZONE_ID
        ? {
            moistureStatus: 'dry',
            lastWateredAt: null,
            needsFollowUpCheck: false,
            source: 'sensor-ingestion',
          }
        : undefined,
  }
}
