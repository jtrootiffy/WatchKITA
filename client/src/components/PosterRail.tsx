import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import PosterCard from './PosterCard'
import { PosterRailSkeleton } from './LoadingSkeleton'
import type { TitleSummary } from '../types'

interface PosterRailProps {
  title: string
  description?: string
  items: TitleSummary[]
  viewAllLink?: string
  viewAllLabel?: string
  isLoading?: boolean
  isError?: boolean
  headerExtra?: ReactNode
}

export default function PosterRail({
  title,
  description,
  items,
  viewAllLink,
  viewAllLabel = 'View all',
  isLoading = false,
  isError = false,
  headerExtra,
}: PosterRailProps) {
  const trackRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  const updateScrollState = useCallback(() => {
    const track = trackRef.current
    if (!track) return
    setCanScrollLeft(track.scrollLeft > 8)
    setCanScrollRight(track.scrollLeft + track.clientWidth < track.scrollWidth - 8)
  }, [])

  useEffect(() => {
    updateScrollState()
    const track = trackRef.current
    if (!track) return

    track.addEventListener('scroll', updateScrollState, { passive: true })
    window.addEventListener('resize', updateScrollState)
    return () => {
      track.removeEventListener('scroll', updateScrollState)
      window.removeEventListener('resize', updateScrollState)
    }
  }, [items, updateScrollState])

  const scroll = (direction: 'left' | 'right') => {
    const track = trackRef.current
    if (!track) return
    track.scrollBy({
      left: direction === 'left' ? -track.clientWidth * 0.8 : track.clientWidth * 0.8,
      behavior: 'smooth',
    })
  }

  if (isLoading) return <PosterRailSkeleton />

  return (
    <section className="py-8 sm:py-10" aria-labelledby={`rail-${title.replace(/\s+/g, '-').toLowerCase()}`}>
      <div className="shell">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <span className="h-[2px] w-5 shrink-0 bg-primary" aria-hidden="true" />
              <h2
                id={`rail-${title.replace(/\s+/g, '-').toLowerCase()}`}
                className="truncate font-serif text-xl text-white sm:text-2xl"
              >
                {title}
              </h2>
            </div>
            {description ? <p className="mt-2 text-xs text-muted sm:text-sm">{description}</p> : null}
            {headerExtra ? <div className="mt-4">{headerExtra}</div> : null}
          </div>

          <div className="flex shrink-0 items-center gap-3">
            {viewAllLink ? (
              <Link
                to={viewAllLink}
                className="text-[11px] uppercase tracking-widest text-muted transition-colors hover:text-white"
              >
                {viewAllLabel}
              </Link>
            ) : null}

            <div className="hidden items-center gap-1.5 lg:flex">
              <button
                type="button"
                onClick={() => scroll('left')}
                disabled={!canScrollLeft}
                aria-label={`Scroll ${title} left`}
                className="flex h-8 w-8 items-center justify-center border border-line text-muted transition-colors hover:border-muted hover:text-white disabled:opacity-30"
              >
                <ChevronLeft size={16} aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => scroll('right')}
                disabled={!canScrollRight}
                aria-label={`Scroll ${title} right`}
                className="flex h-8 w-8 items-center justify-center border border-line text-muted transition-colors hover:border-muted hover:text-white disabled:opacity-30"
              >
                <ChevronRight size={16} aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>

        {items.length === 0 ? (
          <p className="border-t border-line py-10 text-sm text-muted">
            {isError
              ? 'This collection could not be loaded right now.'
              : 'No titles are available for this collection in the selected region.'}
          </p>
        ) : (
          <div ref={trackRef} className="rail-track" role="list" aria-label={title}>
            {items.map((item, index) => (
              <div key={item.id} className="rail-item" role="listitem">
                <PosterCard item={item} layout="rail" priority={index < 4} />
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
