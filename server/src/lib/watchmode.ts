import WatchmodeClient, {
  WatchmodeApiError,
  type SortBy,
  type TitleType as SdkTitleType,
} from '@watchmode/api-client'
import { env } from '../env.js'
import { AppError, notFound, serviceUnavailable } from './errors.js'
import { delay, enqueueUpstream } from './upstreamQueue.js'

const REQUEST_TIMEOUT_MS = 15_000

const client = env.watchmodeConfigured
  ? new WatchmodeClient({
      apiKey: env.watchmodeApiKey,
      baseUrl: 'https://api.watchmode.com/v1',
      timeoutMs: REQUEST_TIMEOUT_MS,
    })
  : null

function sdk(): WatchmodeClient {
  if (!client) {
    throw serviceUnavailable(
      'The Watchmode API key is not configured on the server.',
      'api_key_missing',
    )
  }
  return client
}

type SdkResult<T> = { data?: T; error?: unknown; response?: Response }

function mapStatus(status: number, fallback: string): never {
  if (status === 404) throw notFound('That title could not be found.')
  if (status === 401 || status === 403) {
    throw serviceUnavailable(
      'Watchmode rejected the server credentials. Check the API key and plan access.',
      'upstream_auth',
    )
  }
  if (status === 429) {
    throw serviceUnavailable(
      'The Watchmode request limit was reached. Please try again shortly.',
      'upstream_rate_limited',
    )
  }
  if (status === 402) {
    throw serviceUnavailable(
      'This Watchmode plan does not include access to that data.',
      'upstream_plan_restricted',
    )
  }
  throw serviceUnavailable(fallback, 'upstream_error')
}

/**
 * Runs a typed SDK request and converts transport and HTTP failures into
 * application errors. Upstream text is never forwarded because it can echo
 * request details.
 */
const MAX_ATTEMPTS = 2
const RETRY_DELAY_MS = 1200

async function execute<T>(
  operation: () => Promise<SdkResult<T>>,
  fallback: string,
  attempt: number,
): Promise<T> {
  try {
    const result = await operation()

    if (result.error) {
      mapStatus(result.response?.status ?? 0, fallback)
    }
    if (result.data === undefined) {
      throw serviceUnavailable(fallback, 'upstream_error')
    }

    return result.data
  } catch (error) {
    if (error instanceof AppError) {
      // A single paced retry clears short bursts without hammering the API.
      if (error.code === 'upstream_rate_limited' && attempt + 1 < MAX_ATTEMPTS) {
        await delay(RETRY_DELAY_MS)
        return execute(operation, fallback, attempt + 1)
      }
      throw error
    }

    if (error instanceof WatchmodeApiError) {
      mapStatus(error.status, fallback)
    }
    if (error instanceof Error && error.name === 'AbortError') {
      throw serviceUnavailable('The Watchmode request timed out. Please try again.', 'upstream_timeout')
    }

    throw serviceUnavailable('Could not reach the Watchmode API.', 'upstream_unreachable')
  }
}

async function run<T>(operation: () => Promise<SdkResult<T>>, fallback: string): Promise<T> {
  return enqueueUpstream(() => execute(operation, fallback, 0))
}

/* ------------------------------------------------------------------ */
/* Raw upstream payload shapes (only the fields this app relies on).   */
/* ------------------------------------------------------------------ */

export interface RawTitleListItem {
  id: number
  title: string
  year: number | null
  type: string
  popularity_percentile?: number
}

export interface RawTitleDetails {
  id: number
  title?: string
  type?: string
  year?: number | null
  end_year?: number | null
  release_date?: string | null
  runtime_minutes?: number | null
  plot_overview?: string | null
  genres?: number[]
  genre_names?: string[]
  user_rating?: number | null
  critic_score?: number | null
  us_rating?: string | null
  content_ratings?: Record<string, string> | null
  poster?: string | null
  posterMedium?: string | null
  posterLarge?: string | null
  backdrop?: string | null
  trailer?: string | null
  trailer_thumbnail?: string | null
  similar_titles?: number[]
  network_names?: string[] | null
  imdb_id?: string | null
  tmdb_id?: number | null
}

export interface RawSource {
  source_id: number
  name: string
  type: string
  region: string
  ios_url?: string | null
  android_url?: string | null
  web_url?: string | null
  format?: string | null
  price?: number | null
  seasons?: number | null
  episodes?: number | null
}

export interface RawCastMember {
  person_id: number
  type: string
  full_name: string
  role?: string
  episode_count?: number
  order?: number
}

