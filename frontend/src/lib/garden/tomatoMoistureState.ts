import type { Garden } from '../../types'

export type TomatoMoistureStatus = 'dry' | 'ok' | 'wet'

export type TomatoMoistureState = {
  moistureStatus: TomatoMoistureStatus
  lastWateredAt: string | null
  needsFollowUpCheck: boolean
  source?: 'sensor-ingestion' | 'task-completion' | 'time-decay'
}

export const TOMATO_MOISTURE_STATE_KEY = 'elk_tomato_moisture_v1'
export const TOMATOES_ZONE_ID = 'zone_tomatoes'
export const TOMATOES_WATERING_TASK_ID = 'task_water_tomatoes'
export const TOMATOES_FOLLOW_UP_TASK_ID = 'task_check_tomatoes_followup'
export const TOMATO_DRY_AFTER_HOURS = 24

export const initialTomatoMoistureState: TomatoMoistureState = {
  moistureStatus: 'ok',
  lastWateredAt: null,
  needsFollowUpCheck: false,
}

export function applyTomatoTimeDecay(
  state: TomatoMoistureState,
  nowMs = Date.now(),
): TomatoMoistureState {
  if (state.moistureStatus !== 'ok' || !state.lastWateredAt) return state

  const lastWateredMs = new Date(state.lastWateredAt).getTime()
  if (!Number.isFinite(lastWateredMs)) return state

  const hoursSinceLastWatered = (nowMs - lastWateredMs) / (1000 * 60 * 60)
  if (hoursSinceLastWatered < TOMATO_DRY_AFTER_HOURS) return state

  // This is the first time-based loop. Later this can be driven by real sensor readings and weather.
  return {
    ...state,
    moistureStatus: 'dry',
    needsFollowUpCheck: false,
    source: 'time-decay',
  }
}

export function loadTomatoMoistureState(): TomatoMoistureState {
  try {
    const raw = localStorage.getItem(TOMATO_MOISTURE_STATE_KEY)
    if (!raw) return initialTomatoMoistureState
    const parsed = JSON.parse(raw) as Partial<TomatoMoistureState>
    const moistureStatus =
      parsed.moistureStatus === 'ok' ||
      parsed.moistureStatus === 'wet' ||
      parsed.moistureStatus === 'dry'
        ? parsed.moistureStatus
        : 'ok'
    const source =
      parsed.source === 'sensor-ingestion' ||
      parsed.source === 'task-completion' ||
      parsed.source === 'time-decay'
        ? parsed.source
        : undefined
    const state = {
      moistureStatus:
        moistureStatus === 'dry' && !source ? initialTomatoMoistureState.moistureStatus : moistureStatus,
      lastWateredAt:
        typeof parsed.lastWateredAt === 'string' ? parsed.lastWateredAt : null,
      needsFollowUpCheck: parsed.needsFollowUpCheck === true,
      source,
    }
    const decayed = applyTomatoTimeDecay(state)
    if (decayed !== state) saveTomatoMoistureState(decayed)
    return decayed
  } catch {
    return initialTomatoMoistureState
  }
}

export function saveTomatoMoistureState(state: TomatoMoistureState): void {
  try {
    localStorage.setItem(TOMATO_MOISTURE_STATE_KEY, JSON.stringify(state))
  } catch {
    // ignore
  }
}

function tomatoHeadline(state: TomatoMoistureState): string {
  if (state.moistureStatus === 'dry') {
    return 'Zone 1 Tomatoes: soil moisture low'
  }
  if (state.moistureStatus === 'wet') {
    return 'A little wet right now. Give the soil time to breathe before watering again.'
  }
  const watered = state.lastWateredAt
    ? ` Last watered ${new Date(state.lastWateredAt).toLocaleString([], {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })}.`
    : ''
  if (!watered && !state.needsFollowUpCheck) {
    return 'Waiting for sensor feedback. Moisture status will update when a garden signal arrives.'
  }
  return `Tomatoes watered — check again tomorrow.${watered}`
}

function tomatoGardenStatus(state: TomatoMoistureState): {
  moistureStatus: Garden['zones'][number]['moistureStatus']
  health: Garden['zones'][number]['health']
} {
  if (state.moistureStatus === 'dry') return { moistureStatus: 'dry', health: 'watch' }
  if (state.moistureStatus === 'wet') return { moistureStatus: 'wet', health: 'watch' }
  return { moistureStatus: 'good', health: 'good' }
}

export function applyTomatoMoistureState(
  garden: Garden,
  state: TomatoMoistureState,
): Garden {
  const tomatoStatus = tomatoGardenStatus(state)
  const hasFollowUpTask = garden.tasks.some(
    (t) => t.id === TOMATOES_FOLLOW_UP_TASK_ID,
  )

  const tasks = garden.tasks
    .filter(
      (t) =>
        t.id !== TOMATOES_FOLLOW_UP_TASK_ID || state.needsFollowUpCheck,
    )
    .map((t) =>
      t.id === TOMATOES_WATERING_TASK_ID
        ? {
            ...t,
            completed: state.moistureStatus !== 'dry',
          }
        : t,
    )
    .concat(
      state.needsFollowUpCheck && !hasFollowUpTask
        ? [
            {
              id: TOMATOES_FOLLOW_UP_TASK_ID,
              gardenId: garden.id,
              zoneId: TOMATOES_ZONE_ID,
              title: 'Check tomato soil tomorrow morning',
              supportiveNote: 'Make sure the soil settled into a steady range.',
              completed: false,
            },
          ]
        : [],
    )

  // This is the first local signal → action → follow-up loop.
  return {
    ...garden,
    zones: garden.zones.map((z) =>
      z.id === TOMATOES_ZONE_ID
        ? {
            ...z,
            ...tomatoStatus,
            headline: tomatoHeadline(state),
          }
        : z,
    ),
    readings: garden.readings.map((r) =>
      r.sensorId === 'sensor_tomatoes_moisture'
        ? {
            ...r,
            value:
              state.moistureStatus === 'dry'
                ? 21
                : state.moistureStatus === 'wet'
                  ? 46
                  : 34,
          }
        : r,
    ),
    tasks,
  }
}
