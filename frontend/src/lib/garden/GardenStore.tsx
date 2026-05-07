import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import type { Garden, GardenMode, GardenProfile, WeatherSummary } from '../../types'
import { gardenDataSource } from '../gardenDataSource'
import { weatherService } from '../weather/weatherService'
import { profileService } from '../profile/profileService'
import {
  applyTomatoMoistureState,
  applyTomatoTimeDecay,
  loadTomatoMoistureState,
  saveTomatoMoistureState,
  TOMATOES_FOLLOW_UP_TASK_ID,
  TOMATOES_WATERING_TASK_ID,
  TOMATOES_ZONE_ID,
  TOMATO_DRY_AFTER_HOURS,
  type TomatoMoistureState,
} from './tomatoMoistureState'
import {
  ingestGardenSignal,
  type ActivityLogEntry,
  type GardenSignalEvent,
  type GardenSignalIngestionResult,
} from './sensorIngestion'

type GardenTaskType = 'water' | 'hold-water' | 'inspect' | 'other'
export type GardenObservationEvent = 'pests' | 'dry' | 'stressed'
export type GardenObservationResult = {
  event: GardenObservationEvent
  added: boolean
}

export type TaskCompletionLog = {
  zoneId: string | null
  taskType: GardenTaskType
  timestamp: string
  previousState: {
    taskCompleted: boolean
    moistureStatus?: string
    health?: string
  }
  newState: {
    taskCompleted: boolean
    moistureStatus?: string
    health?: string
  }
}

export type TaskCompletionResult = {
  taskId: string
  completed: boolean
  message: string
  log: TaskCompletionLog
}

type GardenState = {
  garden: Garden | null
  weather: WeatherSummary | null
  profile: GardenProfile | null
  gardenMode: GardenMode
  isLoading: boolean
  error: string | null
  activityLog: ActivityLogEntry[]
}

export type { ActivityLogEntry }

type GardenActions = {
  toggleTask(taskId: string): TaskCompletionResult | null
  saveProfile(profile: GardenProfile): Promise<void>
  setGardenMode(mode: GardenMode): void
  simulateTomato24Hours(): void
  reportObservation(event: GardenObservationEvent): GardenObservationResult
  ingestSignal(event: GardenSignalEvent): GardenSignalIngestionResult | null
  resetGarden(): Promise<void>
  advanceTime(hours: 6 | 24): void
  clearActivityLog(): void
}

const GardenContext = createContext<(GardenState & GardenActions) | null>(null)

function classifyTask(taskId: string, title: string): GardenTaskType {
  const t = title.toLowerCase()
  if (
    t.includes('dry out') ||
    t.includes('hold water') ||
    t.includes('skip watering')
  ) {
    return 'hold-water'
  }
  if (taskId === TOMATOES_WATERING_TASK_ID || t.includes('water')) return 'water'
  if (t.includes('check') || t.includes('inspect') || t.includes('walkthrough')) {
    return 'inspect'
  }
  return 'other'
}

function completionMessage(taskType: GardenTaskType, zoneName?: string) {
  switch (taskType) {
    case 'water':
      return zoneName ? `${zoneName} watered` : 'Watering complete'
    case 'hold-water':
      return zoneName ? `${zoneName} drying out` : 'Dry-out started'
    case 'inspect':
      return zoneName ? `${zoneName} checked` : 'Garden checked'
    case 'other':
      return 'Task complete'
  }
}

