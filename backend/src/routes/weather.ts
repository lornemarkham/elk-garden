import { Router } from 'express'
import { fetchVernonCurrentWeather } from '../services/openMeteoWeather.js'

export const weatherRouter = Router()

weatherRouter.get('/api/weather/current', async (_req, res) => {
  try {
    const weather = await fetchVernonCurrentWeather()
    res.json(weather)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not fetch weather.'
    res.status(502).json({ error: message })
  }
})
