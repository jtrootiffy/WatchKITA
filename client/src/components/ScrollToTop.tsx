import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

export default function ScrollToTop() {
  const { pathname, hash } = useLocation()

  useEffect(() => {
    if (hash) {
      const target = document.getElementById(hash.slice(1))
      if (target) {
        const timer = setTimeout(() => {
          target.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }, 60)
        return () => clearTimeout(timer)
      }
    }

    window.scrollTo(0, 0)
  }, [pathname, hash])

  return null
}
