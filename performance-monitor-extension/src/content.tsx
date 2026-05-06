import { createRoot, type Root } from 'react-dom/client'
import { ExtensionPanel, type PanelMode } from './ExtensionPanel'
import panelCss from './panel.css?inline'
import { StrictMode, useCallback, useState } from 'react'
import { ingestPageMessage } from './instrumentation-store'
import { injectPageWorldScript } from './inject-page-world'

const HOST_ID = 'elk-perf-monitor-extension-host'
const SHADOW_MOUNT_ID = 'elk-perf-monitor-shadow-mount'

/**
 * Page-world instrumentation posts `window.postMessage` with `event.source === window`.
 * Ignore other frames and unknown payloads.
 */
function onBridgeMessage(ev: MessageEvent): void {
  if (ev.source !== window) return
  ingestPageMessage(ev.data)
}

injectPageWorldScript()
window.addEventListener('message', onBridgeMessage)

function PanelApp() {
  const [mode, setMode] = useState<PanelMode>('open')
  const onModeChange = useCallback((next: PanelMode) => setMode(next), [])
  return (
    <div className="elk-perf-ext-host">
      <ExtensionPanel mode={mode} onModeChange={onModeChange} />
    </div>
  )
}

function mount(): void {
  if (document.getElementById(HOST_ID)) return

  const host = document.createElement('div')
  host.id = HOST_ID
  host.style.cssText = [
    'position:fixed',
    'inset:0',
    'width:100%',
    'height:100%',
    'pointer-events:none',
    'z-index:2147483646',
    'overflow:visible',
  ].join(';')
  ;(document.documentElement ?? document.body).appendChild(host)

  const shadow = host.attachShadow({ mode: 'open' })
  const style = document.createElement('style')
  style.textContent = panelCss
  shadow.appendChild(style)

  const mountEl = document.createElement('div')
  mountEl.id = SHADOW_MOUNT_ID
  mountEl.className = 'elk-perf-shadow-font'
  shadow.appendChild(mountEl)

  const root: Root = createRoot(mountEl)
  root.render(
    <StrictMode>
      <PanelApp />
    </StrictMode>,
  )
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mount, { once: true })
} else {
  mount()
}
