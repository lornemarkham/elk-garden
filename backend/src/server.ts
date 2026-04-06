import { config as loadEnv } from 'dotenv'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createApp } from './app.js'

const here = dirname(fileURLToPath(import.meta.url))
/** Load `backend/.env` (this file is `backend/src/server.ts`). */
loadEnv({ path: resolve(here, '../.env') })

const PORT = Number(process.env.PORT) || Number(process.env.ELK_API_PORT) || 8788

const app = createApp()

app.listen(PORT, () => {
  console.log(`[elk-garden-backend] listening on http://localhost:${PORT}`)
  console.log(
    `[elk-garden-backend] OPENAI_API_KEY loaded: ${Boolean(process.env.OPENAI_API_KEY?.trim())}`,
  )
})
