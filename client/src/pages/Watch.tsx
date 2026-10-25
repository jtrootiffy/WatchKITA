import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Check, Plus } from 'lucide-react'
import { ApiError, errorMessage } from '@/lib/api'
import {
  buildWatchTvUrl,
  parseWatchRoute,
  type CineSrcMediaType,
} from '@/lib/player'
import { formatAirDate, runtimeLabel, typeLabel } from '@/lib/format'
import { type TitleType } from '@/types'
import { useTmdbMovieQuery, useTmdbSeriesQuery, useTmdbSeasonQuery } from '@/lib/queries'
import { useWatchlist } from '@/context/WatchlistContext'
import { useToast } from '@/context/ToastContext'
import CineSrcPlayer from '@/components/player/CineSrcPlayer'
import ErrorState from '@/components/ErrorState'
import EmptyState from '@/components/EmptyState'
import { Button, ButtonLink } from '@/components/ui/Button'
import TitleImage from '@/components/ui/TitleImage'

interface WatchPageData {
  mediaType: CineSrcMediaType
  tmdbId: number
  title: string
  year: number | null
  overview: string | null
  poster: string | null
  backdrop: string | null
  genres: string[]
  runtimeMinutes: number | null
  seasons: { seasonNumber: number; name: string | null; episodeCount: number }[]
  episodes: {
    seasonNumber: number
    episodeNumber: number
    name: string
    airDate: string | null
    runtimeMinutes: number | null
    overview: string | null
  }[]
  backUrl: string
  watchlistItem: {
    titleId: number
    title: string
    year: number | null
    type: TitleType
    poster: string | null
  } | null
}

