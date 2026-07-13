import type { CameraObservationTag, GardenCameraId } from './cameraTypes'
import { OBSERVATION_TAGS } from './cameraTypes'

export type CameraObservationEntry = {
  id: string
  cameraId: GardenCameraId
  note: string
  tags: CameraObservationTag[]
  confidencePct: number
  savedAtISO: string
}

const HISTORY_KEY = 'elk-garden-camera-observations'
const LEGACY_KEY = 'elk-garden-camera-observation'
const MAX_HISTORY = 5
const DEFAULT_CONFIDENCE = 70

function isValidTag(tag: unknown): tag is CameraObservationTag {
  return typeof tag === 'string' && (OBSERVATION_TAGS as readonly string[]).includes(tag)
}

function clampConfidence(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return DEFAULT_CONFIDENCE
  return Math.max(0, Math.min(100, Math.round(value)))
}

function parseEntry(raw: unknown): CameraObservationEntry | null {
  if (!raw || typeof raw !== 'object') return null
  const e = raw as Record<string, unknown>
  const cameraId = e.cameraId === 'garden_west' ? 'garden_west' : 'garden_east'
  if (typeof e.id !== 'string' || typeof e.note !== 'string' || typeof e.savedAtISO !== 'string') {
    return null
  }
  const tags = Array.isArray(e.tags) ? e.tags.filter(isValidTag) : []
  return {
    id: e.id,
    cameraId,
    note: e.note,
    tags,
    confidencePct: clampConfidence(e.confidencePct),
    savedAtISO: e.savedAtISO,
  }
}

function migrateLegacyObservation(): CameraObservationEntry[] {
  try {
    const raw = localStorage.getItem(LEGACY_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as { note?: string; loggedAtISO?: string }
    if (typeof parsed.note !== 'string' || typeof parsed.loggedAtISO !== 'string') {
      return []
    }
    localStorage.removeItem(LEGACY_KEY)
    return [
      {
        id: `legacy-${Date.now()}`,
        cameraId: 'garden_east',
        note: parsed.note,
        tags: [],
        confidencePct: DEFAULT_CONFIDENCE,
        savedAtISO: parsed.loggedAtISO,
      },
    ]
  } catch {
    return []
  }
}

export function loadObservationHistory(): CameraObservationEntry[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY)
    let entries: CameraObservationEntry[] = []
    if (raw) {
      const parsed = JSON.parse(raw) as unknown
      if (Array.isArray(parsed)) {
        entries = parsed.map(parseEntry).filter((e): e is CameraObservationEntry => e != null)
      }
    }
    if (entries.length === 0) {
      entries = migrateLegacyObservation()
      if (entries.length > 0) saveObservationHistory(entries)
    }
    return entries.slice(0, MAX_HISTORY)
  } catch {
    return []
  }
}

export function saveObservationHistory(entries: CameraObservationEntry[]): void {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(entries.slice(0, MAX_HISTORY)))
}

export function appendCameraObservation(input: {
  cameraId: GardenCameraId
  note: string
  tags: CameraObservationTag[]
  confidencePct: number
}): CameraObservationEntry[] {
  const trimmed = input.note.trim()
  if (!trimmed) {
    throw new Error('Add notes before saving your observation.')
  }

  const entry: CameraObservationEntry = {
    id: `cam-obs-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    cameraId: input.cameraId,
    note: trimmed,
    tags: input.tags,
    confidencePct: clampConfidence(input.confidencePct),
    savedAtISO: new Date().toISOString(),
  }

  const next = [entry, ...loadObservationHistory()].slice(0, MAX_HISTORY)
  saveObservationHistory(next)
  return next
}
