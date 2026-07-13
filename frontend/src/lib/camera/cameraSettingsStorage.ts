import type { GardenCameraId } from './cameraTypes'

export type CameraSettings = {
  selectedCameraId: GardenCameraId
  lastViewedByCamera: Partial<Record<GardenCameraId, string>>
}

const STORAGE_KEY = 'elk-garden-camera-settings'

const DEFAULT_SETTINGS: CameraSettings = {
  selectedCameraId: 'garden_east',
  lastViewedByCamera: {},
}

export function loadCameraSettings(): CameraSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...DEFAULT_SETTINGS }
    const parsed = JSON.parse(raw) as CameraSettings
    const selectedCameraId =
      parsed.selectedCameraId === 'garden_west' ? 'garden_west' : 'garden_east'
    const lastViewedByCamera =
      parsed.lastViewedByCamera && typeof parsed.lastViewedByCamera === 'object'
        ? parsed.lastViewedByCamera
        : {}
    return { selectedCameraId, lastViewedByCamera }
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

export function saveCameraSettings(settings: CameraSettings): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
}

export function setSelectedCamera(cameraId: GardenCameraId): CameraSettings {
  const settings = loadCameraSettings()
  const next = { ...settings, selectedCameraId: cameraId }
  saveCameraSettings(next)
  return next
}

export function recordCameraLastViewed(cameraId: GardenCameraId): CameraSettings {
  const settings = loadCameraSettings()
  const next: CameraSettings = {
    ...settings,
    lastViewedByCamera: {
      ...settings.lastViewedByCamera,
      [cameraId]: new Date().toISOString(),
    },
  }
  saveCameraSettings(next)
  return next
}
