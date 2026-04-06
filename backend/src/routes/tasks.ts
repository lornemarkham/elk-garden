import { Router } from 'express'
import { tasksGenerateBodySchema } from '../schemas/tasksGenerate.js'
import { generateTasksFromInputs } from '../services/taskGenerationService.js'

export const tasksRouter = Router()

tasksRouter.post('/api/tasks/generate', (req, res) => {
  const parsed = tasksGenerateBodySchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({
      error: 'Invalid request body',
      details: parsed.error.flatten(),
    })
  }
  try {
    const tasks = generateTasksFromInputs(parsed.data)
    res.json({ tasks })
  } catch (err) {
    console.error('[api/tasks/generate]', err)
    res.status(500).json({ error: 'Failed to generate tasks' })
  }
})
