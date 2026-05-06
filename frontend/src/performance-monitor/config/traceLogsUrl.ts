/**
 * Optional deep-link into a log/trace UI. Set `VITE_PERF_TRACE_LOGS_URL` with `{traceId}` placeholder, e.g.
 * `https://app.datadoghq.com/apm/trace/{traceId}` or your Kibana discover URL pattern.
 */
export function buildPerfTraceLogsUrl(traceId: string): string | null {
  const template = import.meta.env.VITE_PERF_TRACE_LOGS_URL?.trim()
  if (!template) return null
  if (template.includes('{traceId}')) {
    return template.split('{traceId}').join(encodeURIComponent(traceId))
  }
  try {
    const base =
      typeof window !== 'undefined' && window.location?.href
        ? window.location.href
        : 'http://localhost'
    const u = new URL(template, base)
    u.searchParams.set('trace', traceId)
    return u.href
  } catch {
    const join = template.includes('?') ? '&' : '?'
    return `${template}${join}trace=${encodeURIComponent(traceId)}`
  }
}
