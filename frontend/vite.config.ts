import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Connect } from 'vite'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const __dirname = dirname(fileURLToPath(import.meta.url))

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

/**
 * Dev-only: predictable /api/iframe-lab-* and /iframe-lab-mixed-fe for the iframe lab + Startup waterfall demos.
 */
function iframeLabDevApiPlugin(): { name: string; configureServer(server: { middlewares: Connect.Server }): void } {
  return {
    name: 'iframe-lab-dev-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const raw = req.url?.split('?')[0] ?? ''
        if (raw === '/iframe-lab-mixed-fe') {
          res.statusCode = 200
          res.setHeader('Content-Type', 'text/plain; charset=utf-8')
          res.end('iframe-lab mixed frontend-class probe')
          return
        }
        if (!raw.startsWith('/api/iframe-lab-')) {
          next()
          return
        }

        res.setHeader('Content-Type', 'application/json; charset=utf-8')
        res.setHeader('x-trace-id', `iframe-lab-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`)

        if (raw.includes('fail')) {
          await sleep(80)
          res.statusCode = 500
          res.end(JSON.stringify({ error: 'iframe-lab simulated failure', path: raw }))
          return
        }

        if (raw.includes('slow-1')) await sleep(920)
        else if (raw.includes('slow-2')) await sleep(520)
        else if (raw.includes('mixed-2')) await sleep(680)

        res.statusCode = 200
        res.end(JSON.stringify({ ok: true, path: raw, lab: 'iframe-lab' }))
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), iframeLabDevApiPlugin()],
  resolve: {
    alias: {
      '@shared': resolve(__dirname, '../shared'),
    },
  },
})