function withObservationEvent(garden: Garden, event: GardenObservationEvent): {
  garden: Garden
  added: boolean
} {
  const now = new Date().toISOString()
  const tomatoes = garden.zones.find((z) => z.id === TOMATOES_ZONE_ID)
  const addWatchToTomatoes = event === 'pests' || event === 'stressed'
  const shouldSkipDry = event === 'dry' && tomatoes?.moistureStatus === 'dry'

  if (shouldSkipDry) return { garden, added: false }

  const eventConfig = {
    pests: {
      insightId: 'obs_pests',
      recId: 'obs_rec_pests',
      taskId: 'obs_task_pests',
      alert: 'Pests spotted — inspect affected plants',
      task: 'Inspect leaves for pests',
      why: 'A quick pest check helps catch damage before it spreads.',
      nextStep: 'Look under leaves and around tender growth for pests or chew marks.',
      kind: 'pest' as const,
      priority: 'medium' as const,
    },
    dry: {
      insightId: 'obs_dry',
      recId: 'obs_rec_dry',
      taskId: 'obs_task_dry',
      alert: 'Soil drying — check moisture',
      task: 'Check soil moisture',
      why: 'A quick soil check tells you whether this bed needs water soon.',
      nextStep: 'Feel the top inch of soil around the tomatoes.',
      kind: 'check' as const,
      priority: 'medium' as const,
    },
    stressed: {
      insightId: 'obs_stressed',
      recId: 'obs_rec_stressed',
      taskId: 'obs_task_stressed',
      alert: 'Plants showing stress — check water and heat',
      task: 'Inspect plant health',
      why: 'Stress can come from water, heat, pests, or transplant shock.',
      nextStep: 'Check leaves, soil moisture, and afternoon heat exposure.',
      kind: 'check' as const,
      priority: 'medium' as const,
    },
  }[event]

  const hasRecommendation = garden.recommendations.some(
    (r) => r.id === eventConfig.recId,
  )
  const hasTask = garden.tasks.some((t) => t.id === eventConfig.taskId)
  const hasInsight = garden.cameraInsights.some(
    (i) => i.id === eventConfig.insightId,
  )
  const added = !hasRecommendation || !hasTask || !hasInsight

  const recommendations = hasRecommendation
    ? garden.recommendations
    : [
        {
          id: eventConfig.recId,
          gardenId: garden.id,
          zoneId: TOMATOES_ZONE_ID,
          kind: eventConfig.kind,
          priority: eventConfig.priority,
          title: eventConfig.task,
          whyThisMatters: eventConfig.why,
          nextStep: eventConfig.nextStep,
          due: 'today' as const,
        },
        ...garden.recommendations,
      ]

  const tasks = hasTask
    ? garden.tasks
    : [
        {
          id: eventConfig.taskId,
          gardenId: garden.id,
          zoneId: TOMATOES_ZONE_ID,
          title: eventConfig.task,
          supportiveNote: eventConfig.nextStep,
          completed: false,
        },
        ...garden.tasks,
      ]

  const cameraInsights = hasInsight
    ? garden.cameraInsights
    : [
        {
          id: eventConfig.insightId,
          gardenId: garden.id,
          zoneId: TOMATOES_ZONE_ID,
          kind: 'plantStress' as const,
          title: eventConfig.alert,
          detail: eventConfig.nextStep,
          capturedAtISO: now,
          confidence: 'medium' as const,
        },
        ...garden.cameraInsights,
      ]

  return {
    added,
    garden: {
      ...garden,
      zones: addWatchToTomatoes
        ? garden.zones.map((z) =>
            z.id === TOMATOES_ZONE_ID && z.health === 'good'
              ? {
                  ...z,
                  health: 'watch',
                  headline: eventConfig.alert,
                }
              : z,
          )
        : garden.zones,
      recommendations,
      tasks,
      cameraInsights,
    },
  }
}

// ---------------------------------------------------------------------------
// Simulation helpers — used by advanceTime action
// ---------------------------------------------------------------------------

const ADV_SENSORS: Record<string, string> = {
  zone_tomatoes: 'sensor_tomatoes_moisture',
  zone_greens: 'sensor_greens_moisture',
  zone_roots: 'sensor_roots_moisture',
  zone_melons: 'sensor_melons_moisture',
}

const ADV_DROPS: Record<string, number> = {
  zone_tomatoes: 12,
  zone_melons: 12,
  zone_greens: 7,
  zone_roots: 6,
}

function advanceGardenTime(garden: Garden, hours: 6 | 24): Garden {
  const multiplier = hours >= 24 ? 2.0 : 1.0
  const updatedReadings = garden.readings.map((r) => {
    const zoneId = Object.entries(ADV_SENSORS).find(([, s]) => s === r.sensorId)?.[0]
    if (!zoneId) return r
    const drop = (ADV_DROPS[zoneId] ?? 8) * multiplier
    return { ...r, value: Math.max(14, Math.round(r.value - drop)) }
  })
  const updatedZones = garden.zones.map((z) => {
    const sensorId = ADV_SENSORS[z.id]
    const newValue = updatedReadings.find((r) => r.sensorId === sensorId)?.value
    if (newValue === undefined) return z
    if (newValue <= 18) {
      return {
        ...z,
        moistureStatus: 'dry' as const,
        health: 'action' as const,
        headline: 'Soil is quite dry — water soon.',
      }
    }
    if (newValue <= 25) {
      return {
        ...z,
        moistureStatus: 'dry' as const,
        health: z.health === 'action' ? ('action' as const) : ('watch' as const),
        headline: 'Moisture running low — check and water soon.',
      }
    }
    return z
  })
  return { ...garden, readings: updatedReadings, zones: updatedZones }
}

