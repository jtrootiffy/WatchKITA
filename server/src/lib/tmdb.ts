import { env } from '../env.js'
import { AppError, notFound, serviceUnavailable } from './errors.js'
import { delay, enqueueUpstream } from './upstreamQueue.js'

const TMDB_BASE_URL = env.tmdbBaseUrl.replace(/\/+$/, '')
const CINE_SRC_ORIGIN = 'https://cinesrc.st'
const REQUEST_TIMEOUT_MS = 12_000
const MAX_ATTEMPTS = 2
const RETRY_DELAY_MS = 1_200

export { CINE_SRC_ORIGIN }

interface TmdbEnvelope<T> {
  data?: T
  error?: unknown
  response?: Response
}

interface TmdbErrorBody {
  statusCode?: number
  status?: string
  message?: string
}

class TmdbApiError extends Error {
  readonly statusCode: number

  constructor(statusCode: number, message: string) {
    super(message)
    this.name = 'TmdbApiError'
    this.statusCode = statusCode
  }
}

/**
 * TMDB is called server-side only. The bearer token from the server
 * environment never reaches the browser bundle.
 */
export async function tmdbFetch<T>(path: string, params: Record<string, string | number | undefined> = {}): Promise<T> {
  const url = new URL(`${TMDB_BASE_URL}${path}`)
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue
    url.searchParams.set(key, String(value))
  }

  const request = async (): Promise<T> => {
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${env.tmdbApiKey}`, Accept: 'application/json' },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      cache: 'no-store',
    })
    const payload = (await response.json().catch(() => null)) as TmdbEnvelope<T> | TmdbErrorBody | null

    if (!response.ok) {
      const statusCode =
        (payload && typeof payload === 'object' && typeof (payload as TmdbErrorBody).statusCode === 'number'
          ? (payload as TmdbErrorBody).statusCode
          : response.status) as number
      const message =
        (payload && typeof payload === 'object' && typeof (payload as TmdbErrorBody).message === 'string'
          ? (payload as TmdbErrorBody).message
          : 'The movie database request failed.') as string
      throw new TmdbApiError(statusCode, message)
    }

    const data = payload && typeof payload === 'object' ? (payload as TmdbEnvelope<T>).data : undefined
    if (data === undefined) {
      throw new Error('The movie database returned an unexpected response shape.')
    }
    return data
  }

  async function execute(attempt: number): Promise<T> {
    try {
      return await enqueueUpstream(() => request())
    } catch (error) {
      if (error instanceof TmdbApiError) {
        if (error.statusCode === 404) {
          throw notFound('No matching title was found on the movie database.')
        }
        if (error.statusCode === 401 || error.statusCode === 403) {
          throw serviceUnavailable(
            'The movie database rejected the server credentials. Check the API key and plan access.',
            'tmdb_auth',
          )
        }
        if (error.statusCode === 429) {
          if (attempt + 1 < MAX_ATTEMPTS) {
            await delay(RETRY_DELAY_MS)
            return execute(attempt + 1)
          }
          throw serviceUnavailable(
            'The movie database rate limit was reached. Please try again shortly.',
            'tmdb_rate_limited',
          )
        }
        throw serviceUnavailable('The movie database request failed. Please try again.', 'tmdb_upstream_error')
      }
      if (error instanceof Error && (error.name === 'AbortError' || error.name === 'TimeoutError')) {
        throw serviceUnavailable('The movie database request timed out. Please try again.', 'tmdb_timeout')
      }
      if (attempt + 1 < MAX_ATTEMPTS) {
        await delay(RETRY_DELAY_MS)
        return execute(attempt + 1)
      }
      throw serviceUnavailable('Could not reach the movie database.', 'tmdb_unreachable')
    }
  }

  return execute(0)
}

/* ------------------------------------------------------------------ */
/* Raw upstream payload shapes used by the playback catalog.           */
/* ------------------------------------------------------------------ */

export interface RawTmdbMovie {
  id: number
  title?: string | null
  name?: string | null
  release_date?: string | null
  overview?: string | null
  runtime?: number | null
  poster_path?: string | null
  backdrop_path?: string | null
  genres?: Array<{ id: number; name: string }> | null
}

export interface RawTmdbSeason {
  season_number: number
  name?: string | null
  overview?: string | null
  episode_count?: number
  air_date?: string | null
}

export interface RawTmdbEpisode {
  season_number: number
  episode_number: number
  name?: string | null
  overview?: string | null
  air_date?: string | null
  runtime_minutes?: number | null
}

export interface RawTmdbSeries {
  id: number
  name?: string | null
  overview?: string | null
  runtime?: number | null
  poster_path?: string | null
  backdrop_path?: string | null
  genres?: Array<{ id: number; name: string }> | null
  first_air_date?: string | null
  release_date?: string | null
  seasons?: RawTmdbSeason[] | null
}

export interface RawTmdbSeasonPage {
  episodes?: RawTmdbEpisode[] | null
}

/* ------------------------------------------------------------------ */
/* Normalized playback records returned to the client.                */
/* ------------------------------------------------------------------ */

export interface TmdbMovieRecord {
  tmdbId: number
  mediaType: 'movie'
  title: string
  year: number | null
  overview: string | null
  runtimeMinutes: number | null
  poster: string | null
  backdrop: string | null
  genres: string[]
}

export interface TmdbSeasonRecord {
  seasonNumber: number
  name: string | null
  episodeCount: number
  airDate: string | null
  overview: string | null
}

export interface TmdbEpisodeRecord {
  seasonNumber: number
  episodeNumber: number
  name: string
  airDate: string | null
  runtimeMinutes: number | null
  overview: string | null
}

export interface TmdbSeriesRecord {
  tmdbId: number
  mediaType: 'tv'
  title: string
  year: number | null
  overview: string | null
  runtimeMinutes: number | null
  poster: string | null
  backdrop: string | null
  genres: string[]
  seasons: TmdbSeasonRecord[]
}
