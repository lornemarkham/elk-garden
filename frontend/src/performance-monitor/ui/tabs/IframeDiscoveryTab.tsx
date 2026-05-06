import { Fragment, type CSSProperties, type ReactNode } from 'react'
import {
  cooperativeIframeLifecycleDisplayLabel,
  isCooperativeIframeLifecycleSummary,
} from '../../core/selectors'
import type {
  DerivedMetrics,
  EmbeddedLoadExperienceSummary,
  EmbeddedLoadTimingSummary,
  EmbeddedStartupVerdict,
  PostMessageObservation,
} from '../../core/types'
import { overlayStyles as styles } from '../overlay-styles'

/** Aligns with `FAST_SHELL_AFTER_LOAD_MS` in selectors (shell “immediate” wording). */
const FAST_SHELL_MS = 175
/** Aligns with `BLANK_FIRST_SHELL_MS` in selectors. */
const BLANK_FIRST_SHELL_MS = 650

const EMBED_ACCENT = '#36cfc9'

type Props = {
  derived: DerivedMetrics
}

function embedPanelSurface(): CSSProperties {
  return {
    background: 'linear-gradient(180deg, rgba(54,207,201,0.12) 0%, rgba(0,0,0,0.35) 100%)',
    border: '1px solid rgba(54,207,201,0.35)',
    borderRadius: 10,
    padding: '16px 14px 18px',
  }
}

function mutedEmbedPanelSurface(): CSSProperties {
  return {
    background: 'linear-gradient(180deg, rgba(54,207,201,0.06) 0%, rgba(0,0,0,0.32) 100%)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 10,
    padding: '16px 14px 18px',
  }
}

function metricTileStyle(active: boolean): CSSProperties {
  return {
    background: active ? 'rgba(54,207,201,0.14)' : 'rgba(255,255,255,0.04)',
    border: active ? '1px solid rgba(54,207,201,0.45)' : '1px solid rgba(255,255,255,0.1)',
    borderRadius: 8,
    padding: '12px 12px 14px',
    minHeight: 86,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'flex-start',
  }
}

type MetricTileProps = {
  label: string
  value: string
  descriptor?: string
  /** false dims tile (e.g. not observed) */
  active?: boolean
  /** slightly smaller value for text-heavy tiles (identity) */
  valueSize?: 'lg' | 'md'
}

function MetricTile({ label, value, descriptor, active = true, valueSize = 'lg' }: MetricTileProps) {
  return (
    <div style={metricTileStyle(active)}>
      <div
        style={{
          fontSize: '10px',
          fontWeight: 700,
          letterSpacing: '0.06em',
          textTransform: 'uppercase' as const,
          color: active ? EMBED_ACCENT : '#666',
          marginBottom: 8,
          lineHeight: 1.3,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: valueSize === 'lg' ? '20px' : '15px',
          fontWeight: 700,
          color: active ? '#fff' : '#595959',
          lineHeight: 1.2,
        }}
      >
        {value}
      </div>
      {descriptor ? (
        <div style={{ fontSize: '10px', color: '#8c8c8c', marginTop: 'auto', paddingTop: 10, lineHeight: 1.4 }}>
          {descriptor}
        </div>
      ) : null}
    </div>
  )
}

function SectionHeading({ children, muted }: { children: ReactNode; muted?: boolean }) {
  return (
    <div
      style={{
        fontSize: '10px',
        fontWeight: 700,
        letterSpacing: '0.08em',
        textTransform: 'uppercase' as const,
        color: muted ? '#8c8c8c' : EMBED_ACCENT,
        marginBottom: 10,
      }}
    >
      {children}
    </div>
  )
}

function DiagnosisSubsection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <SectionHeading>{title}</SectionHeading>
      {children}
    </div>
  )
}

function lifecyclePillColors(summary: string): { background: string; color: string } | null {
  switch (summary) {
    case 'iframe-shell-rendered':
      return { background: '#112a45', color: '#69c0ff' }
    case 'iframe-params-parsed':
      return { background: '#123536', color: '#5cdbd3' }
    case 'iframe-content-visible':
      return { background: '#2a1f3d', color: '#b37feb' }
    case 'iframe-ready':
      return { background: '#162312', color: '#95de64' }
    default:
      return null
  }
}

function fmtMs(ms: number | null | undefined): string {
  if (ms == null) return '—'
  if (ms < 1000) return `${Math.round(ms)} ms`
  return `${(ms / 1000).toFixed(2)} s`
}

function fmtClock(at: number | null): string {
  if (at == null) return '—'
  return new Date(at).toLocaleTimeString()
}

function fmtDelta(observed: boolean, ms: number | null): string {
  if (!observed) return '—'
  if (ms == null) return 'unknown'
  return fmtMs(ms)
}

