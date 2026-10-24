import { useEffect, useState } from 'react'
import { Menu, Search } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import RegionSelector from './RegionSelector'
import MobileNavigation from './MobileNavigation'
import { useWatchlist } from '../context/WatchlistContext'

interface NavbarProps {
  onSearchClick: () => void
}

const NAV_ITEMS = [
  { label: 'Home', to: '/' },
  { label: 'Movies', to: '/movies' },
  { label: 'TV Shows', to: '/tv-shows' },
  { label: 'Discover', to: '/discover' },
  { label: 'Watchlist', to: '/watchlist' },
]

export default function Navbar({ onSearchClick }: NavbarProps) {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const location = useLocation()
  const { count } = useWatchlist()

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 12)
    handleScroll()
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const isActive = (path: string) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path)

  return (
    <>
      <header
        className={`fixed inset-x-0 top-0 z-50 transition-colors duration-300 ${
          scrolled ? 'border-b border-line bg-bg' : 'border-b border-transparent bg-transparent'
        }`}
      >
        <div className="shell">
          <div className="flex h-16 items-center justify-between gap-6 lg:h-20">
            <Link
              to="/"
              className="flex shrink-0 items-center gap-2.5"
              aria-label="WatchKITA home"
            >
              <span className="block h-2.5 w-2.5 bg-primary" aria-hidden="true" />
              <span className="text-[13px] font-semibold uppercase tracking-editorial text-white sm:text-sm">
                WatchKITA
              </span>
            </Link>

            <nav aria-label="Main" className="hidden lg:block">
              <ul className="flex items-center gap-8">
                {NAV_ITEMS.map((item) => {
                  const active = isActive(item.to)
                  return (
                    <li key={item.to}>
                      <Link
                        to={item.to}
                        aria-current={active ? 'page' : undefined}
                        className={`relative flex items-center gap-1.5 py-2 text-[11px] uppercase tracking-widest transition-colors ${
                          active ? 'text-white' : 'text-muted hover:text-white'
                        }`}
                      >
                        {item.label}
                        {item.to === '/watchlist' && count > 0 ? (
                          <span className="text-[9px] text-primary" aria-label={`${count} saved titles`}>
                            {count}
                          </span>
                        ) : null}
                        {active ? (
                          <motion.span
                            layoutId="nav-active"
                            className="absolute inset-x-0 -bottom-0.5 h-[2px] bg-primary"
                            transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
                          />
                        ) : null}
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </nav>

            <div className="flex items-center gap-2 sm:gap-3">
              <RegionSelector className="hidden sm:block" />
              <button
                type="button"
                onClick={onSearchClick}
                aria-label="Search titles"
                className="flex h-10 w-10 items-center justify-center text-muted transition-colors hover:text-white"
              >
                <Search size={18} aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => setMenuOpen(true)}
                aria-label="Open menu"
                aria-expanded={menuOpen}
                className="flex h-10 w-10 items-center justify-center text-muted transition-colors hover:text-white lg:hidden"
              >
                <Menu size={20} aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <MobileNavigation
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        onSearch={onSearchClick}
      />
    </>
  )
}
