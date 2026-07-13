import { compressImageFile, loadCameraGardenImage } from './cameraImageStorage'
import type { GardenCameraId } from './cameraTypes'
import { gardenCameraLabel } from './cameraTypes'

export type GardenSnapshot = {
  id: string
  dataUrl: string
  capturedAtISO: string
  cameraId: GardenCameraId
  cameraName: string
  note?: string
  analyzeLater: true
}

const STORAGE_KEY = 'elk-garden-snapshots'
/** Max snapshots kept per camera in localStorage. */
const MAX_SNAPSHOTS_PER_CAMERA = 5

function parseSnapshot(raw: unknown): GardenSnapshot | null {
  if (!raw || typeof raw !== 'object') return null
  const s = raw as Record<string, unknown>
  const cameraId = s.cameraId === 'garden_west' ? 'garden_west' : 'garden_east'
  if (
    typeof s.id !== 'string' ||
    typeof s.dataUrl !== 'string' ||
    !s.dataUrl.startsWith('data:image/') ||
    typeof s.capturedAtISO !== 'string'
  ) {
    return null
  }
  const note = typeof s.note === 'string' && s.note.trim() ? s.note.trim() : undefined
  const cameraName =
    typeof s.cameraName === 'string' ? s.cameraName : gardenCameraLabel(cameraId)
  return {
    id: s.id,
    dataUrl: s.dataUrl,
    capturedAtISO: s.capturedAtISO,
    cameraId,
    cameraName,
    note,
    analyzeLater: true,
  }
}

function migrateLegacyCameraImages(existing: GardenSnapshot[]): GardenSnapshot[] {
  if (existing.length > 0) return existing
  const migrated: GardenSnapshot[] = []
  for (const cameraId of ['garden_east', 'garden_west'] as const) {
    const legacy = loadCameraGardenImage(cameraId)
    if (!legacy) continue
    migrated.push({
      id: `legacy-snap-${cameraId}`,
      dataUrl: legacy.dataUrl,
      capturedAtISO: legacy.uploadedAtISO,
      cameraId,
      cameraName: gardenCameraLabel(cameraId),
      analyzeLater: true,
    })
  }
  if (migrated.length > 0) saveSnapshots(migrated)
  return migrated
}

export function loadSnapshots(): GardenSnapshot[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    let snapshots: GardenSnapshot[] = []
    if (raw) {
      const parsed = JSON.parse(raw) as unknown
      if (Array.isArray(parsed)) {
        snapshots = parsed
          .map(parseSnapshot)
          .filter((s): s is GardenSnapshot => s != null)
      }
    }
    snapshots = migrateLegacyCameraImages(snapshots)
    return trimSnapshotsPerCamera(snapshots)
  } catch {
    return []
  }
}

function trimSnapshotsPerCamera(snapshots: GardenSnapshot[]): GardenSnapshot[] {
  const byCamera: Partial<Record<GardenCameraId, GardenSnapshot[]>> = {}
  for (const snap of snapshots) {
    const list = byCamera[snap.cameraId] ?? []
    list.push(snap)
    byCamera[snap.cameraId] = list
  }
  const trimmed: GardenSnapshot[] = []
  for (const id of ['garden_east', 'garden_west'] as const) {
    const list = byCamera[id]
    if (list) trimmed.push(...list.slice(0, MAX_SNAPSHOTS_PER_CAMERA))
  }
  return trimmed.sort(
    (a, b) => new Date(b.capturedAtISO).getTime() - new Date(a.capturedAtISO).getTime(),
  )
}

function saveSnapshots(snapshots: GardenSnapshot[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimSnapshotsPerCamera(snapshots)))
  } catch {
    throw new Error(
      'Snapshot is too large to store locally. Try a smaller JPG or PNG.',
    )
  }
}

export function getLatestSnapshotForCamera(
  cameraId: GardenCameraId,
  snapshots = loadSnapshots(),
): GardenSnapshot | null {
  return snapshots.find((s) => s.cameraId === cameraId) ?? null
}

export function getSnapshotsForCamera(
  cameraId: GardenCameraId,
  snapshots = loadSnapshots(),
): GardenSnapshot[] {
  return snapshots.filter((s) => s.cameraId === cameraId)
}

export async function appendGardenSnapshot(input: {
  file: File
  cameraId: GardenCameraId
  note?: string
}): Promise<GardenSnapshot[]> {
  const dataUrl = await compressImageFile(input.file)
  const trimmedNote = input.note?.trim()
  const snapshot: GardenSnapshot = {
    id: `snap-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    dataUrl,
    capturedAtISO: new Date().toISOString(),
    cameraId: input.cameraId,
    cameraName: gardenCameraLabel(input.cameraId),
    note: trimmedNote || undefined,
    analyzeLater: true,
  }
  const others = loadSnapshots().filter((s) => s.cameraId !== input.cameraId)
  const forCamera = [snapshot, ...loadSnapshots().filter((s) => s.cameraId === input.cameraId)]
  const next = trimSnapshotsPerCamera([...forCamera, ...others])
  saveSnapshots(next)
  return next
}