/** Integer ms for diagnosis rows (0 ms, 457 ms); same rules as fmtDelta. */
function fmtDelayMs(observed: boolean, ms: number | null): string {
  return fmtDelta(observed, ms)
}

function httpCountOrUnknown(n: number | null | undefined): string {
  if (n == null) return 'unknown'
  return String(n)
}

const STARTUP_VERDICT_LABEL: Record<EmbeddedStartupVerdict, string> = {
  insufficient_evidence: 'Insufficient evidence',
  ready_missing: 'Ready missing',
  ready_observed: 'Ready observed',
  ready_observed_shell_first: 'Shell-first',
  ready_observed_blank_first: 'Blank-first',
}

function startupTypeHeadline(e: EmbeddedLoadExperienceSummary): string {
  switch (e.startupHeuristic) {
    case 'Likely backend-heavy startup':
      return 'Backend-heavy'
    case 'Likely client-heavy startup':
      return 'Client-heavy'
    case 'Possible shell-first rendering':
      return 'Fast to shell'
    case 'Insufficient evidence':
    default:
      return 'Unclear'
  }
}

function afterTimingStartPhrase(timing: EmbeddedLoadTimingSummary): string {
  switch (timing.anchorKind) {
    case 'iframe_element_load':
      return 'after iframe element load'
    case 'first_cooperative_lifecycle':
      return 'after the first lifecycle signal (no element load in log)'
    case 'iframe_inventory_first_seen':
      return 'after first iframe seen in inventory (coarse)'
    default:
      return 'after the timing start point'
  }
}

function diagnosisExperienceLine(e: EmbeddedLoadExperienceSummary): string {
  const { observed, timing, startupVerdict } = e
  const rel = afterTimingStartPhrase(timing)

  if (!observed.shell && !observed.contentVisible) {
    if (observed.ready) {
      return 'Ready reported without shell or content-visible in this log (ordering may be intentional or capped).'
    }
    return 'No cooperative shell or content-visible message in this log yet.'
  }

  const shellMs = timing.shellDelayMs
  const contentMs = timing.contentVisibleDelayMs

  let shellPhrase = ''
  if (observed.shell) {
    if (shellMs == null) {
      shellPhrase = 'Shell reported (offset from timing start unknown)'
    } else if (startupVerdict === 'ready_observed_blank_first' || shellMs >= BLANK_FIRST_SHELL_MS) {
      shellPhrase = `Shell appeared after ~${Math.round(shellMs)} ms (blank-first from parent view)`
    } else if (shellMs <= FAST_SHELL_MS) {
      shellPhrase = 'Shell showed immediately'
    } else {
      shellPhrase = `Shell appeared after ~${Math.round(shellMs)} ms`
    }
  }

  let contentPhrase = ''
  if (observed.contentVisible) {
    if (contentMs == null) {
      contentPhrase = 'content timing unknown relative to start'
    } else if (observed.shell && shellMs != null && contentMs > shellMs + 25) {
      const afterShell = Math.round(contentMs - shellMs)
      contentPhrase = `meaningful content appeared about ${afterShell} ms later`
    } else if (observed.shell) {
      contentPhrase = 'content visible soon after shell'
    } else {
      contentPhrase = `meaningful content appeared ~${Math.round(contentMs)} ms ${rel}`
    }
  }

  if (shellPhrase && contentPhrase) return `${shellPhrase}. ${contentPhrase.charAt(0).toUpperCase()}${contentPhrase.slice(1)}.`
  if (shellPhrase) return `${shellPhrase}.`
  if (contentPhrase) return `${contentPhrase.charAt(0).toUpperCase()}${contentPhrase.slice(1)}.`
  return 'Lifecycle order incomplete in this capped log.'
}

function timingStartBullet(timing: EmbeddedLoadTimingSummary): string {
  switch (timing.anchorKind) {
    case 'iframe_element_load':
      return 'Timing starts from first iframe element load seen in this session'
    case 'first_cooperative_lifecycle':
      return 'Timing starts from first cooperative lifecycle message (no element load in log)'
    case 'iframe_inventory_first_seen':
      return 'Timing starts from first inventory scan that saw an iframe (coarse lower bound)'
    case 'none':
    default:
      return 'No timing start point yet — capture load and lifecycle in the same monitored session'
  }
}

function timingStartExplanationUi(timing: EmbeddedLoadTimingSummary): string {
  switch (timing.anchorKind) {
    case 'iframe_element_load':
      return 'Timing start point: earliest iframe element load in this session (parent DOM).'
    case 'first_cooperative_lifecycle':
      return 'Timing start point: first cooperative lifecycle message — no iframe element load in this log yet.'
    case 'iframe_inventory_first_seen':
      return 'Timing start point: first inventory scan that saw an iframe (debounced; coarse if load/lifecycle are missing).'
    case 'none':
    default:
      return 'No timing start point yet — wait for iframe element load, lifecycle messages, or inventory while monitoring.'
  }
}

