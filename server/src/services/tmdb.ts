import { env } from '../env.js'
import { withCache } from '../lib/cache.js'
import {
  tmdbFetch,
  type RawTmdbEpisode,
  type RawTmdbMovie,
  type RawTmdbSeason,
  type RawTmdbSeries,
  type TmdbEpisodeRecord,
  type TmdbMovieRecord,
  type TmdbSeasonRecord,
  type TmdbSeriesRecord,
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
