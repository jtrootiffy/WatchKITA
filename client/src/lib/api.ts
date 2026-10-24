import type {
  AutocompleteItem,
  CastCrew,
  EpisodeSummary,
  Genre,
  PaginatedTitles,
  PosterInfo,
  Region,
  SearchResultsResponse,
  SeasonSummary,
  SourceReference,
  TitleDetails,
  TitleType,
  UpstreamStatus,
  ViewingSource,
  WatchlistItem,
} from '../types'

const BASE = '/api'

export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly retryable: boolean

  constructor(status: number, code: string, message: string, retryable = false) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.retryable = retryable
  }
}

type Params = Record<string, string | number | boolean | undefined | null>

function buildUrl(path: string, params?: Params): string {
  const url = new URL(`${BASE}${path}`, window.location.origin)
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value === undefined || value === null || value === '') continue
      url.searchParams.set(key, String(value))
    }
  }
  return url.toString()
}

async function request<T>(
  path: string,
  options: { params?: Params; signal?: AbortSignal; method?: 'GET' | 'PUT'; body?: unknown } = {},
): Promise<T> {
  let response: Response

  try {
    response = await fetch(buildUrl(path, options.params), {
      method: options.method ?? 'GET',
      signal: options.signal,
      headers: {
        Accept: 'application/json',
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error
    throw new ApiError(0, 'network_error', 'Could not reach the WatchKITA API.', true)
  }

  let payload: unknown = null
  try {
    payload = await response.json()
  } catch {
    payload = null
  }

  if (!response.ok) {
    const body = payload as
      | { error?: { code?: string; message?: string; retryable?: boolean } }
      | null
    throw new ApiError(
      response.status,
      body?.error?.code ?? 'request_failed',
      body?.error?.message ?? 'The request failed. Please try again.',
      body?.error?.retryable ?? response.status >= 500,
    )
  }

  return payload as T
}

export interface TitleQuery {
  types?: TitleType[]
  genreIds?: number[]
  region?: string | null
  sortBy?: string
  page?: number
  limit?: number
  year?: number | null
}

export const api = {
  health: () => request<{ status: string }>('/health'),

  status: () => request<UpstreamStatus>('/status'),

  regions: () => request<Region[]>('/regions'),

  genres: () => request<Genre[]>('/genres'),

  sourceReferences: () => request<SourceReference[]>('/sources'),

  titles: (query: TitleQuery, signal?: AbortSignal) =>
    request<PaginatedTitles>('/titles', {
      signal,
      params: {
        types: query.types?.length ? query.types.join(',') : undefined,
        genres: query.genreIds?.length ? query.genreIds.join(',') : undefined,
        region: query.region ?? undefined,
        sort_by: query.sortBy,
        page: query.page,
        limit: query.limit,
        year: query.year ?? undefined,
      },
    }),

  posters: (ids: number[], signal?: AbortSignal) =>
    request<{ posters: PosterInfo[] }>('/titles/posters', {
      signal,
      params: { ids: ids.join(',') },
    }),

  title: (id: number, region: string, signal?: AbortSignal) =>
    request<TitleDetails>(`/titles/${id}`, { params: { region }, signal }),

  sources: (id: number, region: string, signal?: AbortSignal) =>
    request<ViewingSource[]>(`/titles/${id}/sources`, { params: { region }, signal }),

  cast: (id: number, signal?: AbortSignal) =>
    request<CastCrew>(`/titles/${id}/cast-crew`, { signal }),

  seasons: (id: number, signal?: AbortSignal) =>
    request<SeasonSummary[]>(`/titles/${id}/seasons`, { signal }),

  episodes: (id: number, season: number, signal?: AbortSignal) =>
    request<EpisodeSummary[]>(`/titles/${id}/episodes`, { params: { season }, signal }),

  autocomplete: (q: string, type: 'all' | 'movie' | 'tv', signal?: AbortSignal) =>
    request<{ results: AutocompleteItem[] }>('/autocomplete', {
      params: { q, type },
      signal,
    }),

  search: (q: string, type: 'all' | 'movie' | 'tv', signal?: AbortSignal) =>
    request<SearchResultsResponse>('/search', { params: { q, type }, signal }),

  watchlist: {
    get: (device: string) =>
      request<{ items: WatchlistItem[]; available: boolean }>('/watchlist', { params: { device } }),
    put: (device: string, items: WatchlistItem[]) =>
      request<{ items: WatchlistItem[] }>('/watchlist', {
        method: 'PUT',
        params: { device },
        body: { items },
      }),
  },
}

export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message
  if (error instanceof Error && error.name !== 'AbortError') {
    return 'Something went wrong while loading this content.'
  }
  return 'Something went wrong while loading this content.'
}