function timingStartDetailLines(timing: EmbeddedLoadTimingSummary): string[] {
  const full = timingStartExplanationUi(timing).replace(/^Timing start point:\s*/i, '').trim()
  if (!full) return []
  return full
    .split(/\s*—\s*/)
    .map((s) => s.trim())
    .filter(Boolean)
}

type StartupInsight = { title: string; detail: string }

function whatDroveStartupInsights(e: EmbeddedLoadExperienceSummary): StartupInsight[] {
  const out: StartupInsight[] = []
  const http = e.httpBeforeReady

  out.push({ title: 'Timing model', detail: timingStartBullet(e.timing) })

  if (e.observed.ready && http) {
    if (http.api > 0) {
      out.push({
        title: 'API dependency',
        detail: `${http.api} API/BFF request${http.api === 1 ? '' : 's'} completed in the parent window before ready`,
      })
    } else {
      out.push({
        title: 'API dependency',
        detail: 'No API/BFF-class parent requests counted before ready',
      })
    }
  } else {
    out.push({
      title: 'HTTP snapshot',
      detail: 'Parent HTTP before ready: not computed (ready not in this log)',
    })
  }

  if (e.startupVerdict === 'ready_observed_blank_first') {
    out.push({
      title: 'Perceived load shape',
      detail: 'Blank-first: long gap before shell (parent-perceived)',
    })
  } else if (e.observed.shell && e.timing.shellDelayMs != null && e.timing.shellDelayMs < BLANK_FIRST_SHELL_MS) {
    out.push({
      title: 'No blank-first gap',
      detail: 'Shell arrived without a long blank-first wait (parent view)',
    })
  } else if (e.startupVerdict === 'ready_observed_shell_first') {
    out.push({
      title: 'Lifecycle order',
      detail: 'Shell precedes content in cooperative messages',
    })
  }

  return out.slice(0, 4)
}

function InsightRow({ insight }: { insight: StartupInsight }) {
  return (
    <div
      style={{
        display: 'flex',
        gap: 12,
        alignItems: 'flex-start',
        background: 'rgba(54,207,201,0.1)',
        border: '1px solid rgba(54,207,201,0.28)',
        borderRadius: 8,
        padding: '12px 14px',
        marginBottom: 8,
      }}
    >
      <div
        style={{
          width: 3,
          borderRadius: 2,
          background: EMBED_ACCENT,
          flexShrink: 0,
          marginTop: 5,
          alignSelf: 'stretch',
          minHeight: 40,
        }}
        aria-hidden
      />
      <div style={{ minWidth: 0 }}>
        <div style={{ fontWeight: 700, color: '#fff', fontSize: '12px', marginBottom: 4 }}>{insight.title}</div>
        <div style={{ color: '#bfbfbf', fontSize: '11px', lineHeight: 1.45 }}>{insight.detail}</div>
      </div>
    </div>
  )
}

function caveatForDisplay(caveat: string): string {
  return caveat
    .replace(/chosen anchor/gi, 'chosen timing start point')
    .replace(/\banchor\b/gi, 'timing start point')
}

/** Practical next step — parent-observed heuristics only, not architecture proof. */
function embeddedLoadRecommendation(e: EmbeddedLoadExperienceSummary): string {
  if (e.startupVerdict === 'insufficient_evidence') {
    return 'Capture iframe load and cooperative lifecycle in one monitored session.'
  }
  if (e.startupVerdict === 'ready_missing') {
    return 'Wait longer for readiness or confirm the embed posts iframe-ready to this window.'
  }
  if (e.startupHeuristic === 'Likely backend-heavy startup') {
    return 'Reduce parent API/BFF work before content is visible, or render partial UI earlier (heuristic).'
  }
  if (e.startupHeuristic === 'Likely client-heavy startup') {
    return 'Tune parent-window waterfalls and main-thread work — not only the iframe document load.'
  }
  if (e.startupVerdict === 'ready_observed_blank_first') {
    return 'Show a shell or loader earlier to shorten perceived blank time.'
  }
  if (e.startupHeuristic === 'Possible shell-first rendering') {
    return 'Looks healthy from the parent view; prioritize polish over structural changes.'
  }
  if (e.startupVerdict === 'ready_observed_shell_first') {
    return 'If the shell-to-content gap feels long, bring content or ready earlier.'
  }
  if (e.startupVerdict === 'ready_observed') {
    return 'Use the timeline below to see where time went (parent-observed only).'
  }
  return 'See details below — heuristics only, not proof inside the embed.'
}

