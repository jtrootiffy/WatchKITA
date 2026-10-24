import { env } from '../env.js'
import { withCache } from '../lib/cache.js'
import {
  tmdbFetch,
  type CatalogTitle,
  type RawTmdbDiscoverPage,
  type RawTmdbDiscoverResult,
  type RawTmdbEpisode,
  type RawTmdbGenre,
  type RawTmdbGenreList,
  type RawTmdbMovie,
  type RawTmdbSearchPage,
  type RawTmdbSearchResult,
  type RawTmdbSeason,
  type RawTmdbSeries,
  type RawTmdbWatchProviders,
  type TmdbEpisodeRecord,
  type TmdbGenre,
  type TmdbMovieRecord,
  type TmdbSeasonRecord,
  type TmdbSeriesRecord,
  type WatchProvider,
  type WatchProvidersResult,
} from '../lib/tmdb.js'

const TMDB_IMAGES_BASE = 'https://image.tmdb.org/t/p'

function absoluteImage(path: string | null | undefined, size: string): string | null {
  const trimmed = (path ?? '').trim()
  if (!trimmed) return null
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  const withoutLeading = trimmed.replace(/^\/+/, '')
  if (!withoutLeading) return null
  return `${TMDB_IMAGES_BASE}/${size}/${withoutLeading}`
}

function toTitle(raw: { title?: string | null; name?: string | null }): string {
  const value = (raw.title ?? raw.name ?? '').trim()
  return value.length > 0 ? value : 'Untitled'
}

function toGenres(raw: Array<{ id: number; name: string }> | null | undefined): string[] {
  if (!Array.isArray(raw)) return []
  const names: string[] = []
  for (const genre of raw) {
    const name = typeof genre?.name === 'string' ? genre.name.trim() : ''
    if (name && !names.includes(name)) names.push(name)
  }
  return names
}

function toYear(releaseDate: string | null | undefined): number | null {
  if (!releaseDate) return null
  const year = Number.parseInt(releaseDate.slice(0, 4), 10)
  return Number.isFinite(year) ? year : null
}

/**
 * Movie metadata resolved through TMDB using a real TMDB id.
 * Cached under the shared TMDB TTL bucket.
 */
export async function getTmdbMovie(tmdbId: number): Promise<TmdbMovieRecord> {
  return withCache(`tmdb:movie:v1:${tmdbId}`, env.cacheTtl.tmdbDetails, async () => {
    const movie = await tmdbFetch<RawTmdbMovie>(`/movie/${tmdbId}`)

    return {
      tmdbId,
      mediaType: 'movie',
      title: toTitle(movie),
      year: toYear(movie.release_date ?? null),
      overview: movie.overview ?? null,
      runtimeMinutes: typeof movie.runtime === 'number' && Number.isFinite(movie.runtime) ? movie.runtime : null,
      poster: absoluteImage(movie.poster_path, 'w500'),
      backdrop: absoluteImage(movie.backdrop_path, 'original'),
      genres: toGenres(movie.genres),
    }
  })
}

/**
 * TV series metadata resolved through TMDB using a real TMDB id,
 * including the season index used for episode-aware embeds.
 */
export async function getTmdbSeries(tmdbId: number): Promise<TmdbSeriesRecord> {
  return withCache(`tmdb:series:v1:${tmdbId}`, env.cacheTtl.tmdbDetails, async () => {
    const series = await tmdbFetch<RawTmdbSeries>(`/tv/${tmdbId}`)

    const seasons: TmdbSeasonRecord[] = (Array.isArray(series.seasons) ? series.seasons : [])
      .filter((season) => season && Number.isInteger(season.season_number))
      .map((season: RawTmdbSeason) => ({
        seasonNumber: season.season_number,
        name: season.name ?? null,
        episodeCount: typeof season.episode_count === 'number' ? season.episode_count : 0,
        airDate: season.air_date ?? null,
        overview: season.overview ?? null,
      }))
      .sort((a, b) => a.seasonNumber - b.seasonNumber)

    return {
      tmdbId,
      mediaType: 'tv',
      title: toTitle(series),
      year: toYear(series.first_air_date ?? series.release_date ?? null),
      overview: series.overview ?? null,
      runtimeMinutes: typeof series.runtime === 'number' && Number.isFinite(series.runtime) ? series.runtime : null,
      poster: absoluteImage(series.poster_path, 'w500'),
      backdrop: absoluteImage(series.backdrop_path, 'original'),
      genres: toGenres(series.genres),
      seasons,
    }
  })
}

