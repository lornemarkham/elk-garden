import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'

import { IframeLabToastViewport } from './IframeLabToastViewport'
import { useIframeLabToastQueue } from './useIframeLabToastQueue'

const HARNESS_PATH = '/dev/iframe-harness'

export type HarnessLoadMode =
  | 'fast'
  | 'delayed-shell'
  | 'delayed-content'
  | 'backend-heavy'
  | 'fast-api'
  | 'slow-api'
  | 'mixed-api'
  | 'failing-api'
  | 'post-ready-api'

const ALLOWED_MODES: readonly HarnessLoadMode[] = [
  'fast',
  'delayed-shell',
  'delayed-content',
  'backend-heavy',
  'fast-api',
  'slow-api',
  'mixed-api',
  'failing-api',
  'post-ready-api',
] as const

/** Modes where the parent page runs simulated fetch/XHR for the Startup waterfall (dev middleware). */
const PARENT_API_SIM_MODES: readonly HarnessLoadMode[] = [
  'backend-heavy',
  'fast-api',
  'slow-api',
  'mixed-api',
  'failing-api',
] as const

function parseLabSearch(sp: URLSearchParams): {
  leftEar: number
  rightEar: number
  mode: HarnessLoadMode
  reloadOnChange: boolean
} {
  const left = Number(sp.get('leftEar'))
  const right = Number(sp.get('rightEar'))
  const modeRaw = sp.get('mode') ?? ''
  const mode: HarnessLoadMode = ALLOWED_MODES.includes(modeRaw as HarnessLoadMode)
    ? (modeRaw as HarnessLoadMode)
    : 'fast'
  const updateRaw = (sp.get('update') ?? 'auto').toLowerCase()
  const reloadOnChange = updateRaw !== 'apply'
  return {
    leftEar: Number.isFinite(left) ? left : 25,
    rightEar: Number.isFinite(right) ? right : 30,
    mode,
    reloadOnChange,
  }
}

function buildHarnessSrc(leftEar: number, rightEar: number, load: HarnessLoadMode): string {
  const q = new URLSearchParams()
  q.set('leftEar', String(leftEar))
  q.set('rightEar', String(rightEar))
  q.set('load', load)
  return `${HARNESS_PATH}?${q.toString()}`
}

function fetchLabDev(path: string): Promise<unknown> {
  return fetch(path, { cache: 'no-store' }).catch(() => {
    /* network errors only */
  })
}

/** Dev-only: parent-window requests with identifiable paths (Vite middleware in dev). */
function runParentApiSimulation(mode: HarnessLoadMode): () => void {
  let cancelled = false
  const origin = typeof window !== 'undefined' ? window.location.origin : ''

  void (async () => {
    const fetchLab = (path: string) => fetchLabDev(path)

    if (mode === 'backend-heavy') {
      const paths = ['/api/iframe-lab-probe-1', '/api/iframe-lab-probe-2', '/api/iframe-lab-probe-3']
      for (let i = 0; i < paths.length; i++) {
        if (cancelled) return
        await new Promise((r) => setTimeout(r, 50 * i))
        if (cancelled) return
        await fetchLab(paths[i])
      }
      return
    }

    if (mode === 'fast-api') {
      if (cancelled) return
      await Promise.all([1, 2, 3, 4].map((n) => fetchLab(`/api/iframe-lab-fast-${n}`)))
      return
    }

    if (mode === 'slow-api') {
      if (cancelled) return
      await fetchLab('/api/iframe-lab-slow-1')
      if (cancelled) return
      await fetchLab('/api/iframe-lab-slow-2')
      return
    }

    if (mode === 'mixed-api') {
      if (cancelled) return
      await fetchLab('/api/iframe-lab-mixed-1')
      if (cancelled) return
      await fetchLab('/api/iframe-lab-mixed-2')
      if (cancelled) return
      await fetchLab(`${origin}/iframe-lab-mixed-fe`)
      return
    }

    if (mode === 'failing-api') {
      if (cancelled) return
      await fetchLab('/api/iframe-lab-fail-1')
      if (cancelled) return
      await fetchLab('/api/iframe-lab-fast-1')
    }
  })()

  return () => {
    cancelled = true
  }
}

/**
 * Parent: simulates a host app driving an embedded iframe microservice via URL params (not postMessage). Dev-only.
 * Lab state is mirrored in this page URL for refresh + sharing.
 */
