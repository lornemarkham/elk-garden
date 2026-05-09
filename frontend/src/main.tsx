import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import { ScrollToTop } from './components/ScrollToTop'
import { GardenProvider } from './lib/garden/GardenStore'
import { CapabilityProvider } from './lib/capabilities/CapabilityProvider'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <ScrollToTop />
      <CapabilityProvider>
        <GardenProvider>
          <App />
        </GardenProvider>
      </CapabilityProvider>
    </BrowserRouter>
  </StrictMode>,
)
