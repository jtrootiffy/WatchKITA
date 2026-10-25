import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { typeLabel } from '../lib/format'
import { usePoster } from '../lib/posters'
import type { TitleSummary } from '../types'
import TitleImage from './ui/TitleImage'

interface PosterCardProps {
  item: TitleSummary
  posterUrl?: string | null
  layout?: 'rail' | 'grid'
  priority?: boolean
  action?: ReactNode
}

export default function PosterCard({
  item,
  posterUrl,
  layout = 'grid',
  priority = false,
  action,
}: PosterCardProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const element = containerRef.current
    if (!element) return

    if (typeof IntersectionObserver === 'undefined') {
      setVisible(true)
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisible(true)
          observer.disconnect()
        }
      },
      { rootMargin: '320px 0px' },
    )

    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  const shouldFetch = visible && !posterUrl
  const fetched = usePoster(shouldFetch ? item.id : undefined, item.type)
  const poster = posterUrl ?? fetched?.poster ?? null
  const isLoading = shouldFetch && fetched === undefined

  return (
    <article
      ref={containerRef}
      className={`group relative ${layout === 'rail' ? 'w-[148px] shrink-0 sm:w-[168px] lg:w-[188px]' : 'w-full'}`}
    >
      <Link to={`/title/${item.id}?type=${item.type}`} className="block focus:outline-none">
        <div className="relative aspect-[2/3] overflow-hidden bg-surface">
          {isLoading ? (
            <div className="h-full w-full animate-pulse bg-surface" aria-hidden="true" />
          ) : (
            <div className="h-full w-full transition-transform duration-300 ease-editorial group-hover:scale-[1.035] group-focus-visible:scale-[1.035]">
              <TitleImage
                src={poster}
                alt={`${item.title} poster`}
                title={item.title}
                priority={priority}
                imageClassName="h-full w-full object-cover"
              />
            </div>
          )}

          <span className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-[2px] origin-left scale-x-0 bg-primary transition-transform duration-300 ease-editorial group-hover:scale-x-100 group-focus-within:scale-x-100" />

          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 translate-y-1 bg-bg/90 px-3 py-2 opacity-0 transition-all duration-300 ease-editorial group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:translate-y-0 group-focus-within:opacity-100">
            <p className="text-[9px] uppercase tracking-widest text-muted">
              {typeLabel(item.type)}
              {item.year ? ` · ${item.year}` : ''}
            </p>
          </div>
        </div>

        <div className="mt-2.5">
          <h3 className="line-clamp-2 text-[13px] font-medium leading-snug text-white/90 transition-colors group-hover:text-white">
            {item.title}
          </h3>
          <p className="mt-1 text-[11px] text-muted">
            {[item.year, typeLabel(item.type)].filter(Boolean).join(' · ')}
          </p>
        </div>
      </Link>

      {action ? <div className="absolute right-2 top-2 z-30">{action}</div> : null}
    </article>
  )
}
