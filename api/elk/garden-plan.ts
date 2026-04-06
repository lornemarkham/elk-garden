import type { VercelRequest, VercelResponse } from '@vercel/node'
import { processGardenPlanRequest } from '../../backend/src/services/gardenPlanService'

function getJsonBody(
  req: VercelRequest,
): { ok: true; data: unknown } | { ok: false; error: string } {
  const b = req.body
  if (b == null || b === '') {
    return { ok: true, data: {} }
  }
  if (typeof b === 'string') {
    try {
      return { ok: true, data: JSON.parse(b) as unknown }
    } catch {
      return { ok: false, error: 'Invalid JSON body.' }
    }
  }
  if (typeof b === 'object') {
    return { ok: true, data: b }
  }
  return { ok: false, error: 'Invalid request body.' }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method === 'OPTIONS') {
      res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
      return res.status(204).end()
    }

    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' })
    }

    console.log('[garden-plan] request hit api route')

    const parsed = getJsonBody(req)
    if (!parsed.ok) {
      return res.status(400).json({ error: parsed.error })
    }

    const result = await processGardenPlanRequest(parsed.data)
    return res.status(result.status).json(result.body)
  } catch (err) {
    console.error('[garden-plan] Unhandled route error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
