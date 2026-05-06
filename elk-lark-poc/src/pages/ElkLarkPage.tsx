import { useCallback, useState } from 'react'

export function ElkLarkPage() {
  const [status, setStatus] = useState<string>('Tap a demo request — watch the overlay (bottom-right).')

  const run = useCallback(async (label: string, fn: () => Promise<void>) => {
    setStatus(`${label}…`)
    try {
      await fn()
      setStatus(`${label} — done.`)
    } catch {
      setStatus(`${label} — failed (expected for the error demo).`)
    }
  }, [])

  return (
    <div className="lark-page">
      <div className="lark-badge">Proof of concept · not part of ELK Garden app</div>
      <h1 className="lark-title">ELK Lark</h1>
      <p className="lark-lead">
        Field learning, step by step — with a performance lab you can peel off into a Chrome extension
        later. For now, this page stands alone so you can delete the whole{' '}
        <code style={{ fontSize: '0.9em' }}>elk-lark-poc</code> folder anytime.
      </p>

      <div className="lark-panel">
        <h2>Try network traces</h2>
        <p style={{ margin: '0 0 1rem', fontSize: '0.95rem', color: 'var(--lark-muted)', lineHeight: 1.55 }}>
          These calls go to public test APIs. Enable the overlay if it is minimized — it instruments{' '}
          <code style={{ fontSize: '0.85em' }}>fetch</code> while the lab is on.
        </p>
        <div className="lark-actions">
          <button
            type="button"
            className="lark-btn lark-btn--primary"
            onClick={() =>
              run('Fast JSON request', async () => {
                const res = await fetch('https://jsonplaceholder.typicode.com/posts/1')
                if (!res.ok) throw new Error('bad status')
              })
            }
          >
            Fast request
          </button>
          <button
            type="button"
            className="lark-btn lark-btn--secondary"
            onClick={() =>
              run('Slow request (1s)', async () => {
                const res = await fetch('https://httpbin.org/delay/1')
                if (!res.ok) throw new Error('bad status')
              })
            }
          >
            Slow request
          </button>
          <button
            type="button"
            className="lark-btn lark-btn--ghost"
            onClick={() =>
              run('Error response', async () => {
                const res = await fetch('https://jsonplaceholder.typicode.com/posts/999999')
                if (!res.ok) throw new Error(`HTTP ${res.status}`)
              })
            }
          >
            Force error
          </button>
        </div>
        <div className="lark-status">
          <strong>Last run:</strong> {status}
        </div>
      </div>

      <div className="lark-panel">
        <h2>What you are looking at</h2>
        <p style={{ margin: 0, fontSize: '0.95rem', lineHeight: 1.6, color: 'var(--lark-muted)' }}>
          The floating <strong style={{ color: 'var(--lark-ink)' }}>ELK Lark · Performance Lab</strong> panel
          comes from the bundled Sycle-style monitor (see repo <code>../sycle-performance-monitor</code>
          ). It tracks Web Vitals, waterfalls, and fetch timing — a credible path toward a browser
          extension without touching the main ELK Garden frontend.
        </p>
      </div>

      <p className="lark-footnote">
        Run locally: <code>cd elk-lark-poc && npm install && npm run dev</code> — default port{' '}
        <code>5175</code> so it does not collide with the main Vite app on <code>5173</code>.
      </p>
    </div>
  )
}
