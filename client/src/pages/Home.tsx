import { useEffect, useMemo, useState } from 'react'
import { useQueries } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import FeaturedHero from '../components/FeaturedHero'
import PosterRail from '../components/PosterRail'
import { api } from '../lib/api'
import { useGenresQuery, useTitlesQuery, queryKeys } from '../lib/queries'
import type { TitleDetails } from '../types'

const CURRENT_YEAR = new Date().getFullYear()

export default function Home() {
  const [genreId, setGenreId] = useState<number | null>(null)

  const trending = useTitlesQuery({
    limit: 18,
    sortBy: 'popularity_desc',
  })

  const popularMovies = useTitlesQuery({
    types: ['movie'],
    limit: 14,
    sortBy: 'popularity_desc',
  })

  const popularTv = useTitlesQuery({
    types: ['tv'],
    limit: 14,
    sortBy: 'popularity_desc',
  })

  const recentlyReleased = useTitlesQuery({
    types: ['movie', 'tv'],
    limit: 14,
    sortBy: 'release_date_desc',
    year: CURRENT_YEAR,
  })

  const genres = useGenresQuery()

  useEffect(() => {
    if (genreId === null && genres.data && genres.data.length > 0) {
      const preferred = genres.data.find((genre) => genre.name === 'Drama') ?? genres.data[0]
      setGenreId(preferred.id)
    }
  }, [genres.data, genreId])

  const genrePicks = useTitlesQuery(
    {
      genreIds: genreId ? [genreId] : [],
      limit: 14,
      sortBy: 'popularity_desc',
    },
    genreId !== null,
  )

  const heroItems = useMemo(
    () =>
      (trending.data?.titles ?? [])
        .slice(0, 3)
        .map((title) => ({ id: title.id, type: title.type })),
    [trending.data],
  )

  const heroQueries = useQueries({
    queries: heroItems.map((item) => ({
      queryKey: queryKeys.title(item.id, item.type),
      queryFn: ({ signal }: { signal: AbortSignal }) => api.title(item.id, item.type, signal),
      staleTime: 60 * 60 * 1000,
      enabled: Boolean(item.id),
      retry: 1,
    })),
  })

  const slides = heroQueries
    .map((query) => query.data)
    .filter((details): details is TitleDetails => Boolean(details))

  const heroLoading =
    trending.isLoading ||
    (heroItems.length > 0 && slides.length === 0 && heroQueries.some((query) => query.isLoading))

  const pickedGenre = genres.data?.find((genre) => genre.id === genreId) ?? null
  const featuredGenres = (genres.data ?? []).slice(0, 6)

  return (
    <div>
      <FeaturedHero
        slides={slides}
        isLoading={heroLoading}
        onRetry={() => void trending.refetch()}
      />

      <PosterRail
        title="Trending & popular"
        description="The titles drawing the most attention across the catalog right now."
        items={trending.data?.titles ?? []}
        viewAllLink="/discover"
        isLoading={trending.isLoading}
        isError={trending.isError}
      />

      <PosterRail
        title="Popular movies"
        description="Feature films audiences are seeking out."
        items={popularMovies.data?.titles ?? []}
        viewAllLink="/movies"
        isLoading={popularMovies.isLoading}
        isError={popularMovies.isError}
      />

      <PosterRail
        title="Must-watch TV"
        description="Series and miniseries worth committing to."
        items={popularTv.data?.titles ?? []}
        viewAllLink="/tv-shows"
        isLoading={popularTv.isLoading}
        isError={popularTv.isError}
      />

      <PosterRail
        title="Recently released"
        description={`Titles with a ${CURRENT_YEAR} release, newest first.`}
        items={recentlyReleased.data?.titles ?? []}
        viewAllLink="/discover"
        isLoading={recentlyReleased.isLoading}
        isError={recentlyReleased.isError}
      />

      <PosterRail
        title="Top picks by genre"
        description={pickedGenre
            ? `Popular ${pickedGenre.name.toLowerCase()} titles.`
            : 'Popular titles in a genre of your choosing.'}
        items={genrePicks.data?.titles ?? []}
        viewAllLink={pickedGenre ? `/discover?genres=${pickedGenre.id}` : '/discover'}
        isLoading={genrePicks.isLoading || genres.isLoading}
        isError={genrePicks.isError}
        headerExtra={
          featuredGenres.length > 0 ? (
            <div className="flex flex-wrap gap-2" role="group" aria-label="Choose a genre">
              {featuredGenres.map((genre) => (
                <button
                  key={genre.id}
                  type="button"
                  aria-pressed={genre.id === genreId}
                  onClick={() => setGenreId(genre.id)}
                  className={`border border-line py-1.5 px-3 text-[11px] text-white transition-colors hover:border-primary hover:text-primary rounded-full text-xs capitalize transition-colors ${
                    genre.id === genreId
                      ? 'bg-primary text-white'
                      : 'bg-surface text-muted hover:border-primary hover:text-primary'
                  }`}
                >
                  {genre.name}
                </button>
              ))}
            </div>
          ) : null
        }
      />

      <section className="mt-6 border-t border-line">
        <div className="shell flex flex-col items-start justify-between gap-6 py-12 sm:flex-row sm:items-end">
          <div>
            <p className="eyebrow">Keep exploring</p>
            <h2 className="mt-3 max-w-md font-serif text-3xl leading-tight text-white">
              Build a shortlist you will actually watch.
            </h2>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-muted">
              Save titles to your watchlist while you browse.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              to="/discover"
              className="inline-flex h-11 items-center bg-primary px-5 text-sm font-medium text-white transition-colors hover:bg-primary/90"
            >
              Browse the catalog
            </Link>
            <Link
              to="/watchlist"
              className="inline-flex h-11 items-center border border-line px-5 text-sm text-white transition-colors hover:border-muted hover:bg-surface"
            >
              Open watchlist
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
