import clsx from 'clsx'
import { Camera, ClipboardList, ExternalLink, ImagePlus, Sparkles } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import { Card } from './Card'
import {
  appendGardenSnapshot,
  getLatestSnapshotForCamera,
  getSnapshotsForCamera,
  loadSnapshots,
  type GardenSnapshot,
} from '../lib/camera/gardenSnapshotStorage'
import {
  appendCameraObservation,
  loadObservationHistory,
  type CameraObservationEntry,
} from '../lib/camera/cameraObservationStorage'
import {
  loadCameraSettings,
  recordCameraLastViewed,
  setSelectedCamera,
  type CameraSettings,
} from '../lib/camera/cameraSettingsStorage'
import {
  GARDEN_CAMERAS,
  OBSERVATION_TAG_LABEL,
  OBSERVATION_TAGS,
  confidenceLabel,
  gardenCameraLabel,
  type CameraObservationTag,
  type GardenCameraId,
} from '../lib/camera/cameraTypes'

const EUFY_LIVE_VIEW_URL = 'https://mysecurity.eufylife.com/'
const DEFAULT_CONFIDENCE = 70

const SNAPSHOT_HELPER =
  'Open Eufy in Safari, take a screenshot, upload it here.'

const SNAPSHOT_THUMBNAIL_COUNT = 5

function FutureCaptureBadge() {
  return (
    <span className="inline-flex rounded-full bg-stone-200/80 px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-wide text-stone-700 ring-1 ring-stone-300">
      Future: automatic capture
    </span>
  )
}

function formatTimestamp(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })
}

