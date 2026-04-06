/** Server `{ error }` when model output fails JSON parse or validation. */
export const GARDEN_PLAN_INVALID_AI_SHAPE_ERROR = 'Invalid AI response shape'

/** Server `{ error }` when `OPENAI_API_KEY` is not set. */
export const GARDEN_PLAN_OPENAI_KEY_MISSING_ERROR = 'OPENAI_API_KEY is missing'

/** Server `{ error }` when OpenAI or transport fails (non-shape errors). */
export const GARDEN_PLAN_GENERATION_FAILED_ERROR = 'Failed to generate garden plan'

/** Sun levels sent to the garden-plan API (plain language). */
export type GardenPlanSun = 'full sun' | 'part sun' | 'shade' | 'unsure'

/** One row within a bed (optional row label, crop, notes, width). */
export type GardenPlanAreaRow = {
  row_label?: string
  crop?: string
  notes?: string
  /** Row width in inches (optional). */
  width_inches?: string
}

export type GardenPlanRequest = {
  location?: string
  goals?: string
  threats?: string[]
  crops?: string[]
  areas: {
    area_name: string
    size?: string
    sun?: GardenPlanSun
    notes?: string
    /** Flat list of crops in this area (optional; may mirror rows). */
    crops?: string[]
    /** Row-level placement when provided. */
    rows?: GardenPlanAreaRow[]
  }[]
}

/** Success JSON from POST /api/elk/garden-plan (strict OpenAI schema). */
export type GardenPlanResponse = {
  plan_summary: string
  layout_strategy: string[]
  companion_planting: string[]
  watering_strategy: string[]
  threat_mitigation: string[]
  /** 3–6 short tasks phrased for “this week”, tied to crops/threats/location. */
  weekly_plan: string[]
  next_steps: string[]
}
