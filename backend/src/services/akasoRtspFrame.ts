import { spawn } from 'node:child_process'

const DEFAULT_RTSP_URL = 'rtsp://192.72.1.1/H264'

const ALLOWED_RTSP_HOSTS = new Set(['192.72.1.1', '192.168.169.1', '127.0.0.1', 'localhost'])

export function normalizeAkasoRtspUrl(raw: string | undefined): string {
  const trimmed = (raw ?? DEFAULT_RTSP_URL).trim()
  if (!trimmed) return DEFAULT_RTSP_URL

  let parsed: URL
  try {
    parsed = new URL(trimmed)
  } catch {
    throw new Error('RTSP URL must look like rtsp://192.72.1.1/H264')
  }

  if (parsed.protocol !== 'rtsp:') {
    throw new Error('Only rtsp:// URLs are supported in AKASO WiFi mode.')
  }

  if (!ALLOWED_RTSP_HOSTS.has(parsed.hostname)) {
    throw new Error(
      `RTSP host "${parsed.hostname}" is not allowed. Use the camera hotspot IP (usually 192.72.1.1).`,
    )
  }

  return parsed.toString()
}

export function captureRtspJpegFrame(rtspUrl: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const args = [
      '-hide_banner',
      '-loglevel',
      'error',
      '-rtsp_transport',
      'tcp',
      '-stimeout',
      '5_000_000',
      '-i',
      rtspUrl,
      '-an',
      '-frames:v',
      '1',
      '-f',
      'image2',
      '-q:v',
      '5',
      'pipe:1',
    ]

    const proc = spawn('ffmpeg', args, { stdio: ['ignore', 'pipe', 'pipe'] })
    const chunks: Buffer[] = []
    let stderr = ''

    proc.stdout.on('data', (chunk: Buffer) => chunks.push(chunk))
    proc.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString()
    })

    const timeout = setTimeout(() => {
      proc.kill('SIGKILL')
      reject(
        new Error(
          'Timed out reaching the AKASO stream. Join the camera WiFi (iCam-AKASO_*) and try again.',
        ),
      )
    }, 12_000)

    proc.on('error', (err) => {
      clearTimeout(timeout)
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
        reject(new Error('ffmpeg is not installed. Install ffmpeg to use AKASO WiFi mode.'))
        return
      }
      reject(err)
    })

    proc.on('close', (code) => {
      clearTimeout(timeout)
      if (code === 0 && chunks.length > 0) {
        resolve(Buffer.concat(chunks))
        return
      }
      const tail = stderr.trim().split('\n').slice(-3).join(' ')
      reject(
        new Error(
          tail ||
            'Could not read a frame from the AKASO. Join camera WiFi, turn WiFi mode on, then retry.',
        ),
      )
    })
  })
}