export function GardenCameraCard() {
  const snapshotInputId = useId()
  const snapshotNoteInputId = useId()
  const notesInputId = useId()
  const confidenceInputId = useId()
  const snapshotFileRef = useRef<HTMLInputElement>(null)

  const [settings, setSettings] = useState<CameraSettings>(() => loadCameraSettings())
  const selectedCameraId = settings.selectedCameraId

  const [snapshots, setSnapshots] = useState<GardenSnapshot[]>(() => loadSnapshots())
  const [focusedSnapshotId, setFocusedSnapshotId] = useState<string | null>(null)
  const [snapshotNote, setSnapshotNote] = useState('')
  const [history, setHistory] = useState<CameraObservationEntry[]>([])

  const [formOpen, setFormOpen] = useState(false)
  const [formCameraId, setFormCameraId] = useState<GardenCameraId>(selectedCameraId)
  const [observationText, setObservationText] = useState('')
  const [selectedTags, setSelectedTags] = useState<CameraObservationTag[]>([])
  const [confidencePct, setConfidencePct] = useState(DEFAULT_CONFIDENCE)

  const [snapshotUploading, setSnapshotUploading] = useState(false)
  const [snapshotUploadError, setSnapshotUploadError] = useState<string | null>(null)
  const [snapshotJustSaved, setSnapshotJustSaved] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [justSaved, setJustSaved] = useState(false)

  useEffect(() => {
    setHistory(loadObservationHistory())
    setSnapshots(loadSnapshots())
    setFocusedSnapshotId(null)
  }, [selectedCameraId])

  const cameraSnapshots = getSnapshotsForCamera(selectedCameraId, snapshots)
  const thumbnailSnapshots = cameraSnapshots.slice(0, SNAPSHOT_THUMBNAIL_COUNT)
  const heroSnapshot =
    (focusedSnapshotId
      ? snapshots.find((s) => s.id === focusedSnapshotId)
      : null) ?? getLatestSnapshotForCamera(selectedCameraId, snapshots)

  const lastViewedISO = settings.lastViewedByCamera[selectedCameraId] ?? null

  const selectPreviewCamera = (cameraId: GardenCameraId) => {
    setSettings(setSelectedCamera(cameraId))
    setSaveError(null)
  }

  const openObservationForm = () => {
    setFormCameraId(selectedCameraId)
    setFormOpen(true)
    setSaveError(null)
  }

  const closeObservationForm = () => {
    setFormOpen(false)
    setSaveError(null)
  }

  const openEufyLiveView = () => {
    setSettings(recordCameraLastViewed(selectedCameraId))
    window.open(EUFY_LIVE_VIEW_URL, '_blank', 'noopener,noreferrer')
  }

  const toggleTag = (tag: CameraObservationTag) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    )
  }

  const saveObservation = () => {
    setSaveError(null)
    try {
      const next = appendCameraObservation({
        cameraId: formCameraId,
        note: observationText,
        tags: selectedTags,
        confidencePct,
      })
      setHistory(next)
      setSettings(setSelectedCamera(formCameraId))
      setObservationText('')
      setSelectedTags([])
      setConfidencePct(DEFAULT_CONFIDENCE)
      setFormOpen(false)
      setJustSaved(true)
      window.setTimeout(() => setJustSaved(false), 2500)
    } catch (err) {
      setSaveError(
        err instanceof Error ? err.message : 'Could not save the observation.',
      )
    }
  }

  const onSnapshotSelected = async (file: File | undefined) => {
    if (!file) return
    setSnapshotUploading(true)
    setSnapshotUploadError(null)
    try {
      const next = await appendGardenSnapshot({
        file,
        cameraId: selectedCameraId,
        note: snapshotNote,
      })
      setSnapshots(next)
      setSnapshotNote('')
      setFocusedSnapshotId(next[0]?.id ?? null)
      setSnapshotJustSaved(true)
      window.setTimeout(() => setSnapshotJustSaved(false), 2500)
    } catch (err) {
      setSnapshotUploadError(
        err instanceof Error ? err.message : 'Could not save the snapshot locally.',
      )
    } finally {
      setSnapshotUploading(false)
      if (snapshotFileRef.current) snapshotFileRef.current.value = ''
    }
  }

  return (
    <Card className="overflow-hidden">
      <div className="border-b border-stone-100 bg-stone-50/60 px-4 py-3 sm:px-5">
        <div className="flex items-start gap-3">
          <div
            className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-white ring-1 ring-stone-200"
            aria-hidden="true"
          >
            <Camera className="h-5 w-5 text-stone-700" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-semibold tracking-tight text-stone-950">
              Garden Camera
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-stone-600">
              {SNAPSHOT_HELPER}
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4 p-4 sm:p-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
            Preview camera
          </p>
          <div
            className="mt-1.5 grid grid-cols-2 gap-1 rounded-xl bg-stone-100 p-1 ring-1 ring-stone-200"
            role="group"
            aria-label="Preview camera"
          >
            {GARDEN_CAMERAS.map((cam) => (
              <button
                key={cam.id}
                type="button"
                onClick={() => selectPreviewCamera(cam.id)}
                className={clsx(
                  'rounded-lg py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600',
                  selectedCameraId === cam.id
                    ? 'bg-white text-stone-900 shadow-sm ring-1 ring-stone-200'
                    : 'text-stone-600 hover:text-stone-800',
                )}
                aria-pressed={selectedCameraId === cam.id}
              >
                {cam.label}
              </button>
            ))}
          </div>
        </div>

        <dl className="grid gap-2 sm:grid-cols-2">
          <div className="rounded-2xl bg-stone-50 px-3 py-2.5 ring-1 ring-stone-100">
            <dt className="text-xs font-semibold uppercase tracking-wide text-stone-500">
              Status
            </dt>
            <dd className="mt-0.5 text-sm font-semibold text-stone-900">
              {heroSnapshot ? 'Manual snapshot' : 'Manual live view'}
            </dd>
          </div>
          <div className="rounded-2xl bg-stone-50 px-3 py-2.5 ring-1 ring-stone-100">
            <dt className="text-xs font-semibold uppercase tracking-wide text-stone-500">
              Last viewed
            </dt>
            <dd className="mt-0.5 text-sm font-semibold text-stone-900">
              {lastViewedISO ? formatTimestamp(lastViewedISO) : 'Not opened yet'}
            </dd>
          </div>
        </dl>

        <label
          htmlFor={snapshotNoteInputId}
          className="block text-xs font-semibold uppercase tracking-wide text-stone-500"
        >
          Snapshot note (optional)
        </label>
        <input
          id={snapshotNoteInputId}
          type="text"
          value={snapshotNote}
          onChange={(e) => setSnapshotNote(e.target.value)}
          placeholder="e.g. east bed looks dry after noon sun"
          className="w-full rounded-xl border-0 bg-white px-3 py-2 text-sm text-stone-900 shadow-sm ring-1 ring-stone-200 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-600"
        />

        <input
          ref={snapshotFileRef}
          id={snapshotInputId}
          type="file"
          accept="image/jpeg,image/png,.jpg,.jpeg,.png"
          className="sr-only"
          onChange={(e) => void onSnapshotSelected(e.target.files?.[0])}
        />

        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <button
            type="button"
            onClick={openEufyLiveView}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm ring-1 ring-emerald-800 transition hover:bg-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
          >
            <ExternalLink className="h-4 w-4 shrink-0" aria-hidden="true" />
            Open Eufy Live View
          </button>
          <label
            htmlFor={snapshotInputId}
            className={clsx(
              'inline-flex cursor-pointer items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold ring-1 transition focus-within:outline-none focus-within:ring-2 focus-within:ring-emerald-600 focus-within:ring-offset-2 focus-within:ring-offset-white',
              snapshotUploading
                ? 'cursor-wait bg-stone-100 text-stone-500 ring-stone-200'
                : 'bg-white text-stone-800 ring-stone-200 hover:bg-stone-50',
            )}
          >
            <ImagePlus className="h-4 w-4 shrink-0" aria-hidden="true" />
            {snapshotUploading ? 'Uploading…' : 'Upload Snapshot'}
          </label>
        </div>

        {snapshotUploadError ? (
          <p
            className="rounded-2xl bg-rose-50 px-3 py-2 text-sm font-medium text-rose-950 ring-1 ring-rose-200"
            role="alert"
          >
            {snapshotUploadError}
          </p>
        ) : null}

        {snapshotJustSaved ? (
          <p
            className="rounded-2xl bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-950 ring-1 ring-emerald-200"
            role="status"
            aria-live="polite"
          >
            Snapshot saved locally.
          </p>
        ) : null}

        <div className="overflow-hidden rounded-2xl ring-1 ring-stone-200">
          <div className="flex items-center justify-between gap-2 border-b border-stone-100 bg-stone-50 px-3 py-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
              Latest snapshot
            </p>
            <FutureCaptureBadge />
          </div>
          {heroSnapshot ? (
            <>
              <img
                src={heroSnapshot.dataUrl}
                alt={`Latest garden snapshot for ${heroSnapshot.cameraName}`}
                className="max-h-72 w-full object-cover"
              />
              <div className="border-t border-stone-100 bg-stone-50 px-3 py-2 text-xs text-stone-600">
                <p className="font-semibold text-stone-800">
                  Uploaded {formatTimestamp(heroSnapshot.capturedAtISO)}
                </p>
                <p className="mt-0.5 text-stone-600">{heroSnapshot.cameraName}</p>
                {heroSnapshot.note ? (
                  <p className="mt-1 text-stone-700">{heroSnapshot.note}</p>
                ) : null}
              </div>
            </>
          ) : (
            <div className="flex min-h-[9rem] flex-col items-center justify-center gap-2 bg-stone-50 px-4 py-6 text-center">
              <ImagePlus className="h-8 w-8 text-stone-300" aria-hidden="true" />
              <p className="text-sm font-medium text-stone-600">No snapshot yet</p>
              <p className="text-xs text-stone-500">JPG or PNG · stored in this browser only</p>
            </div>
          )}
        </div>

        {thumbnailSnapshots.length > 0 ? (
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-stone-500">
              Last {thumbnailSnapshots.length} snapshot
              {thumbnailSnapshots.length === 1 ? '' : 's'}
            </p>
            <ul className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-5">
              {thumbnailSnapshots.map((snap) => {
                const isActive = heroSnapshot?.id === snap.id
                return (
                  <li key={snap.id}>
                    <button
                      type="button"
                      onClick={() => setFocusedSnapshotId(snap.id)}
                      className={clsx(
                        'w-full overflow-hidden rounded-lg text-left ring-1 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600',
                        isActive
                          ? 'ring-2 ring-emerald-600'
                          : 'ring-stone-200 hover:ring-stone-300',
                      )}
                    >
                      <img
                        src={snap.dataUrl}
                        alt={`Snapshot ${formatTimestamp(snap.capturedAtISO)}`}
                        className="aspect-[4/3] w-full object-cover"
                      />
                      <span className="block truncate bg-white px-1.5 py-1 text-[0.58rem] font-medium text-stone-600">
                        {formatTimestamp(snap.capturedAtISO)}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        ) : null}

        {justSaved ? (
          <p
            className="rounded-2xl bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-950 ring-1 ring-emerald-200"
            role="status"
            aria-live="polite"
          >
            Observation saved locally.
          </p>
        ) : null}

        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <button
            type="button"
            onClick={formOpen ? closeObservationForm : openObservationForm}
            className={clsx(
              'inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold ring-1 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 focus-visible:ring-offset-white',
              formOpen
                ? 'bg-stone-800 text-white ring-stone-900 hover:bg-stone-900'
                : 'bg-white text-stone-800 ring-stone-200 hover:bg-stone-50',
            )}
            aria-expanded={formOpen}
          >
            <ClipboardList className="h-4 w-4 shrink-0" aria-hidden="true" />
            {formOpen ? 'Close form' : 'Take Observation'}
          </button>
        </div>

        {formOpen ? (
          <form
            className="rounded-2xl bg-stone-50/80 p-3 ring-1 ring-stone-200"
            onSubmit={(e) => {
              e.preventDefault()
              saveObservation()
            }}
          >
            <p className="text-xs font-bold uppercase tracking-wide text-stone-500">
              Observation form
            </p>

            <div className="mt-3">
              <span className="text-xs font-semibold uppercase tracking-wide text-stone-500">
                Camera
              </span>
              <div
                className="mt-1.5 grid grid-cols-2 gap-1 rounded-xl bg-stone-100 p-1 ring-1 ring-stone-200"
                role="group"
                aria-label="Observation camera"
              >
                {GARDEN_CAMERAS.map((cam) => (
                  <button
                    key={cam.id}
                    type="button"
                    onClick={() => setFormCameraId(cam.id)}
                    className={clsx(
                      'rounded-lg py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600',
                      formCameraId === cam.id
                        ? 'bg-white text-stone-900 shadow-sm ring-1 ring-stone-200'
                        : 'text-stone-600 hover:text-stone-800',
                    )}
                    aria-pressed={formCameraId === cam.id}
                  >
                    {cam.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-3">
              <label
                htmlFor={notesInputId}
                className="text-xs font-semibold uppercase tracking-wide text-stone-500"
              >
                Notes
              </label>
              <textarea
                id={notesInputId}
                value={observationText}
                onChange={(e) => setObservationText(e.target.value)}
                rows={3}
                placeholder="What did you see in the live view or snapshot?"
                className="mt-1.5 w-full resize-y rounded-xl border-0 bg-white px-3 py-2 text-sm text-stone-900 shadow-sm ring-1 ring-stone-200 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>

            <div className="mt-3">
              <span className="text-xs font-semibold uppercase tracking-wide text-stone-500">
                Tags
              </span>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {OBSERVATION_TAGS.map((tag) => {
                  const active = selectedTags.includes(tag)
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleTag(tag)}
                      className={clsx(
                        'rounded-full px-2.5 py-1 text-xs font-semibold ring-1 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600',
                        active
                          ? 'bg-emerald-700 text-white ring-emerald-800'
                          : 'bg-white text-stone-700 ring-stone-200 hover:bg-stone-50',
                      )}
                      aria-pressed={active}
                    >
                      {OBSERVATION_TAG_LABEL[tag]}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="mt-3">
              <div className="flex items-center justify-between gap-2">
                <label
                  htmlFor={confidenceInputId}
                  className="text-xs font-semibold uppercase tracking-wide text-stone-500"
                >
                  Confidence
                </label>
                <span className="text-sm font-semibold text-stone-800">
                  {confidenceLabel(confidencePct)} ({confidencePct}%)
                </span>
              </div>
              <input
                id={confidenceInputId}
                type="range"
                min={0}
                max={100}
                step={1}
                value={confidencePct}
                onChange={(e) => setConfidencePct(Number(e.target.value))}
                className="mt-2 w-full accent-emerald-700"
              />
            </div>

            {saveError ? (
              <p className="mt-2 text-sm font-medium text-rose-800" role="alert">
                {saveError}
              </p>
            ) : null}

            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <button
                type="submit"
                className="flex-1 rounded-2xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white ring-1 ring-emerald-800 transition hover:bg-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
              >
                Save observation
              </button>
              <button
                type="button"
                onClick={closeObservationForm}
                className="rounded-2xl bg-white px-4 py-2.5 text-sm font-semibold text-stone-700 ring-1 ring-stone-200 hover:bg-stone-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : null}

        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-stone-500">
            Observation history
          </p>
          {history.length === 0 ? (
            <p className="mt-2 rounded-2xl bg-stone-50 px-3 py-2.5 text-sm text-stone-600 ring-1 ring-stone-100">
              No observations yet — open Eufy, then tap Take Observation.
            </p>
          ) : (
            <ol className="mt-2 space-y-2">
              {history.map((entry) => (
                <li
                  key={entry.id}
                  className="rounded-2xl bg-white px-3 py-2.5 ring-1 ring-stone-200"
                >
                  <div className="flex flex-wrap items-center gap-2 text-xs text-stone-500">
                    <span className="font-semibold text-stone-800">
                      {gardenCameraLabel(entry.cameraId)}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{confidenceLabel(entry.confidencePct)} confidence</span>
                    <span aria-hidden="true">·</span>
                    <time dateTime={entry.savedAtISO}>
                      {formatTimestamp(entry.savedAtISO)}
                    </time>
                  </div>
                  <p className="mt-1 text-sm leading-relaxed text-stone-800">{entry.note}</p>
                  {entry.tags.length > 0 ? (
                    <ul className="mt-2 flex flex-wrap gap-1">
                      {entry.tags.map((tag) => (
                        <li
                          key={tag}
                          className="rounded-full bg-stone-100 px-2 py-0.5 text-[0.65rem] font-semibold text-stone-700 ring-1 ring-stone-200"
                        >
                          {OBSERVATION_TAG_LABEL[tag]}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </li>
              ))}
            </ol>
          )}
        </div>

        <div className="rounded-2xl border border-dashed border-violet-200 bg-violet-50/40 px-3 py-3">
          <div className="flex items-start gap-2">
            <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-violet-600" aria-hidden="true" />
            <div>
              <p className="text-sm font-semibold text-violet-950">AI Observation</p>
              <p className="mt-1 text-xs leading-relaxed text-violet-900/80">
                Coming soon: Camera → observation → recommendation
              </p>
              <p className="mt-2 text-[0.65rem] font-medium uppercase tracking-wide text-violet-700/70">
                Phase 2 · not available yet
              </p>
            </div>
          </div>
        </div>
      </div>
    </Card>
  )
}
