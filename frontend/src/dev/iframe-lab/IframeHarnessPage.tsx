import { useCallback, useEffect, useMemo, useState } from 'react'

/**
 * Same-origin parent must receive with a valid targetOrigin. `""` throws in modern browsers
 * ("Invalid target origin"), so we use the page origin (parent matches when embedded from /dev/iframe-lab).
 */
const PARENT_TARGET = window.location.origin

const SHELL_MS = 900
const CONTENT_MS = 900
/** Reference clinical threshold (dB HL); warning when either ear is strictly above this value. */
const WARNING_THRESHOLD_DB = 30

type HarnessLoadMode =
  | 'fast'
  | 'delayed-shell'
  | 'delayed-content'
  | 'backend-heavy'
  | 'fast-api'
  | 'slow-api'
  | 'mixed-api'
  | 'failing-api'
  | 'post-ready-api'

const STARTUP_FETCH_STAGGER_MS = 140
const STARTUP_PROBE_PATHS = [
  '/api/iframe-lab-startup-1',
  '/api/iframe-lab-startup-2',
  '/api/iframe-lab-startup-3',
] as const

/** Parent runs API sim; iframe waits this long before content+ready so calls finish first. */
const FAST_API_READY_MS = 420
const SLOW_API_READY_MS = 2800
const MIXED_API_READY_MS = 2000
const FAILING_API_READY_MS = 1300

type Phase = 'blank' | 'shell' | 'content'

function sendToParent(payload: Record<string, unknown>) {
  window.parent.postMessage(payload, PARENT_TARGET)
}

