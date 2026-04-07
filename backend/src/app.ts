import cors from 'cors'
import express from 'express'
import { healthRouter } from './routes/health.js'
import { plansRouter } from './routes/plans.js'
import { tasksRouter } from './routes/tasks.js'

export function createApp() {
  const app = express()
  app.use(
    cors({
      origin: true,
      methods: ['GET', 'POST', 'OPTIONS'],
      allowedHeaders: ['Content-Type'],
    }),
  )
  app.options('*', cors())

  app.use(express.json({ limit: '1mb' }))

  app.use(healthRouter)
  app.use(plansRouter)
  app.use(tasksRouter)

  return app
}
