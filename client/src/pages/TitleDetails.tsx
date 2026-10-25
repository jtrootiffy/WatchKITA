import { useEffect } from 'react'
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Check, ExternalLink, Play, Plus, Share2 } from 'lucide-react'
import { ApiError, errorMessage } from '../lib/api'
import { buildWatchUrl } from '@/lib/player'
import { criticScoreLabel, isTv, runtimeLabel, typeLabel, userRatingLabel } from '../lib/format'
import {
  useCastQuery,
  useSeasonsQuery,
  useSourcesQuery,
  useTitleQuery,
} from '../lib/queries'
import { useWatchlist } from '../context/WatchlistContext'
import { useToast } from '../context/ToastContext'
import CastCrewSection from '../components/CastCrewSection'
import EmptyState from '../components/EmptyState'
import ErrorState from '../components/ErrorState'
import SeasonsEpisodes from '../components/SeasonsEpisodes'
import SimilarTitles from '../components/SimilarTitles'
import StreamingProviders from '../components/StreamingProviders'
import TitleImage from '../components/ui/TitleImage'
import { Button, ButtonAnchor, ButtonLink } from '../components/ui/Button'
import { DetailsSkeleton } from '../components/LoadingSkeleton'

export default function TitleDetails() {
  const { id: idParam } = useParams<{ id: string }>()
  const id = Number.parseInt(idParam ?? '', 10)
  const validId = Number.isInteger(id) && id > 0 ? id : undefined

  const { has, toggle } = useWatchlist()
  const { addToast } = useToast()
  const location = useLocation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  // Cards pass the media type they were rendered from: TMDB movie and TV ids
  // overlap, so guessing "movie first" can open a different title.
  const typeParam = searchParams.get('type')
  const requestedType = typeParam === 'movie' || typeParam === 'tv' ? typeParam : undefined

  const titleQuery = useTitleQuery(validId, requestedType)
  const sourcesQuery = useSourcesQuery(validId)
  const castQuery = useCastQuery(validId)
  const details = titleQuery.data
  const isTvTitle = details ? isTv(details.type) : false
  const seasonsQuery = useSeasonsQuery(validId, isTvTitle)

  useEffect(() => {
    if (details && location.hash === '#where-to-watch') {
      const timer = setTimeout(() => {
        document.getElementById('where-to-watch')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 120)
      return () => clearTimeout(timer)
    }
  }, [details, location.hash])

  if (validId === undefined) {
    return (
      <div className="shell pt-32 pb-20">
        <EmptyState
          title="That title address is not valid"
          description="The link you followed does not contain a catalog title id."
          action={<ButtonLink to="/discover">Browse the catalog</ButtonLink>}
        />
      </div>
    )
  }

  if (titleQuery.isLoading) return <DetailsSkeleton />

  if (titleQuery.isError) {
    const isNotFound = titleQuery.error instanceof ApiError && titleQuery.error.status === 404

    return (
      <div className="shell pt-32 pb-20">
        {isNotFound ? (
          <EmptyState
            title="Title not found"
            description="This title is not available in the movie database. It may have been removed or the id may be incorrect."
            action={<ButtonLink to="/discover">Browse the catalog</ButtonLink>}
          />
        ) : (
          <ErrorState
            title="This title could not be loaded"
            message={errorMessage(titleQuery.error)}
            onRetry={() => void titleQuery.refetch()}
          />
        )}
      </div>
    )
  }

  if (!details) return null

  const saved = has(details.id)
  const ratings = [
    { label: 'Audience', value: userRatingLabel(details.userRating) },
    { label: 'Critics', value: criticScoreLabel(details.criticScore) },
  ].filter((rating) => rating.value !== null)

  const handleWatchlist = () => {
    toggle({
      titleId: details.id,
      title: details.title,
      year: details.year,
      type: details.type,
      poster: details.poster,
    })
  }

  const handleShare = async () => {
    const url = window.location.href
    if (navigator.share) {
      try {
        await navigator.share({ title: details.title, url })
        return
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return
      }
    }

    try {
      await navigator.clipboard.writeText(url)
      addToast('Link copied to clipboard', 'success')
    } catch {
      addToast('Could not copy the link', 'error')
    }
  }

  return (
    <article>
      <div className="relative h-[36vh] min-h-[260px] max-h-[460px] border-b border-line bg-surface">
        {details.backdrop ? (
          <img src={details.backdrop} alt="" className="h-full w-full object-cover" />
        ) : null}
        <div className="absolute inset-0 bg-bg/70" aria-hidden="true" />
        <div className="shell absolute inset-x-0 top-20">
          <Link
            to="/discover"
            className="inline-flex items-center gap-2 text-[10px] uppercase tracking-widest text-muted transition-colors hover:text-white"
          >
            <ArrowLeft size={13} aria-hidden="true" />
            Back to discover
          </Link>
        </div>
      </div>

      <div className="shell">
        <div className="grid gap-8 lg:grid-cols-[240px_1fr] lg:gap-12">
          <div className="-mt-24 lg:-mt-32">
            <div className="aspect-[2/3] w-[150px] max-w-[240px] overflow-hidden bg-surface sm:w-[190px] lg:w-full">
              <TitleImage
                src={details.posterLarge ?? details.poster}
                alt={`${details.title} poster`}
                title={details.title}
                className="h-full w-full"
                imageClassName="h-full w-full object-cover"
                priority
              />
            </div>
          </div>

          <div className="pt-2 lg:pt-8">
            <p className="eyebrow">
              {typeLabel(details.type)}
              {details.year ? ` · ${details.year}` : ''}
            </p>
            <h1 className="mt-3 font-serif text-3xl leading-tight text-white sm:text-4xl lg:text-5xl">
              {details.title}
            </h1>

            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted">
              {details.year ? <span>{details.year}</span> : null}
              {details.endYear && details.endYear !== details.year ? (
                <span>– {details.endYear}</span>
              ) : null}
              {runtimeLabel(details.runtimeMinutes) ? (
                <span>{runtimeLabel(details.runtimeMinutes)}</span>
              ) : null}
              {details.contentRating ? (
                <span className="border border-line px-2 py-0.5 text-[10px] uppercase tracking-widest text-white/80">
                  {details.contentRating}
                </span>
              ) : null}
              {details.networkNames.length > 0 ? (
                <span className="truncate">{details.networkNames.slice(0, 3).join(', ')}</span>
              ) : null}
            </div>

            {details.genreNames.length > 0 ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {details.genreNames.map((genre) => (
                  <span
                    key={genre}
                    className="border border-line px-2.5 py-1 text-[11px] text-muted"
                  >
                    {genre}
                  </span>
                ))}
              </div>
            ) : null}

            {ratings.length > 0 ? (
              <dl className="mt-6 flex flex-wrap gap-8">
                {ratings.map((rating) => (
                  <div key={rating.label} className="border-l-2 border-accent pl-3">
                    <dt className="eyebrow">{rating.label}</dt>
                    <dd className="mt-1 font-serif text-xl text-white">{rating.value}</dd>
                  </div>
                ))}
              </dl>
            ) : null}

            {details.plotOverview ? (
              <div className="mt-7 max-w-3xl">
                <h2 className="eyebrow">Synopsis</h2>
                <p className="mt-3 text-sm leading-relaxed text-white/80 sm:text-base">
                  {details.plotOverview}
                </p>
              </div>
            ) : null}

            <div className="mt-8 flex flex-wrap gap-2">
              <Button variant={saved ? 'secondary' : 'primary'} onClick={handleWatchlist}>
                {saved ? <Check size={16} aria-hidden="true" /> : <Plus size={16} aria-hidden="true" />}
                {saved ? 'In watchlist' : 'Add to watchlist'}
              </Button>

              {details.trailer ? (
                <ButtonAnchor
                  href={details.trailer}
                  target="_blank"
                  rel="noopener noreferrer"
                  variant="secondary"
                >
                  <Play size={15} aria-hidden="true" />
                  Trailer
                  <ExternalLink size={12} aria-hidden="true" />
                </ButtonAnchor>
              ) : null}

              {details.tmdbId ? (
                <Button
                  variant="primary"
                  onClick={() => {
                    navigate(
                      buildWatchUrl(isTv(details.type) ? 'tv' : 'movie', details.tmdbId!, {
                        back: `/title/${details.id}?type=${details.type}`,
                        title: details.title,
                        year: details.year,
                        poster: details.poster,
                      }),
                    )
                  }}
                  disabled={!details.tmdbId}
                >
                  <Play size={15} aria-hidden="true" />
                  {isTv(details.type) ? 'Play Episode 1' : 'Watch Now'}
                </Button>
              ) : null}

              <Button variant="ghost" onClick={() => void handleShare()}>
                <Share2 size={15} aria-hidden="true" />
                Share
              </Button>
            </div>
          </div>
        </div>

        <div className="mt-14 space-y-12 pb-16">
          <StreamingProviders
            sources={sourcesQuery.data ?? []}
            isLoading={sourcesQuery.isLoading}
            isError={sourcesQuery.isError}
            onRetry={() => void sourcesQuery.refetch()}
          />

          <CastCrewSection
            data={castQuery.data}
            isLoading={castQuery.isLoading}
            isError={castQuery.isError}
            onRetry={() => void castQuery.refetch()}
          />

          {isTvTitle ? (
            <SeasonsEpisodes
              titleId={details.id}
              seasons={seasonsQuery.data}
              isLoading={seasonsQuery.isLoading}
              isError={seasonsQuery.isError}
              onRetry={() => void seasonsQuery.refetch()}
            />
          ) : null}

          <SimilarTitles ids={details.similarTitles} />
        </div>
      </div>
    </article>
  )
}
