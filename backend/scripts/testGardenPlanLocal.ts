/**
 * Local smoke test for POST /api/plans/build.
 * Run the backend first: `npm run dev -w elk-garden-backend`
 * Then from repo root: `npm run test:elk-plan`
 */
import { config as loadEnv } from 'dotenv'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptDir = dirname(fileURLToPath(import.meta.url))
loadEnv({ path: resolve(scriptDir, '../.env') })

const PORT = Number(process.env.ELK_API_PORT) || Number(process.env.PORT) || 8788
const URL = `http://127.0.0.1:${PORT}/api/plans/build`

const payload = {
  location: 'Vernon, BC',
  goals: 'high yield',
  threats: ['deer', 'heat', 'dry soil'],
  crops: ['tomatoes', 'basil', 'beans', 'lettuce'],
  areas: [
    {
      area_name: 'Tomato bed',
      size: '4 x 8 ft',
      sun: 'full sun',
      notes: 'Warm, sunny spot',
    },
    {
      area_name: 'Herb garden',
      size: '2 x 4 ft',
      sun: 'full sun',
      notes: 'Near kitchen',
    },
  ],
} as const

async function main() {
  console.log('[garden-plan] test POST', URL)
  const res = await fetch(URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const text = await res.text()
  console.log('[garden-plan] test status:', res.status)
  try {
    const json = JSON.parse(text) as unknown
    console.log(
      '[garden-plan] test body (JSON):',
      JSON.stringify(json, null, 2).slice(0, 12000),
    )
  } catch {
    console.log('[garden-plan] test body (raw text):', text.slice(0, 2000))
  }
  if (!res.ok) process.exitCode = 1
}

main().catch((e) => {
  console.error('[garden-plan] test failed:', e)
  process.exitCode = 1
})
