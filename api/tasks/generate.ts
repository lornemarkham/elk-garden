import type { VercelRequest, VercelResponse } from '@vercel/node'
import { tasksGenerateBodySchema } from '../../backend/src/schemas/tasksGenerate'
import { generateTasksFromInputs } from '../../backend/src/services/taskGenerationService'

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

    const parsed = getJsonBody(req)
    if (!parsed.ok) {
      return res.status(400).json({ error: parsed.error })
    }

    const check = tasksGenerateBodySchema.safeParse(parsed.data)
    if (!check.success) {
      return res.status(400).json({
        error: 'Invalid request body',
        details: check.error.flatten(),
      })
    }

    const tasks = generateTasksFromInputs(check.data)
    return res.status(200).json({ tasks })
  } catch (err) {
    console.error('[api/tasks/generate]', err)
    return res.status(500).json({ error: 'Failed to generate tasks' })
  }
}