export default function Watch() {
  const location = useLocation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { has, toggle } = useWatchlist()
  const { addToast } = useToast()

  const parsed = parseWatchRoute(location.pathname, location.search)
  const backUrl = searchParams.get('back') ?? '/discover'
  const queryTitle = searchParams.get('title') ?? ''
  const queryYearRaw = searchParams.get('year')
  const queryYear = queryYearRaw ? Number.parseInt(queryYearRaw, 10) : null
  const queryPoster = searchParams.get('poster') || undefined

  if (!parsed) {
    return (
      <div className="shell pt-32 pb-20">
        <EmptyState
          title="Invalid watch link"
          description="The watch link does not contain a valid movie or TV show id."
          action={<ButtonLink to="/discover">Browse the catalog</ButtonLink>}
        />
      </div>
    )
  }

  const { mediaType, tmdbId } = parsed
  const isMovie = mediaType === 'movie'
  const isTvTitle = mediaType === 'tv'
  const saved = has(tmdbId)

  const defaultSeason = parsed.season ?? 1
  const defaultEpisode = parsed.episode ?? 1
  const [selectedSeason, setSelectedSeason] = useState(defaultSeason)
  const [selectedEpisode, setSelectedEpisode] = useState(defaultEpisode)

  useEffect(() => {
    setSelectedSeason(defaultSeason)
    setSelectedEpisode(defaultEpisode)
  }, [defaultSeason, defaultEpisode])

  const movieQuery = useTmdbMovieQuery(isMovie ? tmdbId : undefined, Boolean(isMovie && tmdbId))
  const seriesQuery = useTmdbSeriesQuery(
    isTvTitle ? tmdbId : undefined,
    Boolean(isTvTitle && tmdbId),
  )
  const seasonQuery = useTmdbSeasonQuery(
    isTvTitle ? tmdbId : undefined,
    selectedSeason,
    Boolean(isTvTitle && selectedSeason !== null),
  )

  const movieData = movieQuery.data
  const seriesData = seriesQuery.data
  const episodes = seasonQuery.data

  const isLoading =
    (isMovie ? movieQuery.isLoading : seriesQuery.isLoading) ||
    (isTvTitle ? seasonQuery.isLoading : false)

  const data = useMemo<WatchPageData | null>(() => {
    if (isMovie) {
      if (!movieData) return null
      return {
        mediaType: 'movie',
        tmdbId: movieData.tmdbId,
        title: queryTitle || movieData.title,
        year: queryYear ?? movieData.year,
        overview: movieData.overview,
        poster: queryPoster ?? movieData.poster,
        backdrop: movieData.backdrop,
        genres: movieData.genres,
        runtimeMinutes: movieData.runtimeMinutes,
        seasons: [],
        episodes: [],
        backUrl,
        watchlistItem: {
          titleId: tmdbId,
          title: queryTitle || movieData.title,
          year: queryYear ?? movieData.year,
          type: 'movie' as TitleType,
          poster: queryPoster ?? movieData.poster,
        },
      }
    }

    if (!seriesData) return null

    const episodeList =
      episodes?.map((ep) => ({
        seasonNumber: ep.seasonNumber,
        episodeNumber: ep.episodeNumber,
        name: ep.name,
        airDate: ep.airDate,
        runtimeMinutes: ep.runtimeMinutes,
        overview: ep.overview,
      })) ?? []

    return {
      mediaType: 'tv',
      tmdbId: seriesData.tmdbId,
      title: queryTitle || seriesData.title,
      year: queryYear ?? seriesData.year,
      overview: seriesData.overview,
      poster: queryPoster ?? seriesData.poster,
      backdrop: seriesData.backdrop,
      genres: seriesData.genres,
      runtimeMinutes: seriesData.runtimeMinutes,
      seasons: seriesData.seasons.map((s) => ({
        seasonNumber: s.seasonNumber,
        name: s.name,
        episodeCount: s.episodeCount,
      })),
      episodes: episodeList,
      backUrl,
      watchlistItem: {
        titleId: tmdbId,
        title: queryTitle || seriesData.title,
        year: queryYear ?? seriesData.year,
        type: 'tv' as TitleType,
        poster: queryPoster ?? seriesData.poster,
      },
    }
  }, [
    isMovie,
    isTvTitle,
    tmdbId,
    movieData,
    seriesData,
    episodes,
    queryTitle,
    queryYear,
    queryPoster,
    backUrl,
    selectedSeason,
  ])

  const currentEpisode = data?.episodes.find(
    (ep) => ep.seasonNumber === selectedSeason && ep.episodeNumber === selectedEpisode,
  )
  const activeSeason = data?.seasons.find((s) => s.seasonNumber === selectedSeason)

  const allEpisodes = data?.episodes ?? []
  const currentIndex = allEpisodes.findIndex(
    (ep) => ep.seasonNumber === selectedSeason && ep.episodeNumber === selectedEpisode,
  )
  const previousEpisode = currentIndex > 0 ? allEpisodes[currentIndex - 1] : null
  const nextEpisode = currentIndex >= 0 && currentIndex < allEpisodes.length - 1 ? allEpisodes[currentIndex + 1] : null

  const goBack = useCallback(() => {
    if (backUrl && backUrl !== '/discover') {
      navigate(backUrl)
    } else {
      navigate(-1)
    }
  }, [backUrl, navigate])

  const handleWatchlist = useCallback(() => {
    if (!data?.watchlistItem) return
    toggle(data.watchlistItem)
  }, [data, toggle])

  const handleSelectEpisode = useCallback(
    (seasonNumber: number, episodeNumber: number) => {
      setSelectedSeason(seasonNumber)
      setSelectedEpisode(episodeNumber)
      const url = buildWatchTvUrl(tmdbId, seasonNumber, episodeNumber)
      navigate(url, { replace: true })
    },
    [tmdbId, navigate],
  )

  const handlePreviousEpisode = useCallback(() => {
    if (!previousEpisode) return
    handleSelectEpisode(previousEpisode.seasonNumber, previousEpisode.episodeNumber)
  }, [previousEpisode, handleSelectEpisode])

  const handleNextEpisode = useCallback(() => {
    if (!nextEpisode) return
    handleSelectEpisode(nextEpisode.seasonNumber, nextEpisode.episodeNumber)
  }, [nextEpisode, handleSelectEpisode])

  const handlePlayerError = useCallback((message: string) => {
    addToast(`Playback error: ${message}`, 'error')
  }, [addToast])

  const handlePlayerClose = useCallback(() => {
    goBack()
  }, [goBack])

  if (!parsed) return null

  if (movieQuery.isError || seriesQuery.isError || seasonQuery.isError) {
    const error = movieQuery.error ?? seriesQuery.error ?? seasonQuery.error
    return (
      <div className="shell pt-28 pb-20">
        <ErrorState
          title="This title could not be loaded"
          message={
            error instanceof ApiError ? error.message : errorMessage(error)
          }
          onRetry={() => {
            void movieQuery.refetch()
            void seriesQuery.refetch()
            void seasonQuery.refetch()
          }}
        />
      </div>
    )
  }

  if (isLoading || !data) {
    return (
      <div className="shell pt-28 pb-20">
        <div className="flex flex-col items-center justify-center min-h-[400px]" aria-hidden="true">
          <div className="h-8 w-40 animate-pulse bg-raised mb-6" />
          <div className="h-4 w-full max-w-md animate-pulse bg-raised" />
        </div>
      </div>
    )
  }

  return (
    <article className="watch-page">
      <header className="shell pt-20 sm:pt-28 pb-4 sm:pb-6 lg:pt-36 lg:pb-8">
        <div className="flex flex-wrap items-center justify-between gap-2.5 sm:gap-3">
          <Button variant="ghost" size="sm" onClick={goBack}>
            <ArrowLeft size={16} aria-hidden="true" />
            Back
          </Button>

          <Button
            variant={saved ? 'secondary' : 'primary'}
            size="sm"
            onClick={handleWatchlist}
            aria-pressed={saved}
          >
            {saved ? <Check size={16} aria-hidden="true" /> : <Plus size={16} aria-hidden="true" />}
            {saved ? 'In watchlist' : 'Add to watchlist'}
          </Button>
        </div>

        <div className="mt-4 sm:mt-6 max-w-4xl">
          <p className="eyebrow">
            {typeLabel(isMovie ? 'movie' : 'tv')}
            {data.year ? ` · ${data.year}` : ''}
          </p>
          <h1 className="mt-2 sm:mt-3 font-serif text-2xl leading-tight text-white sm:text-4xl lg:text-5xl">
            {data.title}
          </h1>
        </div>
      </header>

      <CineSrcPlayer
        mediaType={data.mediaType}
        tmdbId={data.tmdbId}
        season={isTvTitle ? selectedSeason : undefined}
        episode={isTvTitle ? selectedEpisode : undefined}
        autoplay
        onError={handlePlayerError}
        onClose={handlePlayerClose}
      />

      <div className="shell pt-8 sm:pt-12 lg:pt-16 pb-16 sm:pb-20 lg:pb-24">
        <div className="grid gap-6 sm:gap-8 lg:grid-cols-[240px_1fr] lg:gap-12">
          <div className="flex justify-center sm:justify-start">
            <div className="aspect-[2/3] w-36 sm:w-48 lg:w-full max-w-[240px] overflow-hidden bg-surface rounded-lg shadow-lg">
              <TitleImage
                src={data.poster}
                alt={`${data.title} poster`}
                title={data.title}
                className="h-full w-full"
                imageClassName="h-full w-full object-cover"
                priority
              />
            </div>
          </div>

          <div className="pt-2 lg:pt-0">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted">
              {data.year ? <span>{data.year}</span> : null}
              {runtimeLabel(data.runtimeMinutes) ? (
                <span>{runtimeLabel(data.runtimeMinutes)}</span>
              ) : null}
            </div>

            {data.genres.length > 0 ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {data.genres.map((genre) => (
                  <span
                    key={genre}
                    className="border border-line px-2.5 py-1 text-[11px] text-muted"
                  >
                    {genre}
                  </span>
                ))}
              </div>
            ) : null}

            {data.overview ? (
              <div className="mt-7 max-w-3xl">
                <h3 className="eyebrow">Synopsis</h3>
                <p className="mt-3 text-sm leading-relaxed text-white/80 sm:text-base">
                  {data.overview}
                </p>
              </div>
            ) : null}

            {isTvTitle ? (
              <>
                <div className="mt-8 sm:mt-10 border-t border-line pt-6 sm:pt-8">
                  <p className="eyebrow">Seasons &amp; episodes</p>
                  <div className="mt-3 sm:mt-4 flex flex-wrap gap-1.5 sm:gap-2" role="group" aria-label="Seasons">
                    {data.seasons.map((season) => (
                      <button
                        key={season.seasonNumber}
                        type="button"
                        aria-pressed={season.seasonNumber === selectedSeason}
                        onClick={() => {
                          setSelectedSeason(season.seasonNumber)
                          setSelectedEpisode(1)
                          const url = buildWatchTvUrl(tmdbId, season.seasonNumber, 1)
                          navigate(url, { replace: true })
                        }}
                        className={`h-8 sm:h-9 shrink-0 border px-2.5 sm:px-3 text-xs transition-colors ${
                          season.seasonNumber === selectedSeason
                            ? 'border-primary bg-primary text-white'
                            : 'border-line text-muted hover:border-muted hover:text-white'
                        }`}
                      >
                        {season.name || `Season ${season.seasonNumber}`}
                      </button>
                    ))}
                  </div>

                  {activeSeason && data.episodes.length > 0 ? (
                    <>
                      <div className="mt-5 sm:mt-6">
                        <p className="eyebrow">
                          Season {selectedSeason} · {data.episodes.length} episodes
                        </p>
                        <div className="mt-2 flex flex-wrap gap-1.5 sm:gap-2">
                          {data.episodes.map((ep) => (
                            <button
                              key={`${ep.seasonNumber}-${ep.episodeNumber}`}
                              type="button"
                              aria-pressed={
                                ep.seasonNumber === selectedSeason &&
                                ep.episodeNumber === selectedEpisode
                              }
                              onClick={() => handleSelectEpisode(ep.seasonNumber, ep.episodeNumber)}
                              className={`shrink-0 border px-2.5 sm:px-3 py-1 sm:py-1.5 text-xs min-w-[38px] text-center transition-colors ${
                                ep.seasonNumber === selectedSeason &&
                                ep.episodeNumber === selectedEpisode
                                  ? 'border-primary bg-primary text-white'
                                  : 'border-line text-muted hover:border-muted hover:text-white'
                              }`}
                            >
                              E{String(ep.episodeNumber).padStart(2, '0')}
                            </button>
                          ))}
                        </div>
                      </div>

                      {currentEpisode ? (
                        <div className="mt-8 border-t border-line pt-6">
                          <h3 className="font-serif text-xl text-white sm:text-2xl">
                            {currentEpisode.name}
                          </h3>
                          {currentEpisode.overview ? (
                            <p className="mt-3 text-sm leading-relaxed text-muted max-w-xl">
                              {currentEpisode.overview}
                            </p>
                          ) : null}
                          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted">
                            <span>
                              S{String(currentEpisode.seasonNumber).padStart(2, '0')}E
                              {String(currentEpisode.episodeNumber).padStart(2, '0')}
                            </span>
                            {currentEpisode.airDate ? (
                              <span>{formatAirDate(currentEpisode.airDate)}</span>
                            ) : null}
                            {currentEpisode.runtimeMinutes ? (
                              <span>{runtimeLabel(currentEpisode.runtimeMinutes)}</span>
                            ) : null}
                          </div>
                          <div className="mt-6 flex items-center gap-3">
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={handlePreviousEpisode}
                              disabled={!previousEpisode}
                            >
                              <ArrowLeft size={14} aria-hidden="true" />
                              Previous
                            </Button>
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={handleNextEpisode}
                              disabled={!nextEpisode}
                            >
                              Next
                              <ArrowLeft size={14} aria-hidden="true" className="rotate-180" />
                            </Button>
                          </div>
                        </div>
                      ) : null}
                    </>
                  ) : !activeSeason ? (
                    <p className="mt-6 text-muted">No season data available for this selection.</p>
                  ) : (
                    <p className="mt-6 text-muted">No episodes are listed for this season.</p>
                  )}
                </div>
              </>
            ) : null}

          </div>
        </div>
      </div>
    </article>
  )
}
