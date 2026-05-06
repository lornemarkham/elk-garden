/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE?: string
  /** Optional URL template for “View trace”; use `{traceId}` placeholder. */
  readonly VITE_PERF_TRACE_LOGS_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