const ALLOWED_LOAD: readonly HarnessLoadMode[] = [
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

function readHarnessSearch(): { leftEar: number; rightEar: number; load: HarnessLoadMode } {
  const sp = new URLSearchParams(window.location.search)
  const left = Number(sp.get('leftEar'))
  const right = Number(sp.get('rightEar'))
  const rawLoad = sp.get('load') ?? 'fast'
  const load: HarnessLoadMode = ALLOWED_LOAD.includes(rawLoad as HarnessLoadMode)
    ? (rawLoad as HarnessLoadMode)
    : 'fast'
  return {
    leftEar: Number.isFinite(left) ? left : 20,
    rightEar: Number.isFinite(right) ? right : 20,
    load,
  }
}

/**
 * Child document for `/dev/iframe-lab`. Dev-only.
 */
function initialPhase(load: HarnessLoadMode): Phase {
  if (load === 'delayed-shell') return 'blank'
  if (load === 'fast' || load === 'post-ready-api') return 'content'
  return 'shell'
}

async function runStartupProbeFetches(): Promise<void> {
  for (const path of STARTUP_PROBE_PATHS) {
    try {
      await fetch(path, { cache: 'no-store' })
    } catch {
      /* ignore network errors */
    }
    await new Promise((r) => setTimeout(r, STARTUP_FETCH_STAGGER_MS))
  }
}

export function IframeHarnessPage() {
  const { leftEar, rightEar, load } = useMemo(() => readHarnessSearch(), [])
  const [phase, setPhase] = useState<Phase>(() => initialPhase(load))

  const warningActive = leftEar > WARNING_THRESHOLD_DB || rightEar > WARNING_THRESHOLD_DB

  useEffect(() => {
    if (load === 'fast' || load === 'post-ready-api') {
      sendToParent({ type: 'iframe-shell-rendered', load })
      queueMicrotask(() => sendToParent({ type: 'iframe-params-parsed', leftEar, rightEar, load }))
      queueMicrotask(() => sendToParent({ type: 'iframe-content-visible', load }))
      queueMicrotask(() => sendToParent({ type: 'iframe-ready', load }))
      return
    }

    if (load === 'delayed-shell') {
      const t1 = window.setTimeout(() => {
        setPhase('shell')
        sendToParent({ type: 'iframe-shell-rendered', load })
        queueMicrotask(() => sendToParent({ type: 'iframe-params-parsed', leftEar, rightEar, load }))
      }, SHELL_MS)
      const t2 = window.setTimeout(() => {
        setPhase('content')
        sendToParent({ type: 'iframe-content-visible', load })
        queueMicrotask(() => sendToParent({ type: 'iframe-ready', load }))
      }, SHELL_MS + 80)
      return () => {
        clearTimeout(t1)
        clearTimeout(t2)
      }
    }

    if (load === 'backend-heavy') {
      sendToParent({ type: 'iframe-shell-rendered', load })
      queueMicrotask(() => sendToParent({ type: 'iframe-params-parsed', leftEar, rightEar, load }))

      let cancelled = false
      void (async () => {
        await runStartupProbeFetches()
        if (cancelled) return
        setPhase('content')
        sendToParent({ type: 'iframe-content-visible', load })
        queueMicrotask(() => sendToParent({ type: 'iframe-ready', load }))
      })()
      return () => {
        cancelled = true
      }
    }

    const parentDrivenApi = (readyAfterMs: number) => {
      sendToParent({ type: 'iframe-shell-rendered', load })
      queueMicrotask(() => sendToParent({ type: 'iframe-params-parsed', leftEar, rightEar, load }))
      const t = window.setTimeout(() => {
        setPhase('content')
        sendToParent({ type: 'iframe-content-visible', load })
        queueMicrotask(() => sendToParent({ type: 'iframe-ready', load }))
      }, readyAfterMs)
      return () => clearTimeout(t)
    }

    if (load === 'fast-api') return parentDrivenApi(FAST_API_READY_MS)
    if (load === 'slow-api') return parentDrivenApi(SLOW_API_READY_MS)
    if (load === 'mixed-api') return parentDrivenApi(MIXED_API_READY_MS)
    if (load === 'failing-api') return parentDrivenApi(FAILING_API_READY_MS)

    // delayed-content
    sendToParent({ type: 'iframe-shell-rendered', load })
    queueMicrotask(() => sendToParent({ type: 'iframe-params-parsed', leftEar, rightEar, load }))
    const t = window.setTimeout(() => {
      setPhase('content')
      sendToParent({ type: 'iframe-content-visible', load })
      queueMicrotask(() => sendToParent({ type: 'iframe-ready', load }))
    }, CONTENT_MS)
    return () => clearTimeout(t)
  }, [load, leftEar, rightEar])

  const sendClick = useCallback(() => {
    sendToParent({ type: 'iframe-click' })
  }, [])

  const doError = useCallback(() => {
    throw new Error('iframe test error')
  }, [])

  const fakeFetch = useCallback(() => {
    void fetch(`${window.location.origin}/dev/iframe-harness`, {
      method: 'GET',
      cache: 'no-store',
    }).catch(() => {
      /* network errors only */
    })
  }, [])

  const shellChrome = (
    <div
      className={`border-b px-3 py-2 text-xs font-medium uppercase tracking-wide ${
        warningActive ? 'border-amber-600/30 bg-stone-950/80 text-amber-200/80' : 'border-stone-600 text-stone-400'
      }`}
    >
      Hearing module (URL-driven)
    </div>
  )

  if (phase === 'blank') {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-stone-200 text-sm text-stone-500">
        <span>Loading…</span>
      </div>
    )
  }

  const outerShellClass = warningActive
    ? 'flex min-h-dvh flex-col bg-gradient-to-b from-stone-950 via-stone-950 to-[#1c1814] text-stone-100 shadow-[inset_0_0_0_1px_rgba(217,119,6,0.22),0_0_36px_rgba(154,52,18,0.07)]'
    : 'flex min-h-dvh flex-col bg-stone-900 text-stone-100'

  return (
    <div className={outerShellClass}>
      {shellChrome}
      {warningActive ? (
        <div className="border-b border-amber-500/35 bg-amber-950/25 px-4 py-2.5">
          <p className="text-[13px] font-semibold tracking-wide text-amber-50">Attention: threshold exceeded</p>
          <p className="mt-0.5 text-xs leading-snug text-amber-100/65">
            One or both ears are above {WARNING_THRESHOLD_DB} dB HL (reference). Review before proceeding.
          </p>
        </div>
      ) : null}
      <div className="flex flex-1 flex-col p-4">
        {phase === 'shell' && load === 'delayed-content' ? (
          <div className="flex flex-1 flex-col items-start gap-3">
            <p className="text-sm text-stone-400">Shell ready — waiting for content…</p>
            <div
              className={`h-24 w-full max-w-md animate-pulse rounded-lg ${
                warningActive ? 'bg-amber-950/25 ring-1 ring-amber-600/25' : 'bg-stone-700/80'
              }`}
            />
          </div>
        ) : null}

        {phase === 'shell' && load === 'backend-heavy' ? (
          <div className="flex flex-1 flex-col items-start gap-3">
            <p className="text-sm text-stone-300">Shell visible — running startup requests (simulated BFF)…</p>
            <p className="text-xs text-stone-500">
              Dev-only: sequential <code className="rounded bg-stone-800 px-1">/api/iframe-lab-startup-*</code> fetches
              in this frame before content and <code className="rounded bg-stone-800 px-1">iframe-ready</code>.
            </p>
            <div
              className={`h-20 w-full max-w-md animate-pulse rounded-lg ${
                warningActive ? 'bg-amber-950/25 ring-1 ring-amber-600/25' : 'bg-stone-700/80'
              }`}
            />
          </div>
        ) : null}

        {phase === 'shell' &&
        (load === 'fast-api' || load === 'slow-api' || load === 'mixed-api' || load === 'failing-api') ? (
          <div className="flex flex-1 flex-col items-start gap-3">
            <p className="text-sm text-stone-300">Shell visible — parent window is simulating startup HTTP…</p>
            <p className="text-xs text-stone-500">
              {load === 'fast-api' ? (
                <>
                  Scenario <code className="rounded bg-stone-800 px-1">fast-api</code>: parallel{' '}
                  <code className="rounded bg-stone-800 px-1">/api/iframe-lab-fast-*</code> (quick) in the parent before
                  ready.
                </>
              ) : null}
              {load === 'slow-api' ? (
                <>
                  Scenario <code className="rounded bg-stone-800 px-1">slow-api</code>: sequential slow{' '}
                  <code className="rounded bg-stone-800 px-1">/api/iframe-lab-slow-*</code> (Vite dev delays) in the
                  parent.
                </>
              ) : null}
              {load === 'mixed-api' ? (
                <>
                  Scenario <code className="rounded bg-stone-800 px-1">mixed-api</code>: fast + slow API + one{' '}
                  <code className="rounded bg-stone-800 px-1">/iframe-lab-mixed-fe</code> (frontend-class) request.
                </>
              ) : null}
              {load === 'failing-api' ? (
                <>
                  Scenario <code className="rounded bg-stone-800 px-1">failing-api</code>:{' '}
                  <code className="rounded bg-stone-800 px-1">/api/iframe-lab-fail-1</code> returns 500, then a quick OK
                  call.
                </>
              ) : null}
            </p>
            <div
              className={`h-20 w-full max-w-md animate-pulse rounded-lg ${
                warningActive ? 'bg-amber-950/25 ring-1 ring-amber-600/25' : 'bg-stone-700/80'
              }`}
            />
          </div>
        ) : null}

        {phase === 'shell' && load === 'delayed-shell' ? (
          <div className="flex flex-1 flex-col gap-2">
            <p className="text-sm text-stone-400">Shell ready — loading parameters…</p>
          </div>
        ) : null}

        {phase === 'content' ? (
          <div
            className={
              warningActive
                ? 'flex flex-1 flex-col rounded-xl border border-amber-600/40 bg-stone-900/45 p-5 shadow-[0_0_32px_rgba(217,119,6,0.09)]'
                : 'flex flex-1 flex-col'
            }
          >
            <h1 className="text-lg font-semibold text-stone-50">Audiometry (from URL)</h1>
            {warningActive ? (
              <p className="mt-2 text-sm text-amber-100/85">
                Values exceed the {WARNING_THRESHOLD_DB} dB HL reference on at least one side.
              </p>
            ) : (
              <p className="mt-2 text-sm text-stone-500">
                Both ears at or below {WARNING_THRESHOLD_DB} dB HL — no threshold flag.
              </p>
            )}
            <dl className="mt-4 grid gap-3 sm:grid-cols-2">
              <div
                className={`rounded-lg p-3 ${
                  warningActive
                    ? 'border border-amber-700/35 bg-stone-800/60 shadow-sm shadow-amber-950/20'
                    : 'bg-stone-800/80'
                }`}
              >
                <dt className="text-xs uppercase text-stone-500">Left ear</dt>
                <dd className="text-2xl font-bold tabular-nums text-white">{leftEar}</dd>
                <dd className="text-xs text-stone-500">dB HL</dd>
              </div>
              <div
                className={`rounded-lg p-3 ${
                  warningActive
                    ? 'border border-amber-700/35 bg-stone-800/60 shadow-sm shadow-amber-950/20'
                    : 'bg-stone-800/80'
                }`}
              >
                <dt className="text-xs uppercase text-stone-500">Right ear</dt>
                <dd className="text-2xl font-bold tabular-nums text-white">{rightEar}</dd>
                <dd className="text-xs text-stone-500">dB HL</dd>
              </div>
            </dl>
            <p className="mt-4 text-xs text-stone-500">
              <code className="rounded bg-stone-800 px-1">load={load}</code> · postMessage targetOrigin{' '}
              <code className="rounded bg-stone-800 px-1">{PARENT_TARGET}</code>
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={sendClick}
                className="rounded-lg bg-emerald-800 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
              >
                Send test message
              </button>
              <button
                type="button"
                onClick={doError}
                className="rounded-lg bg-red-900/90 px-3 py-2 text-sm font-semibold text-white hover:bg-red-800"
              >
                Throw error
              </button>
              <button
                type="button"
                onClick={fakeFetch}
                className="rounded-lg bg-stone-600 px-3 py-2 text-sm font-semibold text-white hover:bg-stone-500"
              >
                Fake fetch
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