export interface RawSeason {
  id: number
  name: string
  number: number
  episode_count: number
  air_date?: string | null
  overview?: string | null
  poster_url?: string | null
}

export interface RawEpisode {
  id: number
  name: string
  episode_number: number
  season_number: number
  release_date?: string | null
  runtime_minutes?: number | null
  overview?: string | null
  thumbnail_url?: string | null
  sources?: RawSource[]
}

export interface RawGenre {
  id: number
  name: string
}

export interface RawSourceReference {
  id: number
  name: string
  type: string
  logo_100px?: string | null
}

export interface RawRegion {
  country: string
  name: string
  flag?: string | null
}

export interface RawSearchTitle {
  id: number
  name: string
  type: string
  year: number | null
  imdb_id?: string | null
  tmdb_id?: number | null
}

export interface RawAutocompleteResult {
  id: number
  name: string
  type: string
  year: number | null
  image_url?: string | null
}

export interface ListTitlesQuery {
  types?: string
  genres?: string
  regions?: string
  sort_by?: string
  page?: number
  limit?: number
  release_date_start?: number
  release_date_end?: number
}

/* ------------------------------------------------------------------ */
/* Endpoint adapters                                                   */
/* ------------------------------------------------------------------ */

function toNumber(value: string | undefined): number | undefined {
  if (!value) return undefined
  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) ? parsed : undefined
}

export const watchmodeApi = {
  listTitles(query: ListTitlesQuery) {
    return run(
      () =>
        sdk().title.list({
          types: query.types ? (query.types.split(',') as SdkTitleType[]) : undefined,
          genres: query.genres ? query.genres.split(',').map((value) => Number(value)) : undefined,
          regions: query.regions,
          sortBy: query.sort_by as SortBy | undefined,
          page: query.page,
          limit: query.limit,
          releaseDateStart: toNumber(query.release_date_start ? String(query.release_date_start) : undefined),
          releaseDateEnd: toNumber(query.release_date_end ? String(query.release_date_end) : undefined),
        }) as unknown as Promise<
          SdkResult<{
            titles?: RawTitleListItem[]
            page?: number
            total_pages?: number
            total_results?: number
          }>
        >,
      'The catalog could not be loaded.',
    )
  },

  details(id: number) {
    return run(
      () => sdk().title.getDetails(id) as unknown as Promise<SdkResult<RawTitleDetails>>,
      'Title details could not be loaded.',
    )
  },

  sources(id: number, region: string) {
    return run(
      () =>
        sdk().title.getSources(id, { regions: region }) as unknown as Promise<
          SdkResult<RawSource[]>
        >,
      'Availability could not be loaded.',
    )
  },

  castCrew(id: number) {
    return run(
      () => sdk().title.getCastCrew(id) as unknown as Promise<SdkResult<RawCastMember[]>>,
      'Cast and crew could not be loaded.',
    )
  },

  seasons(id: number) {
    return run(
      () => sdk().title.getSeasons(id) as unknown as Promise<SdkResult<RawSeason[]>>,
      'Season data could not be loaded.',
    )
  },

  episodes(id: number, season?: number) {
    return run(
      () =>
        sdk().title.getEpisodes(id, { season }) as unknown as Promise<SdkResult<RawEpisode[]>>,
      'Episode data could not be loaded.',
    )
  },

  genres() {
    return run(
      () => sdk().reference.getGenres() as unknown as Promise<SdkResult<RawGenre[]>>,
      'Genres could not be loaded.',
    )
  },

  sourceReferences() {
    return run(
      () => sdk().sources.list() as unknown as Promise<SdkResult<RawSourceReference[]>>,
      'Provider references could not be loaded.',
    )
  },

  regions() {
    return run(
      () => sdk().reference.getRegions() as unknown as Promise<SdkResult<RawRegion[]>>,
      'Regions could not be loaded.',
    )
  },

  search(term: string) {
    return run(
      () =>
        sdk().search.byName(term, { types: ['movie', 'tv'] }) as unknown as Promise<
          SdkResult<{ title_results?: RawSearchTitle[]; people_results?: unknown[] }>
        >,
      'Search could not be completed.',
    )
  },

  autocomplete(term: string) {
    return run(
      () =>
        sdk().search.autocomplete(term) as unknown as Promise<
          SdkResult<{ results?: RawAutocompleteResult[] }>
        >,
      'Search suggestions could not be loaded.',
    )
  },

  status() {
    return run(
      () =>
        sdk().account.getStatus() as unknown as Promise<
          SdkResult<{ quota?: number; quotaUsed?: number }>
        >,
      'Account status could not be loaded.',
    )
  },
}
