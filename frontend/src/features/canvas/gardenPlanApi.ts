import {
  GARDEN_PLAN_GENERATION_FAILED_ERROR,
  GARDEN_PLAN_INVALID_AI_SHAPE_ERROR,
  GARDEN_PLAN_OPENAI_KEY_MISSING_ERROR,
  type GardenPlanRequest,
  type GardenPlanResponse,
} from '@shared/gardenPlanContract'
import { getApiBaseUrl } from '../../lib/apiBase'

const GARDEN_PLAN_PATH = '/api/plans/build'

function gardenPlanRequestUrl(): string {
  const base = getApiBaseUrl()
  if (base) return `${base}${GARDEN_PLAN_PATH}`
  return GARDEN_PLAN_PATH
}

function friendlyErrorMessage(serverError: string): string {
  if (serverError === GARDEN_PLAN_INVALID_AI_SHAPE_ERROR) {
    return 'We could not read the garden plan from the assistant. Please try again.'
  }
  if (serverError === GARDEN_PLAN_OPENAI_KEY_MISSING_ERROR) {
    return 'Garden planning is not set up on the server yet. Ask the person who runs the app to check server configuration.'
  }
  if (serverError === GARDEN_PLAN_GENERATION_FAILED_ERROR) {
    return 'The planning service could not finish your request. Try again in a moment.'
  }
  return serverError
}

export async function fetchGardenPlan(
  body: GardenPlanRequest,
): Promise<GardenPlanResponse> {
  const url = gardenPlanRequestUrl()
  console.log('[garden-plan] frontend fetch URL:', url)

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  const text = await res.text()

  let data: unknown
  try {
    data = text.length ? (JSON.parse(text) as unknown) : null
  } catch (parseErr) {
    console.log('[garden-plan] Server response (non-JSON):', {
      status: res.status,
      contentType: res.headers.get('content-type'),
      textPreview: text.slice(0, 2000),
      parseError:
        parseErr instanceof Error ? parseErr.message : String(parseErr),
    })
    throw new Error('The server sent an invalid response. Try again.')
  }

  if (!res.ok) {
    console.log('[garden-plan] Server response (error):', {
      status: res.status,
      body: data,
    })
    const serverError =
      data &&
      typeof data === 'object' &&
      'error' in data &&
      typeof (data as { error: unknown }).error === 'string'
        ? (data as { error: string }).error
        : 'Could not get a plan. Try again.'
    throw new Error(friendlyErrorMessage(serverError))
  }

  const d = data as Record<string, unknown>
  const stringArr = (k: string) =>
    Array.isArray(d[k]) && (d[k] as unknown[]).every((x) => typeof x === 'string')

  if (
    !data ||
    typeof data !== 'object' ||
    typeof d.plan_summary !== 'string' ||
    !stringArr('layout_strategy') ||
    !stringArr('companion_planting') ||
    !stringArr('watering_strategy') ||
    !stringArr('threat_mitigation') ||
    !stringArr('next_steps')
  ) {
    console.log('[garden-plan] Server response (200 but invalid shape):', {
      status: res.status,
      body: data,
    })
    throw new Error('The server returned an unexpected response. Try again.')
  }

  const weekly_plan = stringArr('weekly_plan')
    ? (d.weekly_plan as string[])
    : []

  return {
    plan_summary: d.plan_summary,
    layout_strategy: d.layout_strategy as string[],
    companion_planting: d.companion_planting as string[],
    watering_strategy: d.watering_strategy as string[],
    threat_mitigation: d.threat_mitigation as string[],
    weekly_plan,
    next_steps: d.next_steps as string[],
  }
}
