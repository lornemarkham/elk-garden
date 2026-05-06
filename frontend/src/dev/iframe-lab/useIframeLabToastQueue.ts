import { useCallback, useState } from 'react'

export type IframeLabToastItem = { id: string; message: string }

/** ~2.5–3s auto-dismiss per stacked toast */
const DISMISS_MS = 2800

export function useIframeLabToastQueue(dismissMs: number = DISMISS_MS) {
  const [toasts, setToasts] = useState<IframeLabToastItem[]>([])

  const pushToast = useCallback(
    (message: string) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
      setToasts((prev) => [...prev, { id, message }])
      window.setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id))
      }, dismissMs)
    },
    [dismissMs],
  )

  return { toasts, pushToast }
}
