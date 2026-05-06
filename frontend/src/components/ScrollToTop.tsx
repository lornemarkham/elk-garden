import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

/** Scrolls the window to the top whenever the route pathname changes. */
export function ScrollToTop() {
  const { pathname } = useLocation()

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
    })
    return () => cancelAnimationFrame(id)
  }, [pathname])

  return null
}
