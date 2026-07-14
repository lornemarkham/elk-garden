import cors from 'cors'
import express from 'express'
import { healthRouter } from './routes/health.js'
import { plansRouter } from './routes/plans.js'
import { sensorReadingsRouter } from './routes/sensorReadings.js'
import { tasksRouter } from './routes/tasks.js'
import { weatherRouter } from './routes/weather.js'
import { akasoCameraLabRouter } from './routes/akasoCameraLab.js'
import { liveSensorRouter } from './routes/liveSensor.js'
import { debugSensorWriteRouter } from './routes/debugSensorWrite.js'

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
  app.use(sensorReadingsRouter)
  app.use(liveSensorRouter)
  app.use(weatherRouter)
  app.use(akasoCameraLabRouter)
  // TEMPORARY: Postgres write probe — delete with debugSensorWrite.ts after verification
  app.use(debugSensorWriteRouter)

  return app
}
