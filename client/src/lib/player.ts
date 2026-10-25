export type CineSrcMediaType = 'movie' | 'tv'

export interface CineSrcEmbedConfig {
  mediaType: CineSrcMediaType
  tmdbId: number
  season?: number
  episode?: number
  autoplay?: boolean
  muted?: boolean
  color?: string
  controls?: boolean
  autonext?: boolean
  autoskip?: boolean
  back?: string
  quality?: string
}

const CINE_SRC_BASE = 'https://cinesrc.st'

/**
 * Builds a CineSrc embed URL from a validated numeric TMDB ID.
 * Only the documented query parameters are emitted. Hex colors use %23.
 */
export function buildCineSrcUrl(config: CineSrcEmbedConfig): string {
  const { mediaType, tmdbId, season, episode, ...params } = config

  const url = new URL(`${CINE_SRC_BASE}/embed/${mediaType}/${String(tmdbId)}`)

  if (params.autoplay !== undefined) url.searchParams.set('autoplay', String(params.autoplay))
  if (params.muted !== undefined) url.searchParams.set('muted', String(params.muted))
  if (params.color) url.searchParams.set('color', params.color.replace(/^#/, '%23'))
  if (params.controls !== undefined) url.searchParams.set('controls', String(params.controls))
  if (params.autonext !== undefined) url.searchParams.set('autonext', String(params.autonext))
  if (params.autoskip !== undefined) url.searchParams.set('autoskip', String(params.autoskip))
  if (params.back) url.searchParams.set('back', params.back)

  if (mediaType === 'tv') {
    if (season !== undefined && season !== null) url.searchParams.set('s', String(season))
    if (episode !== undefined && episode !== null) url.searchParams.set('e', String(episode))
  }

  return url.toString()
}

/**
 * Builds the default WatchKITA watch URL for a movie.
 */
export function buildWatchMovieUrl(tmdbId: number): string {
  return `/watch/movie/${tmdbId}`
}

/**
 * Builds the default WatchKITA watch URL for a TV episode.
 */
export function buildWatchTvUrl(tmdbId: number, season: number, episode: number): string {
  return `/watch/tv/${tmdbId}?season=${season}&episode=${episode}`
}

export interface WatchLinkMeta {
  /** Where the player's back button returns to. */
  back?: string | null
  title?: string | null
  year?: number | null
  poster?: string | null
}

/**
 * Adds the watch page's optional metadata to a watch URL while keeping any
 * season/episode query the URL already carries, so the player header can render
 * the title immediately instead of waiting on a details request.
 */
export function withWatchMeta(url: string, meta: WatchLinkMeta = {}): string {
  const [pathname, search = ''] = url.split('?')
  const params = new URLSearchParams(search)

  if (meta.back) params.set('back', meta.back)
  if (meta.title) params.set('title', meta.title)
  if (meta.year) params.set('year', String(meta.year))
  if (meta.poster) params.set('poster', meta.poster)

  const query = params.toString()
  return query ? `${pathname}?${query}` : pathname
}

/**
 * Builds a watch URL for the first playable entry of a title, with metadata
 * attached for the player page.
 */
export function buildWatchUrl(
  mediaType: CineSrcMediaType,
  tmdbId: number,
  meta: WatchLinkMeta = {},
): string {
  const base = mediaType === 'tv' ? buildWatchTvUrl(tmdbId, 1, 1) : buildWatchMovieUrl(tmdbId)
  return withWatchMeta(base, meta)
}

/**
 * Parses a watch page URL into media type, TMDB id, season, and episode.
 * Returns null when the pathname does not match a known watch route.
 */
export interface WatchRouteParse {
  mediaType: CineSrcMediaType
  tmdbId: number
  season: number | null
  episode: number | null
}

export function parseWatchRoute(pathname: string, search: string): WatchRouteParse | null {
  const movieMatch = pathname.match(/^\/watch\/movie\/(\d{1,12})\/?$/)
  if (movieMatch) {
    const tmdbId = Number.parseInt(movieMatch[1], 10)
    if (Number.isFinite(tmdbId) && tmdbId > 0) {
      return { mediaType: 'movie', tmdbId, season: null, episode: null }
    }
    return null
  }

  const tvMatch = pathname.match(/^\/watch\/tv\/(\d{1,12})\/?$/)
  if (tvMatch) {
    const tmdbId = Number.parseInt(tvMatch[1], 10)
    if (!Number.isFinite(tmdbId) || tmdbId <= 0) return null

    const params = new URLSearchParams(search)
    const seasonRaw = params.get('season')
    const episodeRaw = params.get('episode')

    const season = seasonRaw ? Number.parseInt(seasonRaw, 10) : null
    const episode = episodeRaw ? Number.parseInt(episodeRaw, 10) : null

    if ((season !== null && !Number.isFinite(season)) || (episode !== null && !Number.isFinite(episode))) {
      return null
    }

    return { mediaType: 'tv', tmdbId, season: season ?? 1, episode: episode ?? 1 }
  }

  return null
}

/**
 * Validates that a value is a finite positive integer suitable as a TMDB id.
 */
export function isValidTmdbId(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
}
