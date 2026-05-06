import { useEffect } from 'react'
import { performanceMonitor } from './performance-monitor/performance-monitor'
import PerformanceOverlay from './performance-monitor/PerformanceOverlay'
import { ElkLarkPage } from './pages/ElkLarkPage'

export default function App() {
  useEffect(() => {
    performanceMonitor.enable()
  }, [])

  return (
    <>
      <ElkLarkPage />
      <PerformanceOverlay />
    </>
  )
}
