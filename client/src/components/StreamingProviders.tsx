import { ExternalLink } from 'lucide-react'
import { groupSources } from '../lib/format'
import type { ViewingSource } from '../types'
import ErrorState from './ErrorState'

interface StreamingProvidersProps {
  sources: ViewingSource[]
  isLoading: boolean
  isError: boolean
  onRetry?: () => void
}

export default function StreamingProviders({
  sources,
  isLoading,
  isError,
  onRetry,
}: StreamingProvidersProps) {
  const groups = groupSources(sources)

  return (
    <section id="where-to-watch" className="scroll-mt-28 border-t border-line pt-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Availability</p>
          <h2 className="mt-3 font-serif text-2xl text-white sm:text-3xl">Where to watch</h2>
        </div>
      </div>

      {isLoading ? (
        <div className="mt-6 space-y-2" aria-hidden="true">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="h-[68px] animate-pulse bg-raised" />
          ))}
        </div>
      ) : isError ? (
        <div className="mt-6">
          <ErrorState
            compact
            title="Availability could not be loaded"
            message="The provider list for this title is unavailable right now."
            onRetry={onRetry}
          />
        </div>
      ) : sources.length === 0 ? (
        <div className="mt-6 border border-line p-6">
          <p className="text-sm text-white">
            No viewing options were found for this title.
          </p>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted">
            Availability data can be incomplete or change over time. Check back later.
          </p>
        </div>
      ) : (
        <div className="mt-6 space-y-8">
          {groups.map((group) => (
            <div key={group.type}>
              <div className="mb-3 flex items-center gap-3">
                <h3 className="text-[11px] uppercase tracking-widest text-white">{group.label}</h3>
                <span className="h-px flex-1 bg-line" aria-hidden="true" />
                <span className="text-[10px] text-muted">{group.sources.length}</span>
              </div>

              <ul className="grid gap-2 sm:grid-cols-2">
                {group.sources.map((source) => {
                  return (
                    <li key={`${source.sourceId}-${source.type}-${source.name}`}>
                      {source.webUrl ? (
                        <a
                          href={source.webUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="group flex h-full items-center justify-between gap-4 border border-line p-3.5 transition-colors hover:border-muted hover:bg-surface"
                        >
                          <span className="flex min-w-0 items-center gap-3">
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center bg-surface text-[10px] uppercase text-muted">
                              {source.name.slice(0, 2)}
                            </span>
                            <span className="min-w-0">
                              <span className="block truncate text-sm text-white">
                                {source.name}
                              </span>
                              <span className="mt-0.5 block text-[10px] uppercase tracking-widest text-muted">
                                {source.format ?? 'Provider'}
                              </span>
                            </span>
                          </span>
                          <span className="flex shrink-0 items-center gap-1.5 text-[10px] uppercase tracking-widest text-primary">
                            Watch
                            <ExternalLink size={12} aria-hidden="true" />
                          </span>
                        </a>
                      ) : (
                        <div className="flex items-center gap-3 border border-line p-3.5">
                          <span className="flex h-8 w-8 items-center justify-center bg-surface text-[10px] uppercase text-muted">
                            {source.name.slice(0, 2)}
                          </span>
                          <span className="text-sm text-white">{source.name}</span>
                        </div>
                      )}
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}

          <p className="max-w-2xl text-xs leading-relaxed text-muted/70">
            Links open the provider&apos;s own site. WatchKITA does not stream video, and a
            subscription, rental payment, or regional restriction may apply. Availability data is
            supplied by TMDB and can change.
          </p>
        </div>
      )}
    </section>
  )
}
