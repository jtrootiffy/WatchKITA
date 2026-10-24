import { env } from '../env.js'
import { withCache } from '../lib/cache.js'
import {
  getTmdbDiscover,
  getTmdbGenres,
  getTmdbMovie,
  getTmdbSearch,
  getTmdbSeasonEpisodes,
  getTmdbSeries,
  getTmdbWatchProviders,
} from './tmdb.js'
import type { TitleFilters, TitleType } from '../types.js'

interface CatalogTitle {
  id: number
  title: string
  year: number | null
  type: TitleType
  poster: string | null
  backdrop: string | null
  genres: string[]
  voteAverage: number | null
}

interface TmdbGenre {
  id: number
  name: string
}

interface WatchProvidersResult {
  link: string | null
  providers: Array<{
    providerId: number
    name: string
    logoPath: string | null
    type: string
    displayPriority: number
  }>
}

const TTL = env.cacheTtl

export async function getTitleList(filters: TitleFilters): Promise<{
  titles: CatalogTitle[]
  page: number
  totalPages: number
  totalResults: number
}> {
  // TMDB discover supports one type at a time; if 'all' or multiple types,
  // default to movie. Region filtering is not supported by TMDB discover.
  const type = filters.types.length === 1 && filters.types[0] === 'tv' ? 'tv' : 'movie'

  return withCache(
    `tmdb:discover:v1:${type}:${filters.genreIds.join(',')}:${filters.sortBy}:${filters.page}:${filters.limit}:${filters.releaseDateStart ?? 'any'}`,
    TTL.list,
    async () => {
      const result = await getTmdbDiscover({
        type,
        genreIds: filters.genreIds,
        sortBy: filters.sortBy,
        page: filters.page,
        limit: filters.limit,
        year: filters.releaseDateStart
          ? Number.parseInt(filters.releaseDateStart, 10)
          : null,
      })
      return {
        titles: result.items,
        page: result.page,
        totalPages: result.totalPages,
        totalResults: result.totalResults,
      }
    },
  )
}

export async function getTitleDetails(id: number, region: string): Promise<{
  id: number
  title: string
  year: number | null
  type: TitleType
  poster: string | null
  posterMedium: string | null
  posterLarge: string | null
  backdrop: string | null
  plotOverview: string | null
  runtimeMinutes: number | null
  releaseDate: string | null
  endYear: number | null
  genres: number[]
  genreNames: string[]
  userRating: number | null
  criticScore: number | null
  contentRating: string | null
  contentRatings: Record<string, string>
  trailer: string | null
  trailerThumbnail: string | null
  similarTitles: number[]
  networkNames: string[]
  imdbId: string | null
  tmdbId: number | null
}> {
  // TMDB doesn't distinguish between TV subtypes; map to 'tv' family.
  // Try movie first, fall back to TV.
  try {
    const movie = await getTmdbMovie(id)
    return {
      id: movie.tmdbId,
      title: movie.title,
      year: movie.year ?? null,
      type: 'movie',
      poster: movie.poster ?? null,
      posterMedium: movie.poster ?? null,
      posterLarge: movie.poster ?? null,
      backdrop: movie.backdrop ?? null,
      plotOverview: movie.overview ?? null,
      runtimeMinutes: movie.runtimeMinutes ?? null,
      releaseDate: movie.year ? `${movie.year}-01-01` : null,
      endYear: null,
      genres: [],
      genreNames: movie.genres,
      userRating: null,
      criticScore: null,
      contentRating: null,
      contentRatings: {},
      trailer: null,
      trailerThumbnail: null,
      similarTitles: [],
      networkNames: [],
      imdbId: null,
      tmdbId: movie.tmdbId,
    }
  } catch {
    // Not a movie; try TV series.
  }

  const series = await getTmdbSeries(id)
  return {
    id: series.tmdbId,
    title: series.title,
    year: series.year ?? null,
    type: 'tv',
    poster: series.poster ?? null,
    posterMedium: series.poster ?? null,
    posterLarge: series.poster ?? null,
    backdrop: series.backdrop ?? null,
    plotOverview: series.overview ?? null,
    runtimeMinutes: series.runtimeMinutes ?? null,
    releaseDate: series.year ? `${series.year}-01-01` : null,
    endYear: null,
    genres: [],
    genreNames: series.genres,
    userRating: null,
    criticScore: null,
    contentRating: null,
    contentRatings: {},
    trailer: null,
    trailerThumbnail: null,
    similarTitles: [],
    networkNames: [],
    imdbId: null,
    tmdbId: series.tmdbId,
  }
}

export async function getTitleSources(id: number, region: string): Promise<
  Array<{
    sourceId: number
    name: string
    type: string
    region: string
    format: string | null
    price: number | null
    seasons: number | null
    episodes: number | null
    webUrl: string | null
  }>
> {
  // TMDB watch providers are the closest equivalent to Watchmode sources.
  // TMDB doesn't distinguish by format/price per provider in the same way.
  try {
    const movieProviders = await getTmdbWatchProviders({ type: 'movie', tmdbId: id, region })
    if (movieProviders.providers.length > 0) {
      return movieProviders.providers.map((p) => ({
        sourceId: p.providerId,
        name: p.name,
        type: p.type,
        region,
        format: null,
        price: null,
        seasons: null,
        episodes: null,
        webUrl: null,
      }))
    }
  } catch {
    // Not a movie or no providers; try TV.
  }

  try {
    const tvProviders = await getTmdbWatchProviders({ type: 'tv', tmdbId: id, region })
    return tvProviders.providers.map((p) => ({
      sourceId: p.providerId,
      name: p.name,
      type: p.type,
      region,
      format: null,
      price: null,
      seasons: null,
      episodes: null,
      webUrl: null,
    }))
  } catch {
    return []
  }
}