export function GardenProvider({ children }: { children: React.ReactNode }) {
  const initialGardenMode: GardenMode = (() => {
    const raw = localStorage.getItem('elk_garden_mode_v1')
    return raw === 'production' ? 'production' : 'calm_supportive'
  })()

  const [state, setState] = useState<GardenState>({
    garden: null,
    weather: null,
    profile: null,
    gardenMode: initialGardenMode,
    isLoading: true,
    error: null,
    activityLog: [],
  })

  useEffect(() => {
    let cancelled = false
    setState((s) => ({ ...s, isLoading: true, error: null }))

    Promise.all([
      gardenDataSource.getGarden(),
      weatherService.getWeatherSummary('garden_elk_home'),
      profileService.getProfile(),
    ])
      .then(([garden, weather, profile]) => {
        if (cancelled) return
        setState((s) => ({
          ...s,
          garden: applyTomatoMoistureState(garden, loadTomatoMoistureState()),
          weather,
          profile,
          isLoading: false,
          error: null,
        }))
      })
      .catch(() => {
        if (cancelled) return
        setState((s) => ({
          ...s,
          garden: null,
          weather: null,
          profile: null,
          isLoading: false,
          error: 'We couldn’t load your garden right now.',
        }))
      })

    return () => {
      cancelled = true
    }
  }, [])

  const actions: GardenActions = useMemo(
    () => ({
      toggleTask(taskId: string) {
        if (!state.garden) return null

        const task = state.garden.tasks.find((t) => t.id === taskId)
        if (!task) return null

        const zone = task.zoneId
          ? state.garden.zones.find((z) => z.id === task.zoneId)
          : null
        const taskType = classifyTask(task.id, task.title)
        const nextCompleted = !task.completed
        const shouldApplyGardenProgress = nextCompleted && zone

        const nextTomatoState: TomatoMoistureState | null =
          taskId === TOMATOES_WATERING_TASK_ID && nextCompleted
            ? {
                moistureStatus: 'ok',
                lastWateredAt: new Date().toISOString(),
                needsFollowUpCheck: true,
                source: 'task-completion',
              }
            : taskId === TOMATOES_FOLLOW_UP_TASK_ID && nextCompleted
              ? {
                  ...loadTomatoMoistureState(),
                  needsFollowUpCheck: false,
                }
              : null

        if (nextTomatoState) saveTomatoMoistureState(nextTomatoState)

        const nextZone =
          shouldApplyGardenProgress &&
          taskType === 'water' &&
          zone.moistureStatus === 'dry'
            ? {
                ...zone,
                moistureStatus: 'good' as const,
                health: 'good' as const,
                headline:
                  'Moisture looks steady again. Keep an eye on the soil and water when the top inch starts to dry.',
              }
            : shouldApplyGardenProgress &&
                taskType === 'hold-water' &&
                zone.moistureStatus === 'wet'
              ? {
                  ...zone,
                  moistureStatus: 'good' as const,
                  health: 'good' as const,
                  headline:
                    'Moisture is settling back into a better range. Hold off watering until the top inch starts to dry.',
                }
              : zone

        const result: TaskCompletionResult = {
          taskId,
          completed: nextCompleted,
          message: nextCompleted
            ? completionMessage(taskType, zone?.name)
            : 'Task reopened',
          log: {
            zoneId: zone?.id ?? null,
            taskType,
            timestamp: new Date().toISOString(),
            previousState: {
              taskCompleted: task.completed,
              moistureStatus: zone?.moistureStatus,
              health: zone?.health,
            },
            newState: {
              taskCompleted: nextCompleted,
              moistureStatus: nextZone?.moistureStatus,
              health: nextZone?.health,
            },
          },
        }

        if (nextCompleted) {
          console.info('[elk-garden] task completed', result.log)
        }

        setState((s) => {
          if (!s.garden) return s
          const gardenWithTask = {
            ...s.garden,
            tasks: s.garden.tasks.map((t) =>
              t.id === taskId ? { ...t, completed: nextCompleted } : t,
            ),
          }
          if (nextTomatoState) {
            return {
              ...s,
              garden: applyTomatoMoistureState(gardenWithTask, nextTomatoState),
            }
          }
          const activeZone = nextZone
          return {
            ...s,
            garden: {
              ...gardenWithTask,
              // This is the first signal → action → feedback loop.
              zones: activeZone
                ? s.garden.zones.map((z) =>
                    z.id === activeZone.id ? activeZone : z,
                  )
                : s.garden.zones,
              readings:
                activeZone?.id === TOMATOES_ZONE_ID &&
                activeZone.moistureStatus === 'good'
                  ? s.garden.readings.map((r) =>
                      r.sensorId === 'sensor_tomatoes_moisture'
                        ? { ...r, value: 34 }
                        : r,
                    )
                  : s.garden.readings,
            },
          }
        })

        return result
      },
      async saveProfile(profile: GardenProfile) {
        await profileService.saveProfile(profile)
        setState((s) => ({ ...s, profile }))
      },
      setGardenMode(mode: GardenMode) {
        localStorage.setItem('elk_garden_mode_v1', mode)
        setState((s) => ({ ...s, gardenMode: mode }))
      },
      simulateTomato24Hours() {
        const current = loadTomatoMoistureState()
        const shifted = {
          ...current,
          moistureStatus: 'ok' as const,
          lastWateredAt: new Date(
            Date.now() - (TOMATO_DRY_AFTER_HOURS + 1) * 60 * 60 * 1000,
          ).toISOString(),
          source: 'task-completion' as const,
        }
        const decayed = applyTomatoTimeDecay(shifted)
        saveTomatoMoistureState(decayed)
        setState((s) =>
          s.garden
            ? { ...s, garden: applyTomatoMoistureState(s.garden, decayed) }
            : s,
        )
      },
      reportObservation(event: GardenObservationEvent) {
        if (!state.garden) return { event, added: false }
        const result = withObservationEvent(state.garden, event)
        setState((s) => (s.garden ? { ...s, garden: result.garden } : s))
        return { event, added: result.added }
      },
      ingestSignal(event: GardenSignalEvent) {
        if (!state.garden) return null
        // Ingestion layer: future Arduino/API events should enter here, not mutate UI state.
        const result = ingestGardenSignal(state.garden, event)
        if (result.tomatoMoistureState) {
          saveTomatoMoistureState(result.tomatoMoistureState)
        }
        setState((s) => {
          if (!s.garden) return s
          const activityLog = result.activityEntry
            ? [result.activityEntry, ...s.activityLog].slice(0, 50)
            : s.activityLog
          if (result.tomatoMoistureState) {
            return {
              ...s,
              activityLog,
              garden: applyTomatoMoistureState(
                result.garden,
                result.tomatoMoistureState,
              ),
            }
          }
          return { ...s, activityLog, garden: result.garden }
        })
        return result
      },
      async resetGarden() {
        const defaultTomato: TomatoMoistureState = {
          moistureStatus: 'ok',
          lastWateredAt: null,
          needsFollowUpCheck: false,
          source: 'task-completion',
        }
        saveTomatoMoistureState(defaultTomato)
        const freshGarden = await gardenDataSource.getGarden()
        setState((s) => ({
          ...s,
          garden: applyTomatoMoistureState(freshGarden, defaultTomato),
          activityLog: [],
        }))
      },
      advanceTime(hours: 6 | 24) {
        const now = new Date().toISOString()
        const entry: ActivityLogEntry = {
          id: `advance-${hours}h-${now}`,
          capturedAtISO: now,
          message:
            hours === 24
              ? 'Simulation: 24-hour advance — garden conditions updated'
              : 'Simulation: 6-hour advance — afternoon conditions applied',
          kind: 'healthy',
          source: 'local-dev-tool',
          direction: 'alert',
        }
        setState((s) => {
          if (!s.garden) return s
          const nextGarden = advanceGardenTime(s.garden, hours)
          const tomatoZone = nextGarden.zones.find((z) => z.id === TOMATOES_ZONE_ID)
          if (tomatoZone?.moistureStatus === 'dry') {
            saveTomatoMoistureState({
              moistureStatus: 'dry',
              lastWateredAt: null,
              needsFollowUpCheck: false,
              source: 'sensor-ingestion',
            })
          }
          return {
            ...s,
            garden: nextGarden,
            activityLog: [entry, ...s.activityLog].slice(0, 50),
          }
        })
      },
      clearActivityLog() {
        setState((s) => ({ ...s, activityLog: [] }))
      },
    }),
    [state.garden],
  )

  const value = useMemo(() => ({ ...state, ...actions }), [state, actions])

  return <GardenContext.Provider value={value}>{children}</GardenContext.Provider>
}

export function useGardenStore() {
  const ctx = useContext(GardenContext)
  if (!ctx) {
    throw new Error('useGardenStore must be used within GardenProvider')
  }
  return ctx
}

