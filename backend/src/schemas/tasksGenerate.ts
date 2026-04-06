import { z } from 'zod'

const sun = z.enum(['full_sun', 'part_sun', 'shade', 'unsure'])

const rowSchema = z.object({
  id: z.string(),
  crop: z.string(),
  widthInches: z.string(),
  notes: z.string(),
  planted: z.boolean().optional(),
  gardenLog: z.string().optional(),
})

const areaSchema = z.object({
  id: z.string(),
  name: z.string(),
  size: z.string(),
  sun,
  notes: z.string(),
  gardenLog: z.string().optional(),
  plannedPlantingDate: z.string().optional(),
  rows: z.array(rowSchema),
})

const gardenPlanResponseSchema = z.object({
  plan_summary: z.string(),
  layout_strategy: z.array(z.string()),
  companion_planting: z.array(z.string()),
  watering_strategy: z.array(z.string()),
  threat_mitigation: z.array(z.string()),
  weekly_plan: z.array(z.string()),
  next_steps: z.array(z.string()),
})

/** Body for POST /api/tasks/generate */
export const tasksGenerateBodySchema = z.object({
  plan: gardenPlanResponseSchema.nullable(),
  areas: z.array(areaSchema),
  threats: z.record(z.string(), z.boolean()),
  userCrops: z.array(z.string()),
})

export type TasksGenerateBody = z.infer<typeof tasksGenerateBodySchema>
