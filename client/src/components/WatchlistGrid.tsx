import { Trash2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { typeLabel } from '../lib/format'
import type { WatchlistItem } from '../types'
import PosterCard from './PosterCard'
import TitleImage from './ui/TitleImage'

interface WatchlistGridProps {
  items: WatchlistItem[]
  view: 'grid' | 'list'
  onRemove: (titleId: number) => void
}

export default function WatchlistGrid({ items, view, onRemove }: WatchlistGridProps) {
  if (view === 'grid') {
    return (
      <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {items.map((item) => (
          <PosterCard
            key={item.titleId}
            item={{
              id: item.titleId,
              title: item.title,
              year: item.year,
              type: item.type,
            }}
            posterUrl={item.poster}
            action={
              <button
                type="button"
                onClick={() => onRemove(item.titleId)}
                aria-label={`Remove ${item.title} from watchlist`}
                className="flex h-8 w-8 items-center justify-center bg-bg/85 text-muted transition-colors hover:text-primary"
              >
                <Trash2 size={14} aria-hidden="true" />
              </button>
            }
          />
        ))}
      </div>
    )
  }

  return (
    <ul className="divide-y divide-line border-y border-line">
      {items.map((item) => (
        <li key={item.titleId} className="flex items-center gap-4 py-4">
          <Link
            to={`/title/${item.titleId}`}
            className="h-[72px] w-12 shrink-0 overflow-hidden"
            tabIndex={-1}
            aria-hidden="true"
          >
            <TitleImage
              src={item.poster}
              alt=""
              title={item.title}
              className="h-full w-full"
              imageClassName="h-full w-full object-cover"
              loadingLabel="No art"
            />
          </Link>

          <div className="min-w-0 flex-1">
            <Link
              to={`/title/${item.titleId}`}
              className="block truncate text-sm font-medium text-white transition-colors hover:text-white/80"
            >
              {item.title}
            </Link>
            <p className="mt-1 text-[11px] text-muted">
              {[item.year, typeLabel(item.type)].filter(Boolean).join(' · ')}
            </p>
          </div>

          <button
            type="button"
            onClick={() => onRemove(item.titleId)}
            aria-label={`Remove ${item.title} from watchlist`}
            className="flex h-9 w-9 shrink-0 items-center justify-center text-muted transition-colors hover:text-primary"
          >
            <Trash2 size={16} aria-hidden="true" />
          </button>
        </li>
      ))}
    </ul>
  )
}