export async function getCastCrew(id: number): Promise<{ cast: Array<{ personId: number; name: string; type: string; role: string; episodeCount: number; order: number }>; crew: Array<{ personId: number; name: string; type: string; role: string; episodeCount: number; order: number }> }> {
  // TMDB credits endpoint not yet wired; return empty to avoid breaking the UI.
  return { cast: [], crew: [] }
}

export async function getSeasons(id: number): Promise<
  Array<{
    id: number
    name: string
    number: number
    episodeCount: number
    airDate: string | null
    overview: string | null
    posterUrl: string | null
  }>
> {
  try {
    const series = await getTmdbSeries(id)
    return series.seasons.map((s) => ({
      id: s.seasonNumber,
      name: s.name ?? `Season ${s.seasonNumber}`,
      number: s.seasonNumber,
      episodeCount: s.episodeCount,
      airDate: s.airDate ?? null,
      overview: s.overview ?? null,
      posterUrl: null,
    }))
  } catch {
    return []
  }
}

export async function getEpisodes(id: number, season?: number): Promise<
  Array<{
    id: number
    name: string
    episodeNumber: number
    seasonNumber: number
    airDate: string | null
    runtimeMinutes: number | null
    overview: string | null
    thumbnailUrl: string | null
    sources: Array<{ sourceId: number; name: string; type: string; region: string; webUrl: string | null }>
  }>
> {
  if (!season) return []
  try {
    const episodes = await getTmdbSeasonEpisodes(id, season)
    return episodes.map((ep) => ({
      id: ep.episodeNumber,
      name: ep.name,
      episodeNumber: ep.episodeNumber,
      seasonNumber: ep.seasonNumber,
      airDate: ep.airDate ?? null,
      runtimeMinutes: ep.runtimeMinutes ?? null,
      overview: ep.overview ?? null,
      thumbnailUrl: null,
      sources: [],
    }))
  } catch {
    return []
  }
}

export async function getGenres(): Promise<Array<{ id: number; name: string }>> {
  return withCache('tmdb:genres:v1', TTL.reference, async () => {
    return getTmdbGenres()
  })
}

export async function getSourceReferences(): Promise<Array<{ id: number; name: string; type: string; logo: string | null }>> {
  // TMDB doesn't have a generic provider reference list.
  return withCache('tmdb:sources:v1', TTL.reference, async () => {
    return []
  })
}

export async function getRegions(): Promise<Array<{ code: string; name: string; flag: string | null }>> {
  // TMDB doesn't expose a region list; return empty to signal region switching is disabled.
  return []
}

export interface UpstreamStatus {
  quota: number | null
  quotaUsed: number | null
  quotaRemaining: number | null
}

export async function getUpstreamStatus(): Promise<UpstreamStatus> {
  return withCache('tmdb:status:v1', TTL.status, async () => {
    // TMDB doesn't expose a public quota endpoint in the same way as Watchmode.
    return { quota: null, quotaUsed: null, quotaRemaining: null }
  })
}

export type SearchTypeFilter = 'all' | 'movie' | 'tv'

function matchesType(type: 'movie' | 'tv', filter: SearchTypeFilter): boolean {
  if (filter === 'all') return true
  return filter === 'movie' ? type === 'movie' : type === 'tv'
}

export async function searchTitles(term: string, typeFilter: SearchTypeFilter): Promise<Array<{
  id: number
  name: string
  type: TitleType
  year: number | null
  imageUrl: string | null
}>> {
  const result = await getTmdbSearch({ query: term, type: typeFilter as 'all' | 'movie' | 'tv' })
  return result.results
    .filter((r) => matchesType(r.type as 'movie' | 'tv', typeFilter))
    .map((r) => ({
      id: r.id,
      name: r.title,
      type: r.type === 'tv' ? 'tv' : 'movie',
      year: r.year ?? null,
      imageUrl: r.poster ?? null,
    }))
}

export interface FullSearchResult {
  id: number
  title: string
  year: number | null
  type: string
}

export async function searchFull(term: string, typeFilter: SearchTypeFilter): Promise<FullSearchResult[]> {
  const result = await getTmdbSearch({ query: term, type: typeFilter as 'all' | 'movie' | 'tv' })
  return result.results
    .filter((r) => matchesType(r.type as 'movie' | 'tv', typeFilter))
    .map((r) => ({
      id: r.id,
      title: r.title,
      year: r.year ?? null,
      type: r.type,
    }))
}

export async function getPosters(ids: number[]): Promise<Array<{ id: number; title: string; year: number | null; type: TitleType; poster: string | null; backdrop: string | null }>> {
  // TMDB doesn't have a batch poster endpoint. Fetch details for each ID.
  const unique = [...new Set(ids)].slice(0, 30)
  const posters = await Promise.all(
    unique.map(async (id) => {
      try {
        const movie = await getTmdbMovie(id)
        return {
          id: movie.tmdbId,
          title: movie.title,
          year: movie.year ?? null,
          type: 'movie' as const,
          poster: movie.poster ?? null,
          backdrop: movie.backdrop ?? null,
        }
      } catch {
        try {
          const series = await getTmdbSeries(id)
          return {
            id: series.tmdbId,
            title: series.title,
            year: series.year ?? null,
            type: 'tv' as const,
            poster: series.poster ?? null,
            backdrop: series.backdrop ?? null,
          }
        } catch {
          return {
            id,
            title: 'Untitled',
            year: null,
            type: 'movie' as const,
            poster: null,
            backdrop: null,
          }
        }
      }
    }),
  )
  return posters
}
