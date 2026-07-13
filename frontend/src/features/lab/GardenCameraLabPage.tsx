import clsx from 'clsx'
import { Camera, FlaskConical, ImageIcon, Info, RefreshCw, RotateCcw } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Card } from '../../components/Card'
import { ElkGardenPageBranding } from '../../components/ElkGardenPageBranding'
import {
  DEFAULT_AKASO_RTSP_URL,
  fetchAkasoLabSnapshot,
} from '../../lib/api/akasoCameraLabApi'

type LabSnapshot = {
  id: string
  dataUrl: string
  capturedAtISO: string
}

type VideoDeviceOption = {
  deviceId: string
  label: string
}

type CameraErrorKind = 'unsupported' | 'denied' | 'not-found' | 'unknown'

type StreamStatus = 'live' | 'off' | 'error'

type SourceMode = 'usb' | 'akaso-wifi'

const AUTO_RESTART_DELAY_MS = 800
const AKASO_POLL_MS = 250

/** Substrings that suggest an external / AKASO-style camera (case-insensitive). */
const EXTERNAL_CAMERA_HINTS = [
  { text: 'akaso', score: 40 },
  { text: 'video control', score: 35 },
  { text: 'icam', score: 30 },
  { text: 'usb', score: 25 },
  { text: 'dv', score: 20 },
  { text: 'camera', score: 10 },
] as const

/** Built-in laptop cameras — deprioritize when an external source is available. */
const BUILTIN_CAMERA_HINTS = ['facetime', 'built-in', 'integrated', 'isight'] as const

function classifyCameraError(err: unknown): { kind: CameraErrorKind; message: string } {
  const name = err instanceof DOMException ? err.name : ''
  const message = err instanceof Error ? err.message : String(err)

  if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
    return {
      kind: 'denied',
      message:
        'Camera permission was denied. Allow camera access in your browser settings, then reload this page.',
    }
  }
  if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
    return {
      kind: 'not-found',
      message:
        'No camera was found on this device. Connect a USB camera and try again.',
    }
  }
  return {
    kind: 'unknown',
    message: message || 'Could not start the camera. Try reloading the page.',
  }
}

function scoreExternalCameraLabel(label: string): number {
  const lower = label.toLowerCase()
  let score = EXTERNAL_CAMERA_HINTS.reduce(
    (sum, hint) => (lower.includes(hint.text) ? sum + hint.score : sum),
    0,
  )
  for (const hint of BUILTIN_CAMERA_HINTS) {
    if (lower.includes(hint)) score -= 50
  }
  return score
}

async function openVideoStreamForDevice(deviceId: string): Promise<MediaStream> {
  try {
    return await navigator.mediaDevices.getUserMedia({
      video: { deviceId: { exact: deviceId } },
    })
  } catch (exactErr) {
    try {
      return await navigator.mediaDevices.getUserMedia({
        video: { deviceId: { ideal: deviceId } },
      })
    } catch {
      throw exactErr
    }
  }
}

function pickPreferredDeviceId(devices: VideoDeviceOption[]): string | null {
  if (devices.length === 0) return null

  let best = devices[0]
  let bestScore = scoreExternalCameraLabel(best.label)

  for (let i = 1; i < devices.length; i += 1) {
    const device = devices[i]
    const score = scoreExternalCameraLabel(device.label)
    if (score > bestScore) {
      best = device
      bestScore = score
    }
  }

  return best.deviceId
}

async function enumerateVideoInputs(): Promise<VideoDeviceOption[]> {
  const all = await navigator.mediaDevices.enumerateDevices()
  let index = 0
  return all
    .filter((d) => d.kind === 'videoinput')
    .map((d) => {
      index += 1
      return {
        deviceId: d.deviceId,
        label: d.label.trim() || `Camera ${index}`,
      }
    })
}

function devicesNeedPermissionForLabels(devices: VideoDeviceOption[]): boolean {
  return devices.length === 0 || devices.every((d) => /^Camera \d+$/.test(d.label))
}

function isStreamDead(stream: MediaStream | null): boolean {
  if (!stream) return true
  const tracks = stream.getVideoTracks()
  if (tracks.length === 0) return true
  return tracks.every((track) => track.readyState === 'ended')
}

function LabBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-1 text-[0.65rem] font-bold uppercase tracking-wide text-amber-950 ring-1 ring-amber-200">
      <FlaskConical className="h-3 w-3 shrink-0" aria-hidden="true" />
      Experimental lab
    </span>
  )
}

function StreamStatusBadge({ status }: { status: StreamStatus }) {
  if (status === 'live') {
    return (
      <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-950 ring-1 ring-emerald-200">
        <span className="relative flex h-2.5 w-2.5" aria-hidden="true">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-600" />
        </span>
        Live
      </span>
    )
  }

  if (status === 'error') {
    return (
      <span className="inline-flex items-center gap-2 rounded-full bg-rose-50 px-3 py-1 text-sm font-semibold text-rose-950 ring-1 ring-rose-200">
        <span className="h-2.5 w-2.5 rounded-full bg-rose-600" aria-hidden="true" />
        Error
      </span>
    )
  }

  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-stone-100 px-3 py-1 text-sm font-semibold text-stone-800 ring-1 ring-stone-200">
      <span className="h-2.5 w-2.5 rounded-full bg-stone-400" aria-hidden="true" />
      Camera off
    </span>
  )
}

function formatCapturedAt(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })
}

export function GardenCameraLabPage() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const akasoImgRef = useRef<HTMLImageElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const streamGenerationRef = useRef(0)
  const streamCleanupRef = useRef<(() => void) | null>(null)
  const userPickedDeviceRef = useRef(false)
  const mountedRef = useRef(true)
  const selectedDeviceIdRef = useRef('')
  const autoRestartTimerRef = useRef<number | null>(null)
  const autoRestartInFlightRef = useRef(false)
  const akasoPollingRef = useRef(false)
  const akasoObjectUrlRef = useRef<string | null>(null)

  const [sourceMode, setSourceMode] = useState<SourceMode>('akaso-wifi')
  const [rtspUrl, setRtspUrl] = useState(DEFAULT_AKASO_RTSP_URL)
  const [akasoFrameUrl, setAkasoFrameUrl] = useState<string | null>(null)
  const [snapshots, setSnapshots] = useState<LabSnapshot[]>([])
  const [videoDevices, setVideoDevices] = useState<VideoDeviceOption[]>([])
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('')
  const [streamStatus, setStreamStatus] = useState<StreamStatus>('off')
  const [starting, setStarting] = useState(true)
  const [refreshingDevices, setRefreshingDevices] = useState(false)
  const [cameraError, setCameraError] = useState<{
    kind: CameraErrorKind
    message: string
  } | null>(null)

  useEffect(() => {
    selectedDeviceIdRef.current = selectedDeviceId
  }, [selectedDeviceId])

  const clearAutoRestartTimer = useCallback(() => {
    if (autoRestartTimerRef.current !== null) {
      window.clearTimeout(autoRestartTimerRef.current)
      autoRestartTimerRef.current = null
    }
  }, [])

  const detachStreamWatchers = useCallback(() => {
    streamCleanupRef.current?.()
    streamCleanupRef.current = null
  }, [])

  const stopStream = useCallback(() => {
    detachStreamWatchers()
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    const video = videoRef.current
    if (video) video.srcObject = null
    if (sourceMode === 'usb') setStreamStatus('off')
  }, [detachStreamWatchers, sourceMode])

  const stopAkasoPolling = useCallback(() => {
    akasoPollingRef.current = false
    if (akasoObjectUrlRef.current) {
      URL.revokeObjectURL(akasoObjectUrlRef.current)
      akasoObjectUrlRef.current = null
    }
    setAkasoFrameUrl(null)
    if (sourceMode === 'akaso-wifi') setStreamStatus('off')
  }, [sourceMode])

  const sleep = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms))

  const requestCameraPermission = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true })
    stream.getTracks().forEach((track) => track.stop())
  }, [])

  const scheduleAutoRestart = useCallback(() => {
    if (!mountedRef.current || autoRestartInFlightRef.current) return
    const deviceId = selectedDeviceIdRef.current
    if (!deviceId) return

    clearAutoRestartTimer()
    autoRestartTimerRef.current = window.setTimeout(() => {
      autoRestartTimerRef.current = null
      if (!mountedRef.current || !selectedDeviceIdRef.current) return
      void restartCameraRef.current?.({ auto: true })
    }, AUTO_RESTART_DELAY_MS)
  }, [clearAutoRestartTimer])

  const attachStreamWatchers = useCallback(
    (stream: MediaStream, generation: number) => {
      detachStreamWatchers()

      const onStreamLost = () => {
        if (!mountedRef.current || generation !== streamGenerationRef.current) return
        if (streamRef.current !== stream) return

        stopStream()
        scheduleAutoRestart()
      }

      const trackHandlers: Array<{ track: MediaStreamTrack; ended: () => void; mute: () => void }> =
        []

      for (const track of stream.getVideoTracks()) {
        const ended = () => onStreamLost()
        const mute = () => {
          if (track.readyState === 'ended' || track.muted) {
            onStreamLost()
          }
        }
        track.addEventListener('ended', ended)
        track.addEventListener('mute', mute)
        trackHandlers.push({ track, ended, mute })
      }

      const video = videoRef.current
      const onVideoEmptied = () => onStreamLost()
      video?.addEventListener('emptied', onVideoEmptied)

      streamCleanupRef.current = () => {
        for (const { track, ended, mute } of trackHandlers) {
          track.removeEventListener('ended', ended)
          track.removeEventListener('mute', mute)
        }
        video?.removeEventListener('emptied', onVideoEmptied)
      }
    },
    [detachStreamWatchers, scheduleAutoRestart, stopStream],
  )

  const startStreamForDevice = useCallback(
    async (deviceId: string, options?: { auto?: boolean }) => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraError({
          kind: 'unsupported',
          message:
            'This browser does not support camera access. Try Chrome, Firefox, or Safari on a device with a camera.',
        })
        setStreamStatus('error')
        setStarting(false)
        return
      }

      clearAutoRestartTimer()

      const generation = streamGenerationRef.current + 1
      streamGenerationRef.current = generation

      stopStream()
      setStarting(true)
      if (!options?.auto) {
        setCameraError(null)
        setStreamStatus('off')
      }

      try {
        const stream = await openVideoStreamForDevice(deviceId)

        if (!mountedRef.current || generation !== streamGenerationRef.current) {
          stream.getTracks().forEach((track) => track.stop())
          return
        }

        streamRef.current = stream
        const video = videoRef.current
        if (!video) {
          stream.getTracks().forEach((track) => track.stop())
          return
        }

        video.srcObject = stream
        await video.play()
        attachStreamWatchers(stream, generation)
        setCameraError(null)
        setStreamStatus('live')
      } catch (err) {
        if (!mountedRef.current || generation !== streamGenerationRef.current) return
        setCameraError(classifyCameraError(err))
        setStreamStatus('error')
        stopStream()
      } finally {
        if (mountedRef.current && generation === streamGenerationRef.current) {
          setStarting(false)
          autoRestartInFlightRef.current = false
        }
      }
    },
    [attachStreamWatchers, clearAutoRestartTimer, stopStream],
  )

  const restartCameraRef = useRef<
    ((options?: { auto?: boolean }) => Promise<void>) | null
  >(null)

  const restartCamera = useCallback(
    async (options?: { auto?: boolean }) => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraError({
          kind: 'unsupported',
          message:
            'This browser does not support camera access. Try Chrome, Firefox, or Safari on a device with a camera.',
        })
        setStreamStatus('error')
        return
      }

      autoRestartInFlightRef.current = true
      clearAutoRestartTimer()

      const deviceId = selectedDeviceIdRef.current
      if (!deviceId) {
        autoRestartInFlightRef.current = false
        await refreshCamerasRef.current?.()
        return
      }

      await startStreamForDevice(deviceId, options)
    },
    [clearAutoRestartTimer, startStreamForDevice],
  )

  useEffect(() => {
    restartCameraRef.current = restartCamera
  }, [restartCamera])

  const startAkasoPolling = useCallback(async () => {
    akasoPollingRef.current = true
    setStarting(true)
    setCameraError(null)
    setStreamStatus('off')

    let consecutiveErrors = 0

    while (akasoPollingRef.current && mountedRef.current) {
      try {
        const blob = await fetchAkasoLabSnapshot(rtspUrl)
        if (!akasoPollingRef.current || !mountedRef.current) break

        const url = URL.createObjectURL(blob)
        const previous = akasoObjectUrlRef.current
        akasoObjectUrlRef.current = url
        setAkasoFrameUrl(url)
        setStreamStatus('live')
        setCameraError(null)
        consecutiveErrors = 0
        if (previous) URL.revokeObjectURL(previous)
      } catch (err) {
        if (!akasoPollingRef.current || !mountedRef.current) break
        consecutiveErrors += 1
        setStreamStatus('error')
        setCameraError({
          kind: 'unknown',
          message:
            err instanceof Error
              ? err.message
              : 'Could not reach the AKASO camera stream.',
        })
        if (consecutiveErrors >= 3) {
          await sleep(2_000)
        }
      } finally {
        if (mountedRef.current && akasoPollingRef.current) {
          setStarting(false)
        }
      }

      if (!akasoPollingRef.current) break
      await sleep(AKASO_POLL_MS)
    }
  }, [rtspUrl])

  const restartAkasoStream = useCallback(() => {
    stopAkasoPolling()
    void startAkasoPolling()
  }, [startAkasoPolling, stopAkasoPolling])

  const restartActiveSource = useCallback(() => {
    if (sourceMode === 'akaso-wifi') {
      restartAkasoStream()
      return
    }
    void restartCamera()
  }, [restartAkasoStream, restartCamera, sourceMode])

  const loadVideoDevices = useCallback(
    async (options?: { requestPermissionFirst?: boolean }) => {
      if (!navigator.mediaDevices?.enumerateDevices) {
        throw new Error('Device enumeration is not supported in this browser.')
      }

      let devices = await enumerateVideoInputs()

      if (options?.requestPermissionFirst || devicesNeedPermissionForLabels(devices)) {
        await requestCameraPermission()
        devices = await enumerateVideoInputs()
      }

      return devices
    },
    [requestCameraPermission],
  )

  const refreshCamerasRef = useRef<(() => Promise<void>) | null>(null)

  const refreshCameras = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError({
        kind: 'unsupported',
        message:
          'This browser does not support camera access. Try Chrome, Firefox, or Safari on a device with a camera.',
      })
      setStreamStatus('error')
      return
    }

    setRefreshingDevices(true)
    setCameraError(null)

    try {
      const devices = await loadVideoDevices({
        requestPermissionFirst: devicesNeedPermissionForLabels(videoDevices),
      })
      if (!mountedRef.current) return

      setVideoDevices(devices)

      if (devices.length === 0) {
        stopStream()
        setSelectedDeviceId('')
        setCameraError({
          kind: 'not-found',
          message:
            'No camera was found on this device. Connect a USB camera and try again.',
        })
        setStreamStatus('error')
        return
      }

      const currentStillAvailable =
        selectedDeviceId !== '' &&
        devices.some((d) => d.deviceId === selectedDeviceId)

      let nextId = selectedDeviceId
      if (!currentStillAvailable) {
        nextId = pickPreferredDeviceId(devices) ?? devices[0].deviceId
        userPickedDeviceRef.current = false
      } else if (!userPickedDeviceRef.current) {
        nextId = pickPreferredDeviceId(devices) ?? selectedDeviceId
      }

      setSelectedDeviceId(nextId)
      selectedDeviceIdRef.current = nextId

      const streamDead = isStreamDead(streamRef.current)
      if (!currentStillAvailable || nextId !== selectedDeviceId || streamDead) {
        await startStreamForDevice(nextId)
      }
    } catch (err) {
      if (!mountedRef.current) return
      setCameraError(classifyCameraError(err))
      setStreamStatus('error')
      stopStream()
    } finally {
      if (mountedRef.current) setRefreshingDevices(false)
    }
  }, [loadVideoDevices, selectedDeviceId, startStreamForDevice, stopStream, videoDevices])

  useEffect(() => {
    refreshCamerasRef.current = refreshCameras
  }, [refreshCameras])

  const handleDeviceChange = useCallback(
    (deviceId: string) => {
      userPickedDeviceRef.current = true
      setSelectedDeviceId(deviceId)
      selectedDeviceIdRef.current = deviceId
      void startStreamForDevice(deviceId)
    },
    [startStreamForDevice],
  )

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      clearAutoRestartTimer()
      streamGenerationRef.current += 1
      stopStream()
      stopAkasoPolling()
    }
  }, [clearAutoRestartTimer, stopAkasoPolling, stopStream])

  useEffect(() => {
    if (sourceMode === 'akaso-wifi') {
      stopStream()
      void startAkasoPolling()
      return () => stopAkasoPolling()
    }

    stopAkasoPolling()

    async function initializeUsb() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraError({
          kind: 'unsupported',
          message:
            'This browser does not support camera access. Try Chrome, Firefox, or Safari on a device with a camera.',
        })
        setStreamStatus('error')
        setStarting(false)
        return
      }

      setStarting(true)
      setCameraError(null)
      setStreamStatus('off')

      try {
        const devices = await loadVideoDevices({ requestPermissionFirst: true })
        if (!mountedRef.current || sourceMode !== 'usb') return

        setVideoDevices(devices)

        if (devices.length === 0) {
          setCameraError({
            kind: 'not-found',
            message:
              'No camera was found on this device. Connect a USB camera and try again.',
          })
          setStreamStatus('error')
          setStarting(false)
          return
        }

        const preferredId = pickPreferredDeviceId(devices) ?? devices[0].deviceId
        setSelectedDeviceId(preferredId)
        selectedDeviceIdRef.current = preferredId
        await startStreamForDevice(preferredId)
      } catch (err) {
        if (!mountedRef.current) return
        setCameraError(classifyCameraError(err))
        setStreamStatus('error')
        setStarting(false)
      }
    }

    void initializeUsb()

    return () => {
      clearAutoRestartTimer()
      streamGenerationRef.current += 1
      stopStream()
    }
  }, [
    clearAutoRestartTimer,
    loadVideoDevices,
    sourceMode,
    startAkasoPolling,
    startStreamForDevice,
    stopAkasoPolling,
    stopStream,
  ])

  useEffect(() => {
    if (sourceMode !== 'usb') return undefined

    const onVisibilityChange = () => {
      if (document.visibilityState !== 'visible') return
      if (!selectedDeviceIdRef.current) return
      if (isStreamDead(streamRef.current)) {
        scheduleAutoRestart()
      }
    }

    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => document.removeEventListener('visibilitychange', onVisibilityChange)
  }, [scheduleAutoRestart, sourceMode])

  useEffect(() => {
    if (sourceMode !== 'usb') return undefined

    const mediaDevices = navigator.mediaDevices
    if (!mediaDevices?.addEventListener) return undefined

    const onDeviceChange = () => {
      if (!selectedDeviceIdRef.current) return
      if (isStreamDead(streamRef.current)) {
        scheduleAutoRestart()
      }
    }

    mediaDevices.addEventListener('devicechange', onDeviceChange)
    return () => mediaDevices.removeEventListener('devicechange', onDeviceChange)
  }, [scheduleAutoRestart])

  const captureSnapshot = () => {
    const canvas = canvasRef.current
    if (!canvas || streamStatus !== 'live') return

    if (sourceMode === 'akaso-wifi') {
      const img = akasoImgRef.current
      if (!img || !img.complete || img.naturalWidth === 0) return
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
    } else {
      const video = videoRef.current
      if (!video || video.videoWidth === 0) return
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    }

    const dataUrl = canvas.toDataURL('image/jpeg', 0.92)
    const capturedAtISO = new Date().toISOString()

    setSnapshots((prev) => [
      { id: crypto.randomUUID(), dataUrl, capturedAtISO },
      ...prev,
    ])
  }

  const selectedDeviceLabel =
    videoDevices.find((d) => d.deviceId === selectedDeviceId)?.label ?? null

  const cameraReady = streamStatus === 'live'

  return (
    <div className="min-h-dvh bg-stone-50">
      <div className="mx-auto max-w-[720px] px-4 py-8 sm:px-5 sm:py-10">
        <ElkGardenPageBranding />

        <header className="mb-8">
          <div className="flex flex-wrap items-center gap-2">
            <LabBadge />
          </div>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-stone-950">
            ELK Garden Camera Lab
          </h1>
          <p className="mt-2 text-base leading-relaxed text-stone-700 sm:text-lg">
            AKASO WiFi or USB webcam — live preview and in-memory snapshots only.
          </p>
        </header>

        <div className="space-y-6">
          <Card className="overflow-hidden">
            <div className="border-b border-stone-100 bg-stone-50/60 px-4 py-3 sm:px-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div
                    className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-white ring-1 ring-stone-200"
                    aria-hidden="true"
                  >
                    <Camera className="h-5 w-5 text-stone-700" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="text-xl font-semibold tracking-tight text-stone-950">
                      Live Camera Preview
                    </h2>
                    <p className="mt-1 text-sm leading-relaxed text-stone-600">
                      {sourceMode === 'akaso-wifi'
                        ? 'Connect your Mac to the AKASO WiFi hotspot, then stream via RTSP.'
                        : 'Choose an external USB source (e.g. AKASO / Video Control) when plugged in.'}
                    </p>
                  </div>
                </div>
                <StreamStatusBadge status={streamStatus} />
              </div>
            </div>

            <div className="space-y-4 p-4 sm:p-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
                  Input mode
                </p>
                <div
                  className="mt-1.5 grid grid-cols-1 gap-1 rounded-xl bg-stone-100 p-1 ring-1 ring-stone-200 sm:grid-cols-2"
                  role="group"
                  aria-label="Camera input mode"
                >
                  <button
                    type="button"
                    onClick={() => setSourceMode('akaso-wifi')}
                    className={clsx(
                      'rounded-lg px-3 py-2.5 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600',
                      sourceMode === 'akaso-wifi'
                        ? 'bg-white text-stone-900 shadow-sm ring-1 ring-stone-200'
                        : 'text-stone-600 hover:text-stone-800',
                    )}
                    aria-pressed={sourceMode === 'akaso-wifi'}
                  >
                    AKASO WiFi (recommended)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSourceMode('usb')}
                    className={clsx(
                      'rounded-lg px-3 py-2.5 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600',
                      sourceMode === 'usb'
                        ? 'bg-white text-stone-900 shadow-sm ring-1 ring-stone-200'
                        : 'text-stone-600 hover:text-stone-800',
                    )}
                    aria-pressed={sourceMode === 'usb'}
                  >
                    USB Webcam
                  </button>
                </div>
              </div>

              {sourceMode === 'akaso-wifi' ? (
                <div className="space-y-2">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                    <div className="min-w-0 flex-1">
                      <label
                        htmlFor="akaso-rtsp-url"
                        className="text-xs font-semibold uppercase tracking-wide text-stone-500"
                      >
                        RTSP stream URL
                      </label>
                      <input
                        id="akaso-rtsp-url"
                        type="url"
                        value={rtspUrl}
                        onChange={(e) => setRtspUrl(e.target.value)}
                        className="mt-1.5 w-full rounded-xl border-0 bg-white px-3 py-2.5 text-base text-stone-900 shadow-sm ring-1 ring-stone-200 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={restartAkasoStream}
                      disabled={starting}
                      className="inline-flex shrink-0 items-center justify-center gap-2 rounded-2xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white ring-1 ring-emerald-800 transition hover:bg-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <RotateCcw className="h-4 w-4 shrink-0" aria-hidden="true" />
                      Restart Camera
                    </button>
                  </div>
                  <ol className="list-decimal space-y-1 pl-5 text-sm leading-relaxed text-stone-700">
                    <li>On the AKASO, turn on WiFi mode (hotspot).</li>
                    <li>
                      On your Mac, join the WiFi network{' '}
                      <span className="font-semibold">iCam-AKASO_*</span> (password often{' '}
                      <span className="font-mono text-xs">1234567890</span>).
                    </li>
                    <li>Ignore “No internet” — that is normal.</li>
                    <li>Leave RTSP as <span className="font-mono text-xs">rtsp://192.72.1.1/H264</span> unless your firmware uses a different IP.</li>
                  </ol>
                  <p className="text-sm leading-relaxed text-stone-600">
                    Keep this browser tab open. The camera stream may stop if the computer
                    sleeps or the page is closed.
                  </p>
                </div>
              ) : (
              <div className="space-y-2">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                  <div className="min-w-0 flex-1">
                    <label
                      htmlFor="garden-camera-source"
                      className="text-xs font-semibold uppercase tracking-wide text-stone-500"
                    >
                      Camera source
                    </label>
                    <select
                      id="garden-camera-source"
                      value={selectedDeviceId}
                      onChange={(e) => handleDeviceChange(e.target.value)}
                      disabled={
                        starting ||
                        refreshingDevices ||
                        videoDevices.length === 0
                      }
                      className="mt-1.5 w-full rounded-xl border-0 bg-white px-3 py-2.5 text-base text-stone-900 shadow-sm ring-1 ring-stone-200 focus:outline-none focus:ring-2 focus:ring-emerald-600 disabled:cursor-not-allowed disabled:bg-stone-100 disabled:text-stone-500"
                    >
                      {videoDevices.length === 0 ? (
                        <option value="">No cameras found</option>
                      ) : (
                        videoDevices.map((device) => (
                          <option key={device.deviceId} value={device.deviceId}>
                            {device.label}
                          </option>
                        ))
                      )}
                    </select>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => void restartCamera()}
                      disabled={starting || refreshingDevices || !selectedDeviceId}
                      className="inline-flex shrink-0 items-center justify-center gap-2 rounded-2xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white ring-1 ring-emerald-800 transition hover:bg-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <RotateCcw className="h-4 w-4 shrink-0" aria-hidden="true" />
                      Restart Camera
                    </button>
                    <button
                      type="button"
                      onClick={() => void refreshCameras()}
                      disabled={starting || refreshingDevices}
                      className="inline-flex shrink-0 items-center justify-center gap-2 rounded-2xl bg-white px-4 py-2.5 text-sm font-semibold text-stone-800 ring-1 ring-stone-200 transition hover:bg-stone-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <RefreshCw
                        className={clsx(
                          'h-4 w-4 shrink-0',
                          refreshingDevices && 'animate-spin',
                        )}
                        aria-hidden="true"
                      />
                      {refreshingDevices ? 'Refreshing…' : 'Refresh Cameras'}
                    </button>
                  </div>
                </div>
                <p className="text-sm leading-relaxed text-stone-600">
                  If camera names are hidden, allow camera permission first, then refresh.
                </p>
                <p className="rounded-xl bg-amber-50/80 px-3 py-2.5 text-sm leading-relaxed text-amber-950 ring-1 ring-amber-200">
                  <span className="font-semibold">AKASO not listed?</span> Remove the SD card,
                  use USB → <span className="font-semibold">PC CAM</span>, then refresh. If it
                  still does not appear, use <span className="font-semibold">AKASO WiFi</span>{' '}
                  mode above — that is how the AKASO Go app streams live video.
                </p>
                {videoDevices.length > 0 ? (
                  <p className="text-xs text-stone-500">
                    Browser sees {videoDevices.length} camera
                    {videoDevices.length === 1 ? '' : 's'}:{' '}
                    {videoDevices.map((d) => d.label).join(' · ')}
                  </p>
                ) : (
                  <p className="text-xs font-medium text-rose-800">
                    No video inputs detected — check USB cable and PC CAM mode.
                  </p>
                )}
                <p className="text-sm leading-relaxed text-stone-600">
                  Keep this browser tab open. The camera stream may stop if the computer
                  sleeps or the page is closed.
                </p>
                {selectedDeviceLabel ? (
                  <p className="text-xs text-stone-500">
                    Active: <span className="font-medium text-stone-700">{selectedDeviceLabel}</span>
                  </p>
                ) : null}
              </div>
              )}

              {cameraError ? (
                <div
                  role="alert"
                  className={clsx(
                    'rounded-2xl px-4 py-3 text-sm font-medium leading-relaxed ring-1',
                    cameraError.kind === 'unsupported'
                      ? 'bg-stone-100 text-stone-900 ring-stone-200'
                      : 'bg-rose-50 text-rose-950 ring-rose-200',
                  )}
                >
                  <p>{cameraError.message}</p>
                  {cameraError.kind !== 'unsupported' ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={restartActiveSource}
                        className="rounded-xl bg-white px-3 py-2 text-sm font-semibold text-stone-800 ring-1 ring-stone-200 transition hover:bg-stone-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
                      >
                        Restart Camera
                      </button>
                      {sourceMode === 'usb' ? (
                        <button
                          type="button"
                          onClick={() => void refreshCameras()}
                          className="rounded-xl bg-white px-3 py-2 text-sm font-semibold text-stone-800 ring-1 ring-stone-200 transition hover:bg-stone-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
                        >
                          Refresh list
                        </button>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              ) : null}

              <div className="overflow-hidden rounded-2xl bg-stone-900 ring-1 ring-stone-200">
                {sourceMode === 'akaso-wifi' ? (
                  <img
                    ref={akasoImgRef}
                    src={akasoFrameUrl ?? undefined}
                    alt="AKASO live preview"
                    className={clsx(
                      'aspect-video w-full object-cover',
                      streamStatus !== 'live' && 'min-h-[12rem] bg-stone-800',
                    )}
                  />
                ) : (
                  <video
                    ref={videoRef}
                    playsInline
                    muted
                    autoPlay
                    className={clsx(
                      'aspect-video w-full object-cover',
                      streamStatus !== 'live' && 'min-h-[12rem] bg-stone-800',
                    )}
                    aria-label="Live garden camera preview"
                  />
                )}
                {starting && streamStatus !== 'error' ? (
                  <p className="border-t border-stone-700 bg-stone-800 px-4 py-2 text-center text-sm font-medium text-stone-300">
                    Starting camera…
                  </p>
                ) : null}
              </div>

              <button
                type="button"
                onClick={captureSnapshot}
                disabled={!cameraReady}
                className={clsx(
                  'inline-flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-base font-semibold shadow-sm ring-1 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 focus-visible:ring-offset-white sm:w-auto',
                  cameraReady
                    ? 'bg-emerald-700 text-white ring-emerald-800 hover:bg-emerald-800'
                    : 'cursor-not-allowed bg-stone-200 text-stone-500 ring-stone-300',
                )}
              >
                <ImageIcon className="h-5 w-5 shrink-0" aria-hidden="true" />
                Capture Snapshot
              </button>
            </div>
          </Card>

          <Card>
            <div className="border-b border-stone-100 px-4 py-3 sm:px-5">
              <h2 className="text-xl font-semibold tracking-tight text-stone-950">
                Snapshot Gallery
              </h2>
              <p className="mt-1 text-sm text-stone-600">
                Newest first · stored in browser memory only
              </p>
            </div>
            <div className="p-4 sm:p-5">
              {snapshots.length === 0 ? (
                <div className="flex min-h-[8rem] flex-col items-center justify-center gap-2 rounded-2xl bg-stone-50 px-4 py-6 text-center ring-1 ring-stone-100">
                  <ImageIcon className="h-8 w-8 text-stone-300" aria-hidden="true" />
                  <p className="text-base font-medium text-stone-600">No snapshots yet</p>
                  <p className="text-sm text-stone-500">
                    Capture one from the live preview above.
                  </p>
                </div>
              ) : (
                <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {snapshots.map((snap) => (
                    <li
                      key={snap.id}
                      className="overflow-hidden rounded-2xl ring-1 ring-stone-200"
                    >
                      <img
                        src={snap.dataUrl}
                        alt={`Garden snapshot captured ${formatCapturedAt(snap.capturedAtISO)}`}
                        className="aspect-video w-full object-cover"
                      />
                      <p className="bg-stone-50 px-3 py-2 text-sm font-medium text-stone-700">
                        {formatCapturedAt(snap.capturedAtISO)}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Card>

          <Card className="border-dashed border-amber-200/80 bg-amber-50/30">
            <div className="flex items-start gap-3 p-4 sm:p-5">
              <Info className="mt-0.5 h-5 w-5 shrink-0 text-amber-800" aria-hidden="true" />
              <div className="space-y-2 text-sm leading-relaxed text-amber-950 sm:text-base">
                <p className="font-semibold text-amber-950">Notes</p>
                <p>
                  This prototype uses the camera attached to the device running the
                  browser. Later, the Raspberry Pi garden node will capture and store
                  images automatically.
                </p>
                <ul className="list-disc space-y-1 pl-5 text-amber-900/90">
                  <li>Experimental — not linked from main navigation.</li>
                  <li>Local browser only — no backend upload yet.</li>
                  <li>Snapshots disappear when you close or refresh this tab.</li>
                  <li>HTTPS or localhost is required for camera access in most browsers.</li>
                  <li>
                    Keep this tab open — sleep or closing the page stops the camera stream.
                  </li>
                  <li>
                    AKASO WiFi mode uses RTSP at{' '}
                    <span className="font-mono text-xs">rtsp://192.72.1.1/H264</span> — join the
                    camera hotspot first.
                  </li>
                  <li>
                    USB PC CAM mode is optional; many AKASO models stream over WiFi only on Mac.
                  </li>
                </ul>
              </div>
            </div>
          </Card>
        </div>
      </div>

      <canvas ref={canvasRef} className="hidden" aria-hidden="true" />
    </div>
  )
}
