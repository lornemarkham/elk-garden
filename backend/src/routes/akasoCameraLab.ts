import { Router } from 'express'
import {
  captureRtspJpegFrame,
  normalizeAkasoRtspUrl,
} from '../services/akasoRtspFrame.js'

export const akasoCameraLabRouter = Router()

akasoCameraLabRouter.get('/api/lab/akaso/snapshot', async (req, res) => {
  try {
    const rtspUrl = normalizeAkasoRtspUrl(
      typeof req.query.rtspUrl === 'string' ? req.query.rtspUrl : undefined,
    )
    const jpeg = await captureRtspJpegFrame(rtspUrl)
    res.setHeader('Content-Type', 'image/jpeg')
    res.setHeader('Cache-Control', 'no-store')
    res.send(jpeg)
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Could not capture AKASO frame.'
    res.status(502).json({ error: message })
  }
})

akasoCameraLabRouter.get('/api/lab/akaso/probe', async (req, res) => {
  try {
    const rtspUrl = normalizeAkasoRtspUrl(
      typeof req.query.rtspUrl === 'string' ? req.query.rtspUrl : undefined,
    )
    await captureRtspJpegFrame(rtspUrl)
    res.json({ ok: true, rtspUrl })
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Could not reach AKASO stream.'
    res.status(502).json({ ok: false, error: message })
  }
})
