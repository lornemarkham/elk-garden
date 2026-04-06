import { Router } from 'express'
import { processGardenPlanRequest } from '../services/gardenPlanService.js'

export const plansRouter = Router()

plansRouter.post('/api/plans/build', async (req, res) => {
  try {
    const result = await processGardenPlanRequest(req.body)
    res.status(result.status).json(result.body)
  } catch (err) {
    console.error('[api/plans/build]', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})
