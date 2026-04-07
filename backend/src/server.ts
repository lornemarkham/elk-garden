import { config as loadEnv } from 'dotenv'
import { existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createApp } from './app.js'

const here = dirname(fileURLToPath(import.meta.url))
/** Load `backend/.env` — works for `src/server.ts` (dev) and `dist/backend/src/server.js` (prod). */
const envNextToSrc = resolve(here, '../.env')
const envFromNestedDist = resolve(here, '../../../.env')
loadEnv({ path: existsSync(envNextToSrc) ? envNextToSrc : envFromNestedDist })

const PORT = Number(process.env.PORT) || Number(process.env.ELK_API_PORT) || 8788

const app = createApp()

app.listen(PORT, () => {
  console.log(`[elk-garden-backend] listening on http://localhost:${PORT}`)
  console.log(
    `[elk-garden-backend] OPENAI_API_KEY loaded: ${Boolean(process.env.OPENAI_API_KEY?.trim())}`,
  )
})
