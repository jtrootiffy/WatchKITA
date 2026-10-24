import { useEffect, useState } from 'react'
import { formatAirDate, runtimeLabel } from '../lib/format'
import { useEpisodesQuery } from '../lib/queries'
import type { SeasonSummary } from '../types'
import EmptyState from './EmptyState'
import ErrorState from './ErrorState'
import { EpisodeListSkeleton } from './LoadingSkeleton'

interface SeasonsEpisodesProps {
  titleId: number
  seasons: SeasonSummary[] | undefined
  isLoading: boolean
  isError: boolean
  onRetry?: () => void
}

export default function SeasonsEpisodes({
  titleId,
  seasons,
  isLoading,
  isError,
  onRetry,
}: SeasonsEpisodesProps) {
  const [selectedSeason, setSelectedSeason] = useState<number | null>(null)

  useEffect(() => {
    if (selectedSeason === null && seasons && seasons.length > 0) {
      setSelectedSeason(seasons[0].number)
    }
  }, [seasons, selectedSeason])

  const episodes = useEpisodesQuery(titleId, selectedSeason)
  const activeSeason = seasons?.find((season) => season.number === selectedSeason) ?? null

  return (
    <section className="border-t border-line pt-10">
      <p className="eyebrow">Episodes</p>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
        <h2 className="font-serif text-2xl text-white sm:text-3xl">Seasons &amp; episodes</h2>
        {activeSeason ? (
          <p className="text-[11px] uppercase tracking-widest text-muted">
            {activeSeason.episodeCount} episodes
          </p>
        ) : null}
      </div>

      {isLoading ? (
        <div className="mt-6 flex gap-2" aria-hidden="true">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-9 w-24 animate-pulse bg-raised" />
          ))}
        </div>
      ) : isError ? (
        <div className="mt-6">
          <ErrorState
            compact
            title="Seasons could not be loaded"
            message="Episode data is unavailable for this title right now."
            onRetry={onRetry}
          />
        </div>
      ) : !seasons || seasons.length === 0 ? (
        <div className="mt-4">
          <EmptyState
            title="No season data available"
            description="Watchmode has no season listing for this title in the current catalog. Episode availability can lag behind a series announcement."
          />
        </div>
      ) : (
        <>
          <div className="mt-6 flex gap-2 overflow-x-auto hide-scrollbar pb-2" role="group" aria-label="Seasons">
            {seasons.map((season) => (
              <button
                key={season.id}
                type="button"
                aria-pressed={season.number === selectedSeason}
                onClick={() => setSelectedSeason(season.number)}
                className={`h-9 shrink-0 border px-3 text-xs transition-colors ${
                  season.number === selectedSeason
                    ? 'border-primary bg-primary text-white'
                    : 'border-line text-muted hover:border-muted hover:text-white'
                }`}
              >
                {season.name || `Season ${season.number}`}
              </button>
            ))}
          </div>

          {activeSeason?.overview ? (
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted">
              {activeSeason.overview}
            </p>
          ) : null}

          <div className="mt-6">
            {episodes.isLoading ? (
              <EpisodeListSkeleton />
            ) : episodes.isError ? (
              <ErrorState
                compact
                title="Episodes could not be loaded"
                message="The episode list for this season is unavailable right now."
                onRetry={() => void episodes.refetch()}
              />
            ) : (episodes.data ?? []).length === 0 ? (
              <p className="border-l-2 border-accent bg-surface px-4 py-3 text-sm text-muted">
                No episodes are listed for this season.
              </p>
            ) : (
              <ol className="divide-y divide-line border-y border-line">
                {(episodes.data ?? []).map((episode) => (
                  <li key={episode.id} className="flex gap-4 py-4">
                    {episode.thumbnailUrl ? (
                      <img
                        src={episode.thumbnailUrl}
                        alt=""
                        loading="lazy"
                        className="hidden h-[58px] w-[100px] shrink-0 object-cover sm:block"
                      />
                    ) : null}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                        <span className="text-[10px] uppercase tracking-widest text-accent">
                          S{String(episode.seasonNumber).padStart(2, '0')}E
                          {String(episode.episodeNumber).padStart(2, '0')}
                        </span>
                        <h3 className="text-sm font-medium text-white">{episode.name}</h3>
                      </div>
                      {episode.airDate || episode.runtimeMinutes ? (
                        <p className="mt-1 text-[11px] text-muted">
                          {[formatAirDate(episode.airDate), runtimeLabel(episode.runtimeMinutes)]
                            .filter(Boolean)
                            .join(' · ')}
                        </p>
                      ) : null}
                      {episode.overview ? (
                        <p className="mt-2 line-clamp-2 max-w-2xl text-xs leading-relaxed text-muted">
                          {episode.overview}
                        </p>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </>
      )}
    </section>
  )
}
