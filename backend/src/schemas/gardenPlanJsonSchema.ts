/**
 * JSON Schema for OpenAI structured outputs (strict mode).
 * Mirrors GardenPlanResponse — keep in sync with validateGardenPlanResponse.
 */
export const GARDEN_PLAN_JSON_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    plan_summary: { type: 'string' },
    layout_strategy: {
      type: 'array',
      items: { type: 'string' },
    },
    companion_planting: {
      type: 'array',
      items: { type: 'string' },
    },
    watering_strategy: {
      type: 'array',
      items: { type: 'string' },
    },
    threat_mitigation: {
      type: 'array',
      items: { type: 'string' },
    },
    weekly_plan: {
      type: 'array',
      items: { type: 'string' },
      minItems: 3,
      maxItems: 6,
    },
    next_steps: {
      type: 'array',
      items: { type: 'string' },
    },
  },
  required: [
    'plan_summary',
    'layout_strategy',
    'companion_planting',
    'watering_strategy',
    'threat_mitigation',
    'weekly_plan',
    'next_steps',
  ],
} as const