/**
 * Episode list for a specific season of a TV series, resolved through TMDB.
 */
export async function getTmdbSeasonEpisodes(tmdbId: number, season: number): Promise<TmdbEpisodeRecord[]> {
  return withCache(`tmdb:tv:v1:${tmdbId}:season:${season}`, env.cacheTtl.tmdbEpisodes, async () => {
    const page = await tmdbFetch<{ episodes?: RawTmdbEpisode[] | null }>(`/tv/${tmdbId}/season/${season}`)

    const episodes = Array.isArray(page?.episodes) ? page.episodes : []
    return episodes
      .filter((episode) => episode && Number.isInteger(episode.episode_number))
      .map((episode) => ({
        seasonNumber: episode.season_number,
        episodeNumber: episode.episode_number,
        name: episode.name ?? `Episode ${episode.episode_number}`,
        airDate: episode.air_date ?? null,
        runtimeMinutes: typeof episode.runtime_minutes === 'number' ? episode.runtime_minutes : null,
        overview: episode.overview ?? null,
      }))
      .sort((a, b) => a.episodeNumber - b.episodeNumber)
  })
}

/**
 * Discover movies or TV shows from TMDB with optional genre, year, and sort filters.
 */
export async function getTmdbDiscover({
  type,
  genreIds,
  sortBy,
  page,
  limit,
  year,
}: {
  type: 'movie' | 'tv'
  genreIds?: number[]
  sortBy?: string
  page?: number
  limit?: number
  year?: number | null
}): Promise<{ items: CatalogTitle[]; page: number; totalPages: number; totalResults: number }> {
  const endpoint = type === 'movie' ? '/discover/movie' : '/discover/tv'
  const sortMap: Record<string, string> = {
    popularity_desc: 'popularity.desc',
    popularity_asc: 'popularity.asc',
    release_date_desc: 'primary_release_date.desc',
    release_date_asc: 'primary_release_date.asc',
    title_asc: 'original_title.asc',
    title_desc: 'original_title.desc',
  }

  const withGenres = genreIds?.length ? genreIds.join(',') : undefined
  const primaryReleaseDateGte = year ? `${year}-01-01` : undefined
  const primaryReleaseDateLte = year ? `${year}-12-31` : undefined

  const pageData = await tmdbFetch<RawTmdbDiscoverPage>(endpoint, {
    with_genres: withGenres,
    sort_by: sortMap[sortBy ?? 'popularity_desc'] ?? 'popularity.desc',
    page: page ?? 1,
    limit: limit ?? 24,
    'primary_release_date.gte': primaryReleaseDateGte,
    'primary_release_date.lte': primaryReleaseDateLte,
    with_original_language: undefined,
  })

  const results = Array.isArray(pageData?.results) ? pageData.results : []
  const items: CatalogTitle[] = results.map((result) => {
    const isMovie = type === 'movie'
    const releaseDate = result.release_date ?? result.first_air_date ?? null
    return {
      id: result.id,
      title: (result.title ?? result.name ?? 'Untitled').trim() || 'Untitled',
      year: toYear(releaseDate),
      type: isMovie ? 'movie' : 'tv',
      poster: absoluteImage(result.poster_path, 'w500'),
      backdrop: absoluteImage(result.backdrop_path, 'original'),
      genres: [], // Discover results don't include genre names, only IDs
      voteAverage: typeof result.vote_average === 'number' ? result.vote_average : null,
    }
  })

  return {
    items,
    page: pageData.page ?? 1,
    totalPages: pageData.total_pages ?? 1,
    totalResults: pageData.total_results ?? 0,
  }
}

/**
 * Search movies or TV shows on TMDB.
 */
