import { useEffect, useRef, type KeyboardEvent as ReactKeyboardEvent } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Search, X } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { EASE_OUT } from '../lib/motion'

interface MobileNavigationProps {
  open: boolean
  onClose: () => void
  onSearch: () => void
}

const NAV_ITEMS = [
  { label: 'Home', to: '/' },
  { label: 'Movies', to: '/movies' },
  { label: 'TV Shows', to: '/tv-shows' },
  { label: 'Discover', to: '/discover' },
  { label: 'Watchlist', to: '/watchlist' },
]

export default function MobileNavigation({ open, onClose, onSearch }: MobileNavigationProps) {
  const closeRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const location = useLocation()
  const reducedMotion = useReducedMotion()

  useEffect(() => {
    onClose()
    // Close the menu whenever the route changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname])

  useEffect(() => {
    if (!open) return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const focusTimer = setTimeout(() => closeRef.current?.focus(), 50)

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', handleKeyDown)
      clearTimeout(focusTimer)
    }
  }, [open, onClose])

  const isActive = (path: string) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path)

  const trapFocus = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Tab') return
    const focusables = panelRef.current?.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input',
    )
    if (!focusables || focusables.length === 0) return

    const first = focusables[0]
    const last = focusables[focusables.length - 1]

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  }

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          initial={reducedMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={reducedMotion ? undefined : { opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-[70] bg-bg lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Main menu"
          ref={panelRef}
          onKeyDown={trapFocus}
        >
          <div className="flex h-16 items-center justify-between border-b border-line px-4">
            <span className="flex items-center gap-2 text-[13px] font-semibold uppercase tracking-editorial">
              <span className="block h-2.5 w-2.5 bg-primary" aria-hidden="true" />
              WatchKITA
            </span>
            <button
              ref={closeRef}
              type="button"
              onClick={onClose}
              aria-label="Close menu"
              className="flex h-11 w-11 items-center justify-center text-muted transition-colors hover:text-white"
            >
              <X size={20} aria-hidden="true" />
            </button>
          </div>

          <motion.nav
            aria-label="Mobile"
            initial={reducedMotion ? false : { opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.28, ease: EASE_OUT }}
            className="flex h-[calc(100%-4rem)] flex-col justify-between overflow-y-auto px-4 py-8"
          >
            <ul className="space-y-1">
              {NAV_ITEMS.map((item, index) => (
                <li key={item.to}>
                  <Link
                    to={item.to}
                    className={`flex items-baseline gap-4 border-b border-line py-4 text-2xl ${
                      isActive(item.to) ? 'text-primary' : 'text-white'
                    }`}
                  >
                    <span className="text-[10px] uppercase tracking-widest text-muted">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <span className="font-serif">{item.label}</span>
                  </Link>
                </li>
              ))}
            </ul>

            <div className="mt-10 space-y-6">
              <button
                type="button"
                onClick={() => {
                  onClose()
                  onSearch()
                }}
                className="flex w-full items-center gap-3 border border-line px-4 py-3 text-sm text-white"
              >
                <Search size={16} aria-hidden="true" />
                Search movies and TV shows
              </button>

              <div className="border-t border-line pt-6">
                <p className="eyebrow mb-2">WatchKITA</p>
                <p className="text-xs text-muted leading-relaxed">
                  Cinematic streaming &amp; discovery guide. Let&rsquo;s watch, together.
                </p>
              </div>
            </div>
          </motion.nav>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
