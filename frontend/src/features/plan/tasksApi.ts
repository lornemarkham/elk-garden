import type { GardenPlanResponse } from '@shared/gardenPlanContract'
import { getApiBaseUrl } from '../../lib/apiBase'
import type { StoredGardenArea } from '../canvas/gardenStateStorage'
import type { PlanTaskRecord } from './planTasksStorage'

const TASKS_GENERATE_PATH = '/api/tasks/generate'

function tasksGenerateUrl(): string {
  const base = getApiBaseUrl()
  if (base) return `${base}${TASKS_GENERATE_PATH}`
  return TASKS_GENERATE_PATH
}

export async function fetchGeneratedTasks(params: {
  plan: GardenPlanResponse | null
  areas: StoredGardenArea[]
  threats: Record<string, boolean>
  userCrops: string[]
}): Promise<PlanTaskRecord[]> {
  const url = tasksGenerateUrl()
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  })

  const text = await res.text()
  let data: unknown
  try {
    data = text.length ? (JSON.parse(text) as unknown) : null
  } catch {
    throw new Error('The tasks service sent an invalid response. Try again.')
  }

  if (!res.ok) {
    const msg =
      data &&
      typeof data === 'object' &&
      'error' in data &&
      typeof (data as { error: unknown }).error === 'string'
        ? (data as { error: string }).error
        : 'Could not generate tasks. Try again.'
    throw new Error(msg)
  }

  if (
    !data ||
    typeof data !== 'object' ||
    !Array.isArray((data as { tasks?: unknown }).tasks)
  ) {
    throw new Error('The tasks service returned an unexpected response.')
  }

  return (data as { tasks: PlanTaskRecord[] }).tasks
}
