import type { GardenCameraId } from './cameraTypes'

export type CameraGardenImage = {
  dataUrl: string
  uploadedAtISO: string
  fileName?: string
  cameraId: GardenCameraId
}

type ImageStore = Partial<Record<GardenCameraId, CameraGardenImage>>

const STORAGE_KEY = 'elk-garden-camera-images'
const LEGACY_KEY = 'elk-garden-camera-image'
const MAX_WIDTH = 1280
const JPEG_QUALITY = 0.72

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') resolve(reader.result)
      else reject(new Error('Could not read the image file.'))
    }
    reader.onerror = () => reject(new Error('Could not read the image file.'))
    reader.readAsDataURL(file)
  })
}

function loadImageElement(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Could not load the image.'))
    img.src = dataUrl
  })
}

export function isAcceptedSnapshotFile(file: File): boolean {
  const type = file.type.toLowerCase()
  if (type === 'image/jpeg' || type === 'image/png') return true
  const name = file.name.toLowerCase()
  return name.endsWith('.jpg') || name.endsWith('.jpeg') || name.endsWith('.png')
}

export async function compressImageFile(file: File): Promise<string> {
  if (!isAcceptedSnapshotFile(file)) {
    throw new Error('Please choose a JPG or PNG image.')
  }

  const dataUrl = await readFileAsDataUrl(file)
  const img = await loadImageElement(dataUrl)
  const scale = img.width > MAX_WIDTH ? MAX_WIDTH / img.width : 1
  const width = Math.max(1, Math.round(img.width * scale))
  const height = Math.max(1, Math.round(img.height * scale))

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Could not process the image.')

  ctx.drawImage(img, 0, 0, width, height)
  return canvas.toDataURL('image/jpeg', JPEG_QUALITY)
}

function loadImageStore(): ImageStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as ImageStore
      if (parsed && typeof parsed === 'object') return parsed
    }
    const legacyRaw = localStorage.getItem(LEGACY_KEY)
    if (legacyRaw) {
      const legacy = JSON.parse(legacyRaw) as CameraGardenImage
      if (
        typeof legacy.dataUrl === 'string' &&
        legacy.dataUrl.startsWith('data:image/') &&
        typeof legacy.uploadedAtISO === 'string'
      ) {
        const store: ImageStore = {
          garden_east: { ...legacy, cameraId: 'garden_east' },
        }
        saveImageStore(store)
        localStorage.removeItem(LEGACY_KEY)
        return store
      }
    }
    return {}
  } catch {
    return {}
  }
}

function saveImageStore(store: ImageStore): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
  } catch {
    throw new Error(
      'Image is too large to store locally. Try a smaller screenshot or photo.',
    )
  }
}

export function loadCameraGardenImage(cameraId: GardenCameraId): CameraGardenImage | null {
  const image = loadImageStore()[cameraId]
  if (
    image &&
    typeof image.dataUrl === 'string' &&
    image.dataUrl.startsWith('data:image/') &&
    typeof image.uploadedAtISO === 'string'
  ) {
    return image
  }
  return null
}

export async function saveCameraGardenImageFromFile(
  file: File,
  cameraId: GardenCameraId,
): Promise<CameraGardenImage> {
  const dataUrl = await compressImageFile(file)
  const image: CameraGardenImage = {
    dataUrl,
    uploadedAtISO: new Date().toISOString(),
    fileName: file.name,
    cameraId,
  }
  const store = loadImageStore()
  store[cameraId] = image
  saveImageStore(store)
  return image
}
