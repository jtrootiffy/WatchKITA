import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { api, ApiError, type TitleQuery } from './api'

const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR
const MAX_PAGES = 40

export const queryKeys = {
  regions: ['regions'] as const,
  genres: ['genres'] as const,
  sourceReferences: ['source-references'] as const,
  status: ['status'] as const,
  title: (id: number, region: string) => ['title', id, region] as const,
  sources: (id: number, region: string) => ['title-sources', id, region] as const,
  cast: (id: number) => ['title-cast', id] as const,
  seasons: (id: number) => ['title-seasons', id] as const,
  episodes: (id: number, season: number) => ['title-episodes', id, season] as const,
  tmdbMovie: (tmdbId: number) => ['tmdb', 'movie', tmdbId] as const,
  tmdbSeries: (tmdbId: number) => ['tmdb', 'series', tmdbId] as const,
  tmdbSeason: (tmdbId: number, season: number) => ['tmdb', 'season', tmdbId, season] as const,
  titles: (query: TitleQuery) =>
    [
      'titles',
      query.types?.join(',') ?? 'all',
      query.genreIds?.join(',') ?? 'all',
      query.region ?? 'any',
      query.sortBy ?? 'popularity_desc',
      query.limit ?? 24,
      query.year ?? 'any',
    ] as const,
  posterBatch: (ids: number[]) => ['poster-batch', ids.join(',')] as const,
}

export function useRegionsQuery() {
  return useQuery({
    queryKey: queryKeys.regions,
    queryFn: () => api.regions(),
    staleTime: DAY,
    gcTime: DAY,
    retry: 1,
  })
}

export function useGenresQuery() {
  return useQuery({
    queryKey: queryKeys.genres,
    queryFn: () => api.genres(),
    staleTime: DAY,
    gcTime: DAY,
    retry: 1,
  })
}

export function useSourceReferencesQuery() {
  return useQuery({
    queryKey: queryKeys.sourceReferences,
    queryFn: () => api.sourceReferences(),
    staleTime: DAY,
    gcTime: DAY,
    retry: 1,
  })
}

export function useStatusQuery() {
  return useQuery({
    queryKey: queryKeys.status,
    queryFn: () => api.status(),
    staleTime: 5 * MINUTE,
    retry: 0,
  })
}

export function useTitleQuery(id: number | undefined, region: string) {
  return useQuery({
    queryKey: queryKeys.title(id ?? 0, region),
    queryFn: ({ signal }) => api.title(id as number, region, signal),
    enabled: Boolean(id),
    staleTime: HOUR,
    retry: (attempt, error) =>
      error instanceof ApiError && error.status === 404 ? false : attempt < 2,
  })
}

export function useSourcesQuery(id: number | undefined, region: string) {
  return useQuery({
    queryKey: queryKeys.sources(id ?? 0, region),
    queryFn: ({ signal }) => api.sources(id as number, region, signal),
    enabled: Boolean(id),
    staleTime: 30 * MINUTE,
    retry: 1,
  })
}

export function useCastQuery(id: number | undefined) {
  return useQuery({
    queryKey: queryKeys.cast(id ?? 0),
    queryFn: ({ signal }) => api.cast(id as number, signal),
    enabled: Boolean(id),
    staleTime: DAY,
    retry: 1,
  })
}

export function useSeasonsQuery(id: number | undefined, enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.seasons(id ?? 0),
    queryFn: ({ signal }) => api.seasons(id as number, signal),
    enabled: Boolean(id) && enabled,
    staleTime: DAY,
    retry: 1,
  })
}

export function useEpisodesQuery(id: number | undefined, season: number | null) {
  return useQuery({
    queryKey: queryKeys.episodes(id ?? 0, season ?? 0),
    queryFn: ({ signal }) => api.episodes(id as number, season as number, signal),
    enabled: Boolean(id) && season !== null,
    staleTime: 12 * HOUR,
    retry: 1,
  })
}

export function useTmdbMovieQuery(tmdbId: number | undefined, enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.tmdbMovie(tmdbId ?? 0),
    queryFn: ({ signal }) => api.tmdb.movie(tmdbId as number, signal),
    enabled: Boolean(tmdbId) && enabled,
    staleTime: DAY,
    retry: 1,
  })
}

export function useTmdbSeriesQuery(tmdbId: number | undefined, enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.tmdbSeries(tmdbId ?? 0),
    queryFn: ({ signal }) => api.tmdb.series(tmdbId as number, signal),
    enabled: Boolean(tmdbId) && enabled,
    staleTime: DAY,
    retry: 1,
  })
}

export function useTmdbSeasonQuery(tmdbId: number | undefined, season: number | null, enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.tmdbSeason(tmdbId ?? 0, season ?? 0),
    queryFn: ({ signal }) => api.tmdb.season(tmdbId as number, season as number, signal),
    enabled: Boolean(tmdbId) && season !== null && enabled,
    staleTime: 12 * HOUR,
    retry: 1,
  })
}

export function useTitlesQuery(query: TitleQuery, enabled = true) {
  return useQuery({
    queryKey: queryKeys.titles(query),
    queryFn: ({ signal }) => api.titles({ ...query, page: 1 }, signal),
    enabled,
    staleTime: 10 * MINUTE,
    retry: 1,
  })
}

export function useInfiniteTitlesQuery(query: TitleQuery) {
  return useInfiniteQuery({
    queryKey: [...queryKeys.titles(query), 'infinite'],
    queryFn: ({ pageParam, signal }) => api.titles({ ...query, page: pageParam }, signal),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      if (lastPage.titles.length === 0) return undefined
      if (lastPage.page >= Math.min(lastPage.totalPages, MAX_PAGES)) return undefined
      return lastPage.page + 1
    },
    staleTime: 10 * MINUTE,
    retry: 1,
  })
}

export function usePosterBatchQuery(ids: number[], enabled = true) {
  return useQuery({
    queryKey: queryKeys.posterBatch(ids),
    queryFn: ({ signal }) => api.posters(ids, signal),
    enabled: enabled && ids.length > 0,
    staleTime: DAY,
    retry: 1,
  })
}
