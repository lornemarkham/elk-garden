import { getApiBaseUrl } from '../apiBase'

export const DEFAULT_AKASO_RTSP_URL = 'rtsp://192.72.1.1/H264'

export async function fetchAkasoLabSnapshot(rtspUrl: string): Promise<Blob> {
  const base = getApiBaseUrl()
  const url = `${base}/api/lab/akaso/snapshot?rtspUrl=${encodeURIComponent(rtspUrl)}`
  const res = await fetch(url)
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null
    throw new Error(body?.error ?? 'Could not reach the AKASO camera stream.')
  }
  return res.blob()
}

export async function probeAkasoLabStream(rtspUrl: string): Promise<void> {
  const base = getApiBaseUrl()
  const url = `${base}/api/lab/akaso/probe?rtspUrl=${encodeURIComponent(rtspUrl)}`
  const res = await fetch(url)
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null
    throw new Error(body?.error ?? 'Could not reach the AKASO camera stream.')
  }
}
