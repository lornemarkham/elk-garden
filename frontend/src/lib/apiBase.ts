/**
 * Base URL for the Express API. Set in `frontend/.env.local` as VITE_API_BASE.
 * In production without a base, requests use same-origin relative paths.
 */
export function getApiBaseUrl(): string {
  const raw = import.meta.env.VITE_API_BASE
  const base = typeof raw === 'string' ? raw.trim().replace(/\/$/, '') : ''
  if (base) return base
  if (import.meta.env.DEV) return 'http://localhost:8788'
  return ''
}
