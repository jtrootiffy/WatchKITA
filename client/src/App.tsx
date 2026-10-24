import { useState } from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import SearchOverlay from './components/SearchOverlay'
import ScrollToTop from './components/ScrollToTop'
import Home from './pages/Home'
import Movies from './pages/Movies'
import TVShows from './pages/TVShows'
import Discover from './pages/Discover'
import TitleDetails from './pages/TitleDetails'
import SearchResults from './pages/SearchResults'
import TmdbSearch from './pages/TmdbSearch'
import Watchlist from './pages/Watchlist'
import Watch from './pages/Watch'
import NotFound from './pages/NotFound'

export default function App() {
  const [searchOpen, setSearchOpen] = useState(false)
  const location = useLocation()
  const reducedMotion = useReducedMotion()

  return (
    <div className="flex min-h-screen flex-col bg-bg">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[200] focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:text-white"
      >
        Skip to content
      </a>

      <ScrollToTop />
      <Navbar onSearchClick={() => setSearchOpen(true)} />

      <main id="main" className="flex-1">
        <motion.div
          key={location.pathname}
          initial={reducedMotion ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        >
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/movies" element={<Movies />} />
            <Route path="/tv-shows" element={<TVShows />} />
            <Route path="/discover" element={<Discover />} />
            <Route path="/search" element={<SearchResults />} />
            <Route path="/tmdb-search" element={<TmdbSearch />} />
            <Route path="/title/:id" element={<TitleDetails />} />
            <Route path="/watch/movie/:tmdbId" element={<Watch />} />
            <Route path="/watch/tv/:tmdbId" element={<Watch />} />
            <Route path="/watchlist" element={<Watchlist />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </motion.div>
      </main>

      <Footer />
      <SearchOverlay isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  )
}