export function IframeLabPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { toasts, pushToast } = useIframeLabToastQueue()

  const [leftEar, setLeftEar] = useState(() => parseLabSearch(new URLSearchParams(window.location.search)).leftEar)
  const [rightEar, setRightEar] = useState(() => parseLabSearch(new URLSearchParams(window.location.search)).rightEar)
  const [load, setLoad] = useState<HarnessLoadMode>(
    () => parseLabSearch(new URLSearchParams(window.location.search)).mode,
  )
  const [reloadOnChange, setReloadOnChange] = useState(
    () => parseLabSearch(new URLSearchParams(window.location.search)).reloadOnChange,
  )

  useEffect(() => {
    setSearchParams(
      (prev) => {
        const sp = new URLSearchParams(prev)
        sp.set('leftEar', String(leftEar))
        sp.set('rightEar', String(rightEar))
        sp.set('mode', load)
        sp.set('update', reloadOnChange ? 'auto' : 'apply')
        return sp
      },
      { replace: true },
    )
  }, [leftEar, rightEar, load, reloadOnChange, setSearchParams])

  const labQueryString = useMemo(() => {
    const sp = new URLSearchParams(searchParams)
    sp.set('leftEar', String(leftEar))
    sp.set('rightEar', String(rightEar))
    sp.set('mode', load)
    sp.set('update', reloadOnChange ? 'auto' : 'apply')
    return sp.toString()
  }, [searchParams, leftEar, rightEar, load, reloadOnChange])

  const builtSrc = useMemo(() => buildHarnessSrc(leftEar, rightEar, load), [leftEar, rightEar, load])
  const [manualSrc, setManualSrc] = useState(() => {
    const p = parseLabSearch(new URLSearchParams(window.location.search))
    return buildHarnessSrc(p.leftEar, p.rightEar, p.mode)
  })

  const iframeSrc = reloadOnChange ? builtSrc : manualSrc

  const applyIframe = useCallback(() => {
    setManualSrc(buildHarnessSrc(leftEar, rightEar, load))
  }, [leftEar, rightEar, load])

  const triggerManualFastApi = useCallback(async () => {
    pushToast('⚡ Triggered fast API call (~20ms simulated)')
    console.log('[iframe-lab] fast-api triggered (~20ms simulated)')
    await fetchLabDev('/api/iframe-lab-fast-1')
  }, [pushToast])

  const triggerManualSlowApi = useCallback(async () => {
    pushToast('Triggered slow API call (~900ms simulated)')
    console.log('[iframe-lab] slow-api triggered (~920ms simulated)')
    await fetchLabDev('/api/iframe-lab-slow-1')
  }, [pushToast])

  const triggerManualFailingApi = useCallback(async () => {
    pushToast('❌ Triggered failing API call (HTTP 500 simulated)')
    console.log('[iframe-lab] failing-api triggered (HTTP 500 simulated)')
    await fetchLabDev('/api/iframe-lab-fail-1')
  }, [pushToast])

  const triggerManualMixedSequence = useCallback(async () => {
    pushToast('🔀 Triggered mixed sequence (fast → slow → frontend)')
    console.log('[iframe-lab] mixed-sequence triggered (fast → slow → frontend)')
    const origin = window.location.origin
    await fetchLabDev('/api/iframe-lab-fast-1')
    await fetchLabDev('/api/iframe-lab-mixed-2')
    await fetchLabDev(`${origin}/iframe-lab-mixed-fe`)
  }, [pushToast])

  /** Quick parallel calls using post-ready paths (same “fast” volume; URLs read as post-ready in Waterfall). */
  const triggerManualPostReadyApi = useCallback(async () => {
    pushToast('🌙 Triggered post-ready API calls')
    console.log('[iframe-lab] post-ready-api triggered')
    await Promise.all([
      fetchLabDev('/api/iframe-lab-post-ready-1'),
      fetchLabDev('/api/iframe-lab-post-ready-2'),
    ])
  }, [pushToast])

  /**
   * Defer starting the simulation to the next macrotask so React 18 Strict Mode can cancel the
   * first scheduled run before any fetch runs. Otherwise dev double-invokes this effect and two
   * identical simulations overlap (e.g. two /api/iframe-lab-fail-1 rows).
   */
  useEffect(() => {
    if (!PARENT_API_SIM_MODES.includes(load)) return
    let cancelSim: (() => void) | undefined
    let aborted = false
    const timer = window.setTimeout(() => {
      if (aborted) return
      cancelSim = runParentApiSimulation(load)
    }, 0)
    return () => {
      aborted = true
      window.clearTimeout(timer)
      cancelSim?.()
    }
  }, [load, iframeSrc])

  useEffect(() => {
    if (load !== 'post-ready-api') return
    const onMsg = (e: MessageEvent) => {
      if (e.origin !== window.location.origin) return
      if (e.data?.type !== 'iframe-ready') return
      void Promise.all([
        fetch('/api/iframe-lab-post-ready-1', { cache: 'no-store' }).catch(() => {}),
        fetch('/api/iframe-lab-post-ready-2', { cache: 'no-store' }).catch(() => {}),
      ])
    }
    window.addEventListener('message', onMsg)
    return () => window.removeEventListener('message', onMsg)
  }, [load])

  return (
    <div className="min-h-dvh bg-stone-100 p-4 text-stone-900">
      <IframeLabToastViewport toasts={toasts} />
      <div className="mx-auto max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">
          Temporary dev-only · delete with /dev/iframe-lab
        </p>
        <h1 className="mt-2 text-2xl font-bold">Iframe lab (work-style)</h1>
        <p className="mt-2 text-sm leading-relaxed text-stone-600">
          This simulates a <strong>parent-controlled iframe microservice</strong>: configuration is passed in via{' '}
          <strong>URL query params</strong> (like a real embed URL), not <code className="rounded bg-stone-200 px-1">postMessage</code>.
          Lab controls are also in this page&apos;s URL (<code className="rounded bg-stone-200 px-1">mode</code>,{' '}
          <code className="rounded bg-stone-200 px-1">update</code>, ears) so you can refresh or share a scenario. Use the
          performance monitor&apos;s <strong>Iframes</strong> and <strong>Startup waterfall</strong> tabs. API-style
          demos need <code className="rounded bg-stone-200 px-1">npm run dev</code> (Vite serves{' '}
          <code className="rounded bg-stone-200 px-1">/api/iframe-lab-*</code>).
        </p>
        <p className="mt-2 text-sm text-stone-600">
          Open harness directly:{' '}
          <Link to={HARNESS_PATH} className="text-emerald-800 underline" target="_blank" rel="noreferrer">
            {HARNESS_PATH}
          </Link>
        </p>

        <div className="mt-6 space-y-4 rounded-lg bg-white p-4 ring-2 ring-stone-400">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-medium text-stone-700">
              Left ear (dB HL)
              <input
                type="number"
                value={leftEar}
                onChange={(e) => setLeftEar(Number(e.target.value))}
                className="mt-1 w-full rounded-md border border-stone-300 px-2 py-1.5 text-stone-900"
              />
            </label>
            <label className="block text-sm font-medium text-stone-700">
              Right ear (dB HL)
              <input
                type="number"
                value={rightEar}
                onChange={(e) => setRightEar(Number(e.target.value))}
                className="mt-1 w-full rounded-md border border-stone-300 px-2 py-1.5 text-stone-900"
              />
            </label>
          </div>

          <label className="block text-sm font-medium text-stone-700">
            Load simulation (<code className="text-xs">mode</code>)
            <select
              value={load}
              onChange={(e) => setLoad(e.target.value as HarnessLoadMode)}
              className="mt-1 w-full rounded-md border border-stone-300 bg-white px-2 py-1.5 text-stone-900 sm:max-w-md"
            >
              <option value="fast">fast — shell + content immediately</option>
              <option value="delayed-shell">delayed-shell — blank first, then shell + content</option>
              <option value="delayed-content">delayed-content — shell first, content after delay</option>
              <option value="backend-heavy">
                backend-heavy — shell first, fake /api startup work, then content + ready
              </option>
              <option value="fast-api">fast-api — parallel quick /api/iframe-lab-fast-* before ready (parent)</option>
              <option value="slow-api">slow-api — two slow /api/iframe-lab-slow-* before ready (parent)</option>
              <option value="mixed-api">
                mixed-api — fast + slow API + one frontend-class /iframe-lab-mixed-fe (parent)
              </option>
              <option value="failing-api">failing-api — /api/iframe-lab-fail-1 (500) then OK call (parent)</option>
              <option value="post-ready-api">
                post-ready-api — /api/iframe-lab-post-ready-* only after iframe-ready (parent)
              </option>
            </select>
          </label>

          <fieldset className="text-sm text-stone-700">
            <legend className="font-medium">
              Iframe URL updates (<code className="text-xs">update</code>)
            </legend>
            <label className="mt-2 flex cursor-pointer items-center gap-2">
              <input
                type="radio"
                name="iframe-update"
                checked={reloadOnChange}
                onChange={() => setReloadOnChange(true)}
              />
              <code className="rounded bg-stone-100 px-1 text-xs">auto</code> — reload iframe on every change
            </label>
            <label className="mt-1 flex cursor-pointer items-center gap-2">
              <input
                type="radio"
                name="iframe-update"
                checked={!reloadOnChange}
                onChange={() => {
                  setReloadOnChange(false)
                  setManualSrc(buildHarnessSrc(leftEar, rightEar, load))
                }}
              />
              <code className="rounded bg-stone-100 px-1 text-xs">apply</code> — apply only when clicking &quot;Update
              iframe&quot;
            </label>
          </fieldset>

          {!reloadOnChange ? (
            <button
              type="button"
              onClick={applyIframe}
              className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-600"
            >
              Update iframe
            </button>
          ) : null}

          <p className="break-all text-xs text-stone-500">
            This page:{' '}
            <code className="rounded bg-stone-100 px-1 text-stone-800">
              {typeof window !== 'undefined' ? `${window.location.pathname}?${labQueryString}` : ''}
            </code>
          </p>
          <p className="break-all text-xs text-stone-500">
            Iframe src: <code className="rounded bg-stone-100 px-1 text-stone-800">{iframeSrc}</code>
          </p>
          {!reloadOnChange ? (
            <p className="text-xs text-stone-500">
              Preview (not loaded until Update):{' '}
              <code className="rounded bg-stone-100 px-1 text-stone-800">{builtSrc}</code>
            </p>
          ) : null}
        </div>

        <div className="mt-4 rounded-lg border border-stone-300 bg-stone-50/90 p-4">
          <div className="mb-2 space-y-0.5">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-stone-500">Live traffic generator</p>
            <p className="text-[11px] text-stone-600">Dev-only startup traffic controls</p>
          </div>
          <h2 className="text-sm font-semibold text-stone-800">Trigger API Calls (dev)</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void triggerManualFastApi()}
              className="inline-flex items-center gap-1 rounded border border-stone-400 bg-white px-3 py-1.5 text-xs font-medium text-stone-800 hover:bg-stone-100"
            >
              <span className="text-[13px] leading-none" aria-hidden>
                ⚡
              </span>
              Fast API call
            </button>
            <button
              type="button"
              onClick={() => void triggerManualSlowApi()}
              className="inline-flex items-center gap-1 rounded border border-stone-400 bg-white px-3 py-1.5 text-xs font-medium text-stone-800 hover:bg-stone-100"
            >
              <span className="text-[13px] leading-none" aria-hidden>
                🐢
              </span>
              Slow API call
            </button>
            <button
              type="button"
              onClick={() => void triggerManualFailingApi()}
              className="inline-flex items-center gap-1 rounded border border-stone-400 bg-white px-3 py-1.5 text-xs font-medium text-stone-800 hover:bg-stone-100"
            >
              <span className="text-[13px] leading-none" aria-hidden>
                ❌
              </span>
              Failing API call
            </button>
            <button
              type="button"
              onClick={() => void triggerManualMixedSequence()}
              className="inline-flex items-center gap-1 rounded border border-stone-400 bg-white px-3 py-1.5 text-xs font-medium text-stone-800 hover:bg-stone-100"
            >
              <span className="text-[13px] leading-none" aria-hidden>
                🔀
              </span>
              Mixed sequence
            </button>
            <button
              type="button"
              title="Quick parallel fetches to /api/iframe-lab-post-ready-* (compare timing vs iframe-ready in Waterfall)."
              onClick={() => void triggerManualPostReadyApi()}
              className="inline-flex items-center gap-1 rounded border border-stone-400 bg-white px-3 py-1.5 text-xs font-medium text-stone-800 hover:bg-stone-100"
            >
              <span className="text-[13px] leading-none" aria-hidden>
                🌙
              </span>
              Post-ready API call
            </button>
          </div>
          <p className="mt-3 text-xs text-stone-600">
            These simulate parent-window traffic for the Startup Waterfall (dev only).
          </p>
        </div>

        <div className="mt-6 rounded-lg bg-white p-1 ring-2 ring-stone-400">
          <div className="border-b border-stone-200 bg-stone-50 px-3 py-2 text-xs font-medium text-stone-600">
            Embedded iframe — fixed slot (compare blank vs stable layout)
          </div>
          <div className="min-h-[420px] bg-stone-200/80 p-1">
            <iframe
              key={iframeSrc}
              title="Iframe harness"
              src={iframeSrc}
              className="box-border block h-[400px] w-full border-2 border-dashed border-amber-700/70 bg-white"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
