import { Link } from 'react-router-dom'

export default function Footer() {
  return (
    <footer className="mt-16 border-t border-line">
      <div className="shell py-12">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <Link to="/" className="inline-flex items-center gap-2" aria-label="WatchKITA home">
              <span className="block h-2.5 w-2.5 bg-primary" aria-hidden="true" />
              <span className="text-[13px] font-semibold uppercase tracking-editorial">WatchKITA</span>
            </Link>
            <p className="mt-5 max-w-sm text-sm leading-relaxed text-muted">
              A curated discovery guide for films and series. Metadata and where-to-watch
              availability are supplied by the Watchmode API.
            </p>
            <p className="mt-4 max-w-sm text-xs leading-relaxed text-muted/70">
              WatchKITA does not host or stream video. Availability may be incomplete or change
              over time, and some options require a subscription in your region.
            </p>
          </div>

          <nav aria-label="Browse">
            <h2 className="eyebrow">Browse</h2>
            <ul className="mt-5 space-y-3 text-sm">
              <li>
                <Link to="/movies" className="text-muted transition-colors hover:text-white">
                  Movies
                </Link>
              </li>
              <li>
                <Link to="/tv-shows" className="text-muted transition-colors hover:text-white">
                  TV Shows
                </Link>
              </li>
              <li>
                <Link to="/discover" className="text-muted transition-colors hover:text-white">
                  Discover
                </Link>
              </li>
            </ul>
          </nav>

          <nav aria-label="Library">
            <h2 className="eyebrow">Library</h2>
            <ul className="mt-5 space-y-3 text-sm">
              <li>
                <Link to="/watchlist" className="text-muted transition-colors hover:text-white">
                  Watchlist
                </Link>
              </li>
              <li>
                <a
                  href="https://www.watchmode.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted transition-colors hover:text-white"
                >
                  Watchmode data
                </a>
              </li>
            </ul>
            <p className="mt-5 text-xs leading-relaxed text-muted/70">
              Your watchlist is saved in this browser.
            </p>
          </nav>
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-line pt-6 text-xs text-muted/70 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} WatchKITA.</p>
          <p>Data and artwork via Watchmode and its partners.</p>
        </div>
      </div>
    </footer>
  )
}
