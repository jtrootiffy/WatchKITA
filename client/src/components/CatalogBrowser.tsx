import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { errorMessage } from '../lib/api'
import { useGenresQuery, useInfiniteTitlesQuery } from '../lib/queries'
import { useRegion } from '../context/RegionContext'
import type { TitleType } from '../types'
import { Button } from './ui/Button'
import DiscoveryFilters, {
  DEFAULT_SORT,
  SORT_OPTIONS,
  type CatalogFilters,
  type CatalogTypeFilter,
} from './DiscoveryFilters'
import ErrorState from './ErrorState'
import EmptyState from './EmptyState'
import MovieGrid from './MovieGrid'
import { GridSkeleton } from './LoadingSkeleton'

type Mode = 'movies' | 'tv' | 'discover'

interface CatalogBrowserProps {
  mode: Mode
  title: string
  description: string
}

const TYPES_BY_FILTER: Record<CatalogTypeFilter, TitleType[]> = {
  all: [],
  movie: ['movie'],
  tv: ['tv_series', 'tv_miniseries', 'tv_special'],
}

const VALID_SORTS = new Set(SORT_OPTIONS.map((option) => option.value as string))

export default function CatalogBrowser({ mode, title, description }: CatalogBrowserProps) {
  const [searchParams, setSearchParams] = useSearchParams()
  const { region, regionName } = useRegion()
  const genresQuery = useGenresQuery()

  const typeFromUrl = searchParams.get('type')
  const type: CatalogTypeFilter =
    mode === 'movies'
      ? 'movie'
      : mode === 'tv'
        ? 'tv'
        : typeFromUrl === 'movie' || typeFromUrl === 'tv'
          ? typeFromUrl
          : 'all'

  const yearParam = Number.parseInt(searchParams.get('year') ?? '', 10)
  const year = Number.isFinite(yearParam) && yearParam >= 1888 ? yearParam : null

  const genreIds = useMemo(() => {
    const raw = searchParams.get('genres')
    if (!raw) return []
    return [
      ...new Set(
        raw
          .split(',')
          .map((value) => Number.parseInt(value, 10))
          .filter((value) => Number.isInteger(value) && value > 0),
      ),
    ].slice(0, 3)
  }, [searchParams])

  const sortParam = searchParams.get('sort') ?? DEFAULT_SORT
  const sortBy = VALID_SORTS.has(sortParam) ? sortParam : DEFAULT_SORT

  const filters: CatalogFilters = { type, genreIds, year, sortBy }

  const updateFilters = useCallback(
    (patch: Partial<CatalogFilters>) => {
      const next = new URLSearchParams(searchParams)

      if (mode === 'discover' && patch.type !== undefined) {
        if (patch.type === 'all') next.delete('type')
        else next.set('type', patch.type)
      }
      if (patch.genreIds !== undefined) {
        if (patch.genreIds.length > 0) next.set('genres', patch.genreIds.join(','))
        else next.delete('genres')
      }
      if (patch.year !== undefined) {
        if (patch.year === null) next.delete('year')
        else next.set('year', String(patch.year))
      }
      if (patch.sortBy !== undefined) {
        if (patch.sortBy === DEFAULT_SORT) next.delete('sort')
        else next.set('sort', patch.sortBy)
      }

      setSearchParams(next, { replace: true })
    },
    [mode, searchParams, setSearchParams],
  )

  const resetFilters = useCallback(() => {
    setSearchParams(new URLSearchParams(), { replace: true })
  }, [setSearchParams])

  const query = useInfiniteTitlesQuery({
    types: TYPES_BY_FILTER[type],
    genreIds,
    region,
    sortBy,
    year,
    limit: 24,
  })

  const items = useMemo(() => {
    const seen = new Set<number>()
    const list = []
    for (const page of query.data?.pages ?? []) {
      for (const item of page.titles) {
        if (seen.has(item.id)) continue
        seen.add(item.id)
        list.push(item)
      }
    }
    return list
  }, [query.data])

  const total = query.data?.pages[0]?.totalResults ?? 0
  const hasActiveFilters =
    genreIds.length > 0 || year !== null || sortBy !== DEFAULT_SORT || type !== 'all'

  return (
    <div>
      <div className="shell pb-8 pt-28 lg:pt-36">
        <div className="flex items-center gap-3">
          <span className="h-[2px] w-6 bg-primary" aria-hidden="true" />
          <p className="eyebrow">
            {mode === 'discover' ? 'Browse the catalog' : mode === 'movies' ? 'Films' : 'Series'}
          </p>
        </div>
        <h1 className="mt-4 font-serif text-4xl leading-tight text-white sm:text-5xl">{title}</h1>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted">{description}</p>
      </div>

      <DiscoveryFilters
        filters={filters}
        onChange={updateFilters}
        genres={genresQuery.data ?? []}
        genresLoading={genresQuery.isLoading}
        showTypeTabs={mode === 'discover'}
        onReset={resetFilters}
        hasActiveFilters={hasActiveFilters}
      />

      <div className="shell py-8">
        {query.isLoading ? (
          <GridSkeleton count={18} />
        ) : query.isError && items.length === 0 ? (
          <ErrorState
            title="The catalog could not be loaded"
            message={errorMessage(query.error)}
            onRetry={() => void query.refetch()}
          />
        ) : items.length === 0 ? (
          <EmptyState
            title="No titles match these filters"
            description={`Nothing in the catalog matched this combination for ${regionName}. Try removing a genre or choosing a different year.`}
            action={
              <Button variant="secondary" onClick={resetFilters}>
                Clear filters
              </Button>
            }
          />
        ) : (
          <>
            <div className="mb-6 flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-xs text-muted">
                Showing <span className="text-white">{items.length}</span> of{' '}
                <span className="text-white">{total.toLocaleString()}</span> titles available in{' '}
                {regionName}
              </p>
              {query.isFetching && !query.isFetchingNextPage ? (
                <span className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-muted">
                  <Loader2 size={12} className="animate-spin" aria-hidden="true" />
                  Updating
                </span>
              ) : null}
            </div>

            <MovieGrid items={items} />

            {query.isFetchNextPageError ? (
              <p role="alert" className="mt-8 border-l-2 border-primary bg-surface px-4 py-3 text-sm text-muted">
                The next page could not be loaded. Please try again.
              </p>
            ) : null}

            <div className="mt-12 flex flex-col items-center gap-3 border-t border-line pt-8">
              {query.hasNextPage ? (
                <Button
                  variant="secondary"
                  onClick={() => void query.fetchNextPage()}
                  disabled={query.isFetchingNextPage}
                >
                  {query.isFetchingNextPage ? (
                    <>
                      <Loader2 size={14} className="animate-spin" aria-hidden="true" />
                      Loading
                    </>
                  ) : (
                    'Load more titles'
                  )}
                </Button>
              ) : (
                <p className="text-xs text-muted">You have reached the end of this collection.</p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