const summaryMetricLabel = {
  color: '#8c8c8c',
  fontSize: '10px',
  marginBottom: 3,
  textTransform: 'uppercase' as const,
  letterSpacing: '0.05em',
}

function LifecycleTimelineStrip({ e }: { e: EmbeddedLoadExperienceSummary }) {
  const steps: { label: string; observed: boolean; ms: number | null }[] = [
    { label: 'Shell', observed: e.observed.shell, ms: e.timing.shellDelayMs },
    { label: 'Content visible', observed: e.observed.contentVisible, ms: e.timing.contentVisibleDelayMs },
    { label: 'Ready', observed: e.observed.ready, ms: e.timing.readyDelayMs },
  ]

  return (
    <div style={{ ...embedPanelSurface(), marginBottom: 16 }}>
      <div style={{ ...summaryMetricLabel, marginBottom: 12, color: EMBED_ACCENT, letterSpacing: '0.08em' }}>Lifecycle</div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
          flexWrap: 'wrap',
        }}
      >
        {steps.map((step, i) => (
          <Fragment key={step.label}>
            {i > 0 ? (
              <span style={{ color: '#595959', fontSize: 18, fontWeight: 300, userSelect: 'none' }} aria-hidden>
                →
              </span>
            ) : null}
            <div
              style={{
                ...metricTileStyle(step.observed),
                flex: '1 1 100px',
                minWidth: 96,
                maxWidth: 168,
                textAlign: 'center',
                minHeight: 88,
                padding: '12px 10px 14px',
              }}
            >
              <div
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  color: step.observed ? EMBED_ACCENT : '#666',
                  marginBottom: 8,
                }}
              >
                {step.label}
              </div>
              <div style={{ fontSize: '20px', fontWeight: 700, color: step.observed ? '#fff' : '#595959', lineHeight: 1.15 }}>
                {fmtDelayMs(step.observed, step.ms)}
              </div>
            </div>
          </Fragment>
        ))}
      </div>
      <div style={{ marginTop: 12, fontSize: '10px', color: '#8c8c8c', lineHeight: 1.45 }}>
        Times are ms after the timing start point · lifecycle depends on iframe cooperation
      </div>
    </div>
  )
}

function PostMessageLifecycleFeed({ postMessageLog }: { postMessageLog: readonly PostMessageObservation[] }) {
  if (postMessageLog.length === 0) {
    return <div style={{ ...styles.emptyState, marginBottom: 0 }}>No postMessage events in this log yet.</div>
  }
  return (
    <ul style={{ margin: 0, paddingLeft: '18px', maxHeight: '260px', overflowY: 'auto' }}>
      {[...postMessageLog]
        .slice()
        .reverse()
        .map((e) => {
          const lifeLabel = cooperativeIframeLifecycleDisplayLabel(e.summary)
          const pill = lifeLabel ? lifecyclePillColors(e.summary) : null
          const isLife = isCooperativeIframeLifecycleSummary(e.summary)
          return (
            <li
              key={e.id}
              style={{
                marginBottom: '10px',
                wordBreak: 'break-word',
                borderLeft: isLife ? '3px solid #597ef7' : '3px solid transparent',
                paddingLeft: '10px',
                marginLeft: '-4px',
              }}
            >
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: '6px 8px' }}>
                <span style={{ color: '#8c8c8c', fontSize: '11px' }}>
                  {new Date(e.timestampMs).toLocaleTimeString()}
                </span>
                <span
                  style={{
                    fontSize: '10px',
                    fontWeight: 700,
                    letterSpacing: '0.02em',
                    textTransform: 'uppercase',
                    color: e.direction === 'sent' ? '#69c0ff' : '#95de64',
                  }}
                >
                  {e.direction}
                </span>
              </div>
              <div
                style={{
                  marginTop: '6px',
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  gap: '8px 12px',
                  lineHeight: 1.35,
                }}
              >
                {lifeLabel && pill ? (
                  <span
                    style={{
                      ...pill,
                      padding: '3px 8px',
                      borderRadius: '4px',
                      fontSize: '10px',
                      fontWeight: 700,
                      letterSpacing: '0.02em',
                      textTransform: 'none',
                      flexShrink: 0,
                    }}
                  >
                    {lifeLabel}
                  </span>
                ) : null}
                <span style={{ color: '#fff', fontSize: '13px', fontWeight: 600 }}>{e.summary}</span>
                <span
                  style={{
                    color: '#666',
                    fontSize: '11px',
                    wordBreak: 'break-all',
                    maxWidth: '100%',
                  }}
                  title={e.origin}
                >
                  {e.origin}
                </span>
              </div>
              {e.summaryDetail ? (
                <div
                  style={{
                    marginTop: '3px',
                    color: '#8c8c8c',
                    fontSize: '11px',
                    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                  }}
                >
                  {e.summaryDetail}
                </div>
              ) : null}
            </li>
          )
        })}
    </ul>
  )
}

