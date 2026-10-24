import { useEffect, useMemo, useState } from 'react'
import { Grid2X2, List, Search, Trash2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useWatchlist } from '../context/WatchlistContext'
import EmptyState from '../components/EmptyState'
import WatchlistGrid from '../components/WatchlistGrid'
import { Button, ButtonLink } from '../components/ui/Button'

const VIEW_KEY = 'watchkita.watchlist-view'

export default function Watchlist() {
  const { items, count, remove, clear, cloudBackup } = useWatchlist()
  const [view, setView] = useState<'grid' | 'list'>(() => {
    try {
      return localStorage.getItem(VIEW_KEY) === 'list' ? 'list' : 'grid'
    } catch {
      return 'grid'
    }
  })
  const [query, setQuery] = useState('')
  const [confirming, setConfirming] = useState(false)

  useEffect(() => {
    try {
      localStorage.setItem(VIEW_KEY, view)
    } catch {
      // View preference is optional.
    }
  }, [view])

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase()
    if (!term) return items
    return items.filter((item) => item.title.toLowerCase().includes(term))
  }, [items, query])

  return (
    <div className="shell pb-20 pt-28 lg:pt-36">
      <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
        <div>
          <div className="flex items-center gap-3">
            <span className="h-[2px] w-6 bg-primary" aria-hidden="true" />
            <p className="eyebrow">Library</p>
          </div>
          <h1 className="mt-4 font-serif text-4xl leading-tight text-white sm:text-5xl">
            My watchlist
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted">
            {count} {count === 1 ? 'title' : 'titles'} saved.{' '}
            {cloudBackup
              ? 'Saved in this browser and mirrored to this deployment’s cloud store.'
              : 'Saved in this browser only, so it will not sync to other devices.'}
          </p>
        </div>

        {count > 0 ? (
          <Button
            variant="ghost"
            onClick={() => setConfirming(true)}
            className="self-start text-muted hover:text-primary sm:self-auto"
          >
            <Trash2 size={15} aria-hidden="true" />
            Clear watchlist
          </Button>
        ) : null}
      </div>

      {confirming ? (
        <div
          role="alertdialog"
          aria-label="Confirm clearing watchlist"
          className="mt-8 flex flex-col justify-between gap-4 border border-line bg-surface p-5 sm:flex-row sm:items-center"
        >
          <p className="text-sm text-white">
            Remove all {count} saved {count === 1 ? 'title' : 'titles'}? This cannot be undone.
          </p>
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={() => {
                clear()
                setConfirming(false)
                setQuery('')
              }}
            >
              Remove all
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setConfirming(false)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : null}

      {count > 0 ? (
        <div className="mt-8 flex flex-col gap-3 border-y border-line py-3 sm:flex-row sm:items-center sm:justify-between">
          <label className="flex h-9 flex-1 items-center gap-2 border border-line px-3 sm:max-w-xs">
            <Search size={14} className="text-muted" aria-hidden="true" />
            <span className="sr-only">Filter saved titles</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Filter saved titles"
              className="w-full bg-transparent text-sm text-white placeholder:text-muted/70 focus:outline-none"
            />
          </label>

          <div className="flex items-center gap-1 self-start sm:self-auto" role="group" aria-label="Watchlist view">
            <button
              type="button"
              aria-pressed={view === 'grid'}
              onClick={() => setView('grid')}
              className={`flex h-10 w-10 items-center justify-center border transition-colors ${
                view === 'grid'
                  ? 'border-primary bg-primary text-white'
                  : 'border-line text-muted hover:text-white'
              }`}
              aria-label="Grid view"
            >
              <Grid2X2 size={15} aria-hidden="true" />
            </button>
            <button
              type="button"
              aria-pressed={view === 'list'}
              onClick={() => setView('list')}
              className={`flex h-10 w-10 items-center justify-center border transition-colors ${
                view === 'list'
                  ? 'border-primary bg-primary text-white'
                  : 'border-line text-muted hover:text-white'
              }`}
              aria-label="List view"
            >
              <List size={15} aria-hidden="true" />
            </button>
          </div>
        </div>
      ) : null}

      <div className="mt-8">
        {count === 0 ? (
          <EmptyState
            title="Your watchlist is empty"
            description="Save films and series while you browse, then return here to check where each one is available."
            action={<ButtonLink to="/discover">Discover titles</ButtonLink>}
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            title="No saved titles match that filter"
            description={`Nothing in your watchlist matches “${query}”.`}
            action={
              <Button variant="secondary" onClick={() => setQuery('')}>
                Clear filter
              </Button>
            }
          />
        ) : (
          <WatchlistGrid items={filtered} view={view} onRemove={remove} />
        )}
      </div>

      {count > 0 ? (
        <p className="mt-10 border-t border-line pt-6 text-xs leading-relaxed text-muted/70">
          Your watchlist stays on this device unless cloud backup is configured for the deployment.{' '}
          <Link to="/discover" className="text-muted underline decoration-accent underline-offset-4 hover:text-white">
            Keep browsing
          </Link>
          .
        </p>
      ) : null}
    </div>
  )
}