export async function getTmdbSearch({
  query,
  type,
}: {
  query: string
  type: 'all' | 'movie' | 'tv'
}): Promise<{ results: CatalogTitle[]; total: number }> {
  const endpoints: Record<string, string> = {
    all: '/search/movie',
    movie: '/search/movie',
    tv: '/search/tv',
  }

  // TMDB search doesn't have a combined endpoint; query both when 'all'.
  if (type === 'all') {
    const [moviePage, tvPage] = await Promise.all([
      tmdbFetch<RawTmdbSearchPage>('/search/movie', { query }),
      tmdbFetch<RawTmdbSearchPage>('/search/tv', { query }),
    ])

    const movieResults = Array.isArray(moviePage?.results) ? moviePage.results : []
    const tvResults = Array.isArray(tvPage?.results) ? tvPage.results : []

    const results: CatalogTitle[] = [
      ...movieResults.map((r) => ({
        id: r.id,
        title: (r.title ?? r.name ?? 'Untitled').trim() || 'Untitled',
        year: toYear(r.release_date ?? null),
        type: 'movie' as const,
        poster: absoluteImage(r.poster_path, 'w500'),
        backdrop: absoluteImage(r.backdrop_path, 'original'),
        genres: [],
        voteAverage: typeof r.vote_average === 'number' ? r.vote_average : null,
      })),
      ...tvResults.map((r) => ({
        id: r.id,
        title: (r.title ?? r.name ?? 'Untitled').trim() || 'Untitled',
        year: toYear(r.first_air_date ?? null),
        type: 'tv' as const,
        poster: absoluteImage(r.poster_path, 'w500'),
        backdrop: absoluteImage(r.backdrop_path, 'original'),
        genres: [],
        voteAverage: typeof r.vote_average === 'number' ? r.vote_average : null,
      })),
    ]

    return {
      results,
      total: (moviePage.total_results ?? 0) + (tvPage.total_results ?? 0),
    }
  }

  const page = await tmdbFetch<RawTmdbSearchPage>(endpoints[type], { query })
  const results = Array.isArray(page?.results) ? page.results : []
  const isMovie = type === 'movie'

  return {
    results: results.map((r) => ({
      id: r.id,
      title: (r.title ?? r.name ?? 'Untitled').trim() || 'Untitled',
      year: toYear(isMovie ? r.release_date : r.first_air_date ?? null),
      type: isMovie ? 'movie' : 'tv',
      poster: absoluteImage(r.poster_path, 'w500'),
      backdrop: absoluteImage(r.backdrop_path, 'original'),
      genres: [],
      voteAverage: typeof r.vote_average === 'number' ? r.vote_average : null,
    })),
    total: page.total_results ?? 0,
  }
}

/**
 * Get genre lists for movies and TV from TMDB.
 */
export async function getTmdbGenres(): Promise<TmdbGenre[]> {
  const [moviePage, tvPage] = await Promise.all([
    tmdbFetch<RawTmdbGenreList>('/genre/movie/list'),
    tmdbFetch<RawTmdbGenreList>('/genre/tv/list'),
  ])

  const movieGenres = Array.isArray(moviePage?.genres) ? moviePage.genres : []
  const tvGenres = Array.isArray(tvPage?.genres) ? tvPage.genres : []

  const seen = new Set<number>()
  const genres: TmdbGenre[] = []

  for (const g of [...movieGenres, ...tvGenres]) {
    if (!seen.has(g.id)) {
      seen.add(g.id)
      genres.push({ id: g.id, name: g.name })
    }
  }

  return genres.sort((a, b) => a.name.localeCompare(b.name))
}

/**
 * Get streaming providers for a title in a specific region from TMDB.
 */
export async function getTmdbWatchProviders({
  type,
  tmdbId,
  region,
}: {
  type: 'movie' | 'tv'
  tmdbId: number
  region: string
}): Promise<WatchProvidersResult> {
  const endpoint = type === 'movie' ? `/movie/${tmdbId}/watch/providers` : `/tv/${tmdbId}/watch/providers`
  const data = await tmdbFetch<RawTmdbWatchProviders>(endpoint)

  const results = data?.results ?? {}
  const regionResult = results[region] ?? results.US ?? results[Object.keys(results)[0] ?? '']

  const providers: WatchProvider[] = []
  const typeOrder: Record<string, number> = { flatrate: 0, free: 1, rent: 2, buy: 3 }

  for (const [watchType, list] of Object.entries(regionResult ?? {})) {
    if (!Array.isArray(list)) continue
    const t = watchType as keyof typeof typeOrder
    for (const p of list) {
      providers.push({
        providerId: p.provider_id,
        name: p.provider_name,
        logoPath: p.logo_path ? `https://image.tmdb.org/t/p/w45/${p.logo_path}` : null,
        type: (t as 'flatrate' | 'free' | 'rent' | 'buy') ?? 'flatrate',
        displayPriority: typeOrder[t ?? 'flatrate'] ?? 99,
      })
    }
  }

  providers.sort((a, b) => a.displayPriority - b.displayPriority)

  return {
    link: regionResult?.link ?? null,
    providers,
  }
}