export function IframeDiscoveryTab({ derived }: Props) {
  const { iframeInventory, iframeLoadLog, postMessageLog, iframeExperience, embeddedLoadExperience } = derived

  return (
    <div style={{ padding: '20px', fontSize: '12px', color: '#d9d9d9' }}>
      <h3 style={{ color: '#fff', margin: '0 0 6px', fontSize: '16px', fontWeight: 700 }}>Embedded load diagnosis</h3>
      <p style={{ color: '#8c8c8c', fontSize: '11px', margin: '0 0 18px', lineHeight: 1.5 }}>
        Parent-observed only. Lifecycle timing depends on iframe cooperation.
      </p>

      {embeddedLoadExperience ? (
        <div style={{ marginBottom: '20px', borderLeft: `3px solid ${EMBED_ACCENT}`, paddingLeft: '14px' }}>
          <div style={{ ...embedPanelSurface(), marginBottom: 16 }}>
            <SectionHeading>Diagnosis</SectionHeading>

            <DiagnosisSubsection title="Identity">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10 }}>
                <MetricTile
                  label="Startup type"
                  value={startupTypeHeadline(embeddedLoadExperience)}
                  descriptor="Heuristic · not proof of architecture"
                  valueSize="md"
                />
                <MetricTile
                  label="Verdict"
                  value={STARTUP_VERDICT_LABEL[embeddedLoadExperience.startupVerdict]}
                  descriptor="Parent-observed classification"
                  valueSize="md"
                />
              </div>
            </DiagnosisSubsection>

            <DiagnosisSubsection title="Timing">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(108px, 1fr))', gap: 10 }}>
                <MetricTile
                  label="Shell delay"
                  value={fmtDelayMs(embeddedLoadExperience.observed.shell, embeddedLoadExperience.timing.shellDelayMs)}
                  descriptor="Ms after timing start"
                  active={embeddedLoadExperience.observed.shell}
                />
                <MetricTile
                  label="Content-visible delay"
                  value={fmtDelayMs(
                    embeddedLoadExperience.observed.contentVisible,
                    embeddedLoadExperience.timing.contentVisibleDelayMs,
                  )}
                  descriptor="Ms after timing start"
                  active={embeddedLoadExperience.observed.contentVisible}
                />
                <MetricTile
                  label="Ready delay"
                  value={fmtDelayMs(embeddedLoadExperience.observed.ready, embeddedLoadExperience.timing.readyDelayMs)}
                  descriptor="Ms after timing start"
                  active={embeddedLoadExperience.observed.ready}
                />
              </div>
            </DiagnosisSubsection>

            <DiagnosisSubsection title="Drivers">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 10 }}>
                <MetricTile
                  label="API / BFF before ready"
                  value={httpCountOrUnknown(embeddedLoadExperience.httpBeforeReady?.api)}
                  descriptor="Parent window · before iframe-ready"
                  active={embeddedLoadExperience.httpBeforeReady != null && embeddedLoadExperience.httpBeforeReady.api > 0}
                />
                <MetricTile
                  label="Total HTTP before ready"
                  value={httpCountOrUnknown(embeddedLoadExperience.httpBeforeReady?.totalCompleted)}
                  descriptor="Completed requests · parent only"
                  active={embeddedLoadExperience.httpBeforeReady != null && embeddedLoadExperience.httpBeforeReady.totalCompleted > 0}
                />
              </div>
            </DiagnosisSubsection>

            <DiagnosisSubsection title="Interpretation">
              <div style={{ display: 'grid', gap: 10 }}>
                <div style={{ ...metricTileStyle(true), padding: '14px 14px 16px' }}>
                  <div
                    style={{
                      fontSize: '10px',
                      fontWeight: 700,
                      letterSpacing: '0.06em',
                      textTransform: 'uppercase' as const,
                      color: EMBED_ACCENT,
                      marginBottom: 8,
                    }}
                  >
                    Experience
                  </div>
                  <div style={{ color: '#f0f0f0', fontSize: '13px', lineHeight: 1.5, fontWeight: 500 }}>
                    {diagnosisExperienceLine(embeddedLoadExperience)}
                  </div>
                </div>
                <div
                  style={{
                    ...metricTileStyle(true),
                    padding: '14px 14px 16px',
                    borderColor: 'rgba(105,192,255,0.45)',
                    background: 'rgba(105,192,255,0.08)',
                  }}
                >
                  <div
                    style={{
                      fontSize: '10px',
                      fontWeight: 700,
                      letterSpacing: '0.06em',
                      textTransform: 'uppercase' as const,
                      color: '#69c0ff',
                      marginBottom: 8,
                    }}
                  >
                    Next step
                  </div>
                  <div style={{ color: '#91d5ff', fontSize: '13px', lineHeight: 1.5, fontWeight: 500 }}>
                    {embeddedLoadRecommendation(embeddedLoadExperience)}
                  </div>
                </div>
              </div>
            </DiagnosisSubsection>
          </div>

          <LifecycleTimelineStrip e={embeddedLoadExperience} />

          <div style={{ ...embedPanelSurface(), marginBottom: 16 }}>
            <SectionHeading>What drove startup</SectionHeading>
            <p style={{ fontSize: '10px', color: '#8c8c8c', margin: '0 0 12px', lineHeight: 1.45 }}>
              Quick reads from the same signals — not a full trace.
            </p>
            {whatDroveStartupInsights(embeddedLoadExperience).map((insight, i) => (
              <InsightRow key={`${insight.title}-${i}`} insight={insight} />
            ))}
          </div>

          <div style={{ ...mutedEmbedPanelSurface(), marginBottom: 16 }}>
            <SectionHeading muted={false}>Lifecycle events from iframe</SectionHeading>
            <p style={{ color: '#8c8c8c', fontSize: '10px', margin: '0 0 10px', lineHeight: 1.45 }}>
              Parent <code style={{ fontSize: '10px' }}>postMessage</code> log (capped). Phases: Params parsed · Shell
              rendered · Content visible · Ready.
            </p>
            <PostMessageLifecycleFeed postMessageLog={postMessageLog} />
          </div>

          <div style={{ ...mutedEmbedPanelSurface(), opacity: 0.95 }}>
            <SectionHeading muted>Advanced evidence</SectionHeading>
            <p style={{ fontSize: '10px', color: '#666', margin: '0 0 14px', lineHeight: 1.45 }}>
              Not distributed tracing · iframe-internal work is often invisible here
            </p>

            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#bfbfbf', marginBottom: 8 }}>Timing start point</div>
              {timingStartDetailLines(embeddedLoadExperience.timing).map((line, i) => (
                <div key={i} style={{ color: '#d9d9d9', fontSize: '11px', lineHeight: 1.5, marginBottom: 4 }}>
                  {line}
                </div>
              ))}
              {embeddedLoadExperience.timing.anchorAtMs != null ? (
                <div style={{ color: '#8c8c8c', fontSize: '11px', marginTop: 8 }}>
                  Wall clock at start:{' '}
                  <span style={{ color: '#999' }}>{fmtClock(embeddedLoadExperience.timing.anchorAtMs)}</span>
                </div>
              ) : null}
              <div style={{ marginTop: 10, fontSize: '11px', color: '#8c8c8c', lineHeight: 1.5 }}>
                <div>
                  Shell offset:{' '}
                  {fmtDelta(embeddedLoadExperience.observed.shell, embeddedLoadExperience.timing.shellDelayMs)}
                </div>
                <div>
                  Content offset:{' '}
                  {fmtDelta(
                    embeddedLoadExperience.observed.contentVisible,
                    embeddedLoadExperience.timing.contentVisibleDelayMs,
                  )}
                </div>
                <div>
                  Ready offset:{' '}
                  {fmtDelta(embeddedLoadExperience.observed.ready, embeddedLoadExperience.timing.readyDelayMs)}
                </div>
                <div>
                  To ready (total):{' '}
                  {fmtDelta(embeddedLoadExperience.observed.ready, embeddedLoadExperience.timing.totalStartupMs)}
                </div>
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#bfbfbf', marginBottom: 8 }}>Lifecycle stages</div>
              <div style={{ fontSize: '11px', color: '#8c8c8c', marginBottom: 10, lineHeight: 1.5 }}>
                In log: shell{' '}
                <strong style={{ color: embeddedLoadExperience.observed.shell ? '#95de64' : '#666' }}>
                  {embeddedLoadExperience.observed.shell ? 'yes' : 'no'}
                </strong>
                {' · '}content{' '}
                <strong style={{ color: embeddedLoadExperience.observed.contentVisible ? '#95de64' : '#666' }}>
                  {embeddedLoadExperience.observed.contentVisible ? 'yes' : 'no'}
                </strong>
                {' · '}ready{' '}
                <strong style={{ color: embeddedLoadExperience.observed.ready ? '#95de64' : '#666' }}>
                  {embeddedLoadExperience.observed.ready ? 'yes' : 'no'}
                </strong>
                <span style={{ color: '#666' }}> · latest </span>
                <code style={{ color: '#d9d9d9' }}>{embeddedLoadExperience.observed.latestStageLabel}</code>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                  <thead>
                    <tr style={{ color: '#8c8c8c', textAlign: 'left' }}>
                      <th style={{ padding: '4px 8px 4px 0', fontWeight: 600 }}>Stage</th>
                      <th style={{ padding: '4px 8px', fontWeight: 600 }}>Seen</th>
                      <th style={{ padding: '4px 8px', fontWeight: 600 }}>Time</th>
                      <th style={{ padding: '4px 8px', fontWeight: 600 }}>Δ from timing start</th>
                    </tr>
                  </thead>
                  <tbody>
                    {embeddedLoadExperience.timeline.map((row) => (
                      <tr key={row.id} style={{ color: '#d9d9d9' }}>
                        <td style={{ padding: '4px 8px 4px 0', verticalAlign: 'top' }}>{row.label}</td>
                        <td style={{ padding: '4px 8px', color: row.observed ? '#95de64' : '#666' }}>
                          {row.observed ? 'yes' : 'no'}
                        </td>
                        <td style={{ padding: '4px 8px', whiteSpace: 'nowrap' }}>{fmtClock(row.atMs)}</td>
                        <td style={{ padding: '4px 8px', whiteSpace: 'nowrap' }}>
                          {fmtDelta(row.observed, row.deltaFromAnchorMs)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#bfbfbf', marginBottom: 8 }}>HTTP breakdown</div>
              {embeddedLoadExperience.httpBeforeReady ? (
                <div style={{ display: 'grid', gap: 6, fontSize: '11px', color: '#a6a6a6' }}>
                  <div>
                    Total completed:{' '}
                    <strong style={{ color: '#e8e8e8' }}>{embeddedLoadExperience.httpBeforeReady.totalCompleted}</strong>
                  </div>
                  <div>
                    API / BFF:{' '}
                    <strong style={{ color: '#e8e8e8' }}>{embeddedLoadExperience.httpBeforeReady.api}</strong>
                  </div>
                  <div>
                    Frontend:{' '}
                    <strong style={{ color: '#e8e8e8' }}>{embeddedLoadExperience.httpBeforeReady.frontend}</strong>
                  </div>
                  <div>
                    External:{' '}
                    <strong style={{ color: '#e8e8e8' }}>{embeddedLoadExperience.httpBeforeReady.external}</strong>
                  </div>
                  <div>
                    Unknown:{' '}
                    <strong style={{ color: '#e8e8e8' }}>{embeddedLoadExperience.httpBeforeReady.unknown}</strong>
                  </div>
                </div>
              ) : (
                <div style={{ color: '#8c8c8c', fontSize: '11px' }}>
                  Unknown — no ready in log or no settled timestamps.
                </div>
              )}
            </div>

            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#bfbfbf', marginBottom: 6 }}>Heuristic</div>
              <div style={{ color: '#d3adf7', fontSize: '11px', lineHeight: 1.45 }}>
                {embeddedLoadExperience.startupHeuristic}
              </div>
            </div>

            {embeddedLoadExperience.timing.delayCaveats.length > 0 ? (
              <div style={{ color: '#faad14', fontSize: '11px', lineHeight: 1.5, marginBottom: 12 }}>
                {embeddedLoadExperience.timing.delayCaveats.map((c, i) => (
                  <div key={i} style={{ marginBottom: 6 }}>
                    {caveatForDisplay(c)}
                  </div>
                ))}
              </div>
            ) : null}

            {embeddedLoadExperience.perceivedWarnings.length > 0 ? (
              <div style={{ marginTop: 4 }}>
                {embeddedLoadExperience.perceivedWarnings.map((w, i) => (
                  <div key={i} style={{ color: '#faad14', fontSize: '11px', marginTop: i ? '8px' : 0, lineHeight: 1.5 }}>
                    {w}
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {iframeExperience ? (
        <div
          style={{
            ...styles.infoBox,
            marginBottom: '16px',
            borderLeft: '3px solid #597ef7',
          }}
        >
          <div style={{ ...styles.infoText, marginBottom: '8px', fontSize: '11px', lineHeight: 1.55 }}>
            <strong style={{ color: '#fff' }}>Inventory snapshot</strong> — lowest-level detail; parent window only.
          </div>
          <div style={{ fontSize: '11px', lineHeight: 1.6, color: '#d9d9d9' }}>
            <strong style={{ color: '#fff' }}>{iframeExperience.iframeCount}</strong> iframe(s) ·{' '}
            {iframeExperience.relationBreakdownText}
            <span style={{ color: '#666' }}> · </span>
            latest lifecycle:{' '}
            {iframeExperience.latestLifecycle ? (
              <strong style={{ color: '#fff' }}>{iframeExperience.latestLifecycle.displayLabel}</strong>
            ) : (
              <span style={{ color: '#8c8c8c' }}>none in log</span>
            )}
            <span style={{ color: '#666' }}> · </span>
            element <code style={{ fontSize: '10px' }}>load</code> × {iframeExperience.elementLoadEventCount} ·{' '}
            <code style={{ fontSize: '10px' }}>error</code> × {iframeExperience.elementErrorEventCount}
          </div>
          {iframeExperience.warnings.length > 0 ? (
            <div style={{ marginTop: '12px' }}>
              {iframeExperience.warnings.map((w, i) => (
                <div key={i} style={{ color: '#faad14', fontSize: '11px', marginTop: i ? '8px' : 0, lineHeight: 1.5 }}>
                  {w}
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      <div style={{ ...styles.infoBox, marginBottom: '20px' }}>
        <div style={{ ...styles.infoText, fontSize: '11px', lineHeight: 1.55 }}>
          <strong style={{ color: '#fff' }}>Limits:</strong> Cross-origin iframe DOM/network are invisible here; this tab
          lists <code>&lt;iframe&gt;</code> nodes, parent <code>load</code>/<code>error</code>, and parent-window{' '}
          <code>postMessage</code> (capped).
        </div>
      </div>

      <h4 style={{ color: '#fff', margin: '0 0 10px', fontSize: '13px' }}>Inventory ({iframeInventory.length})</h4>
      {iframeInventory.length === 0 ? (
        <div style={styles.emptyState}>No iframes in this document.</div>
      ) : (
        <ul style={{ margin: '0 0 24px', paddingLeft: '18px', lineHeight: 1.5 }}>
          {iframeInventory.map((f) => (
            <li key={f.id} style={{ marginBottom: '14px' }}>
              <div>
                <strong style={{ color: '#fff' }}>#{f.index}</strong>{' '}
                <span style={{ color: '#8c8c8c' }}>{f.relation}</span>
                {f.visibleHeuristic !== 'visible' ? (
                  <span style={{ color: '#faad14' }}> · {f.visibleHeuristic}</span>
                ) : null}
              </div>
              <div style={{ wordBreak: 'break-all', marginTop: '4px' }}>
                <span style={{ color: '#8c8c8c' }}>src attr: </span>
                {f.srcAttribute ?? '—'}
              </div>
              <div style={{ wordBreak: 'break-all' }}>
                <span style={{ color: '#8c8c8c' }}>resolved: </span>
                {f.resolvedUrl ?? '—'}
              </div>
              <div>
                <span style={{ color: '#8c8c8c' }}>origin: </span>
                {f.iframeOrigin ?? '—'}
              </div>
              <div>
                <span style={{ color: '#8c8c8c' }}>box: </span>
                {f.layoutWidth}×{f.layoutHeight}px
                {f.attrWidth || f.attrHeight ? (
                  <span style={{ color: '#666' }}>
                    {' '}
                    (attr {f.attrWidth ?? '—'} × {f.attrHeight ?? '—'})
                  </span>
                ) : null}
              </div>
              <div>
                <span style={{ color: '#8c8c8c' }}>embedded readyState (if readable): </span>
                {f.embeddedReadyState ?? '—'}
              </div>
              {f.limitationNote ? (
                <div style={{ color: '#faad14', marginTop: '6px', fontSize: '11px' }}>{f.limitationNote}</div>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      <h4 style={{ color: '#fff', margin: '0 0 10px', fontSize: '13px' }}>
        Iframe element load / error ({iframeLoadLog.length})
      </h4>
      <p style={{ color: '#8c8c8c', fontSize: '11px', margin: '0 0 10px' }}>
        Fires on the iframe node in the parent document; does not prove embedded document succeeded internally.
      </p>
      {iframeLoadLog.length === 0 ? (
        <div style={{ ...styles.emptyState, marginBottom: '24px' }}>No load/error events yet.</div>
      ) : (
        <ul style={{ margin: '0 0 24px', paddingLeft: '18px', maxHeight: '200px', overflowY: 'auto' }}>
          {[...iframeLoadLog]
            .slice()
            .reverse()
            .map((e) => (
              <li key={e.id} style={{ marginBottom: '6px' }}>
                <span style={{ color: '#8c8c8c' }}>{new Date(e.timestampMs).toLocaleTimeString()}</span> ·{' '}
                <strong>{e.kind}</strong> · iframe <code style={{ fontSize: '11px' }}>{e.iframeId}</code>
              </li>
            ))}
        </ul>
      )}

      {!embeddedLoadExperience ? (
        <>
          <h4 style={{ color: '#fff', margin: '0 0 6px', fontSize: '13px' }}>
            Lifecycle events from iframe ({postMessageLog.length})
          </h4>
          <p style={{ color: '#8c8c8c', fontSize: '10px', margin: '0 0 10px', lineHeight: 1.45 }}>
            Parent-window <code style={{ fontSize: '10px' }}>postMessage</code> (capped). Summaries only.
          </p>
          <PostMessageLifecycleFeed postMessageLog={postMessageLog} />
        </>
      ) : null}
    </div>
  )
}
