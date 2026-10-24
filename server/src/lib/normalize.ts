import type {
  AutocompleteItem,
  CastCrew,
  CastMember,
  EpisodeSummary,
  Genre,
  PaginatedTitles,
  PosterInfo,
  Region,
  SeasonSummary,
  SourceReference,
  TitleDetails,
  TitleSummary,
  TitleType,
  ViewingSource,
} from '../types.js'
import type {
  RawAutocompleteResult,
  RawCastMember,
  RawEpisode,
  RawGenre,
  RawRegion,
  RawSeason,
  RawSource,
  RawSourceReference,
  RawTitleDetails,
  RawTitleListItem,
} from './watchmode.js'

const VALID_TYPES: TitleType[] = [
  'movie',
  'tv_series',
  'tv_special',
  'tv_miniseries',
  'tv_movie',
  'short_film',
]

export const TITLE_TYPES = VALID_TYPES

const TITLE_TYPE_SET = new Set<string>(VALID_TYPES)

export function isKnownTitleType(value: string | null | undefined): value is TitleType {
  return typeof value === 'string' && TITLE_TYPE_SET.has(value)
}

export function normalizeType(value: string | null | undefined): TitleType {
  if (isKnownTitleType(value)) return value
  return 'movie'
}

/** Returns the value only when it is a real absolute http(s) URL. */
function safeUrl(value: string | null | undefined): string | null {
  if (!value) return null
  const trimmed = value.trim()
  if (!/^https?:\/\//i.test(trimmed)) return null
  return trimmed
}

function finiteNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function cleanString(value: string | null | undefined): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

export function normalizeTitleSummary(raw: RawTitleListItem): TitleSummary | null {
  if (!raw || typeof raw.id !== 'number' || typeof raw.title !== 'string') return null
  const title = raw.title.trim()
  if (!title) return null
  return {
    id: raw.id,
    title,
    year: finiteNumber(raw.year),
    type: normalizeType(raw.type),
  }
}

export function normalizeTitleList(payload: {
  titles?: RawTitleListItem[]
  page?: number
  total_pages?: number
  total_results?: number
}): PaginatedTitles {
  const titles = (payload.titles ?? [])
    .map(normalizeTitleSummary)
    .filter((item): item is TitleSummary => item !== null)

  return {
    titles,
    page: finiteNumber(payload.page) ?? 1,
    totalPages: finiteNumber(payload.total_pages) ?? 1,
    totalResults: finiteNumber(payload.total_results) ?? titles.length,
  }
}

export function normalizePoster(raw: RawTitleDetails): PosterInfo {
  return {
    id: raw.id,
    title: cleanString(raw.title) ?? 'Untitled',
    year: finiteNumber(raw.year),
    type: normalizeType(raw.type),
    poster: safeUrl(raw.poster),
    backdrop: safeUrl(raw.backdrop),
  }
}

export function normalizeDetails(raw: RawTitleDetails, region: string): TitleDetails {
  const contentRatings: Record<string, string> = {}
  if (raw.content_ratings && typeof raw.content_ratings === 'object') {
    for (const [key, value] of Object.entries(raw.content_ratings)) {
      if (typeof value === 'string' && value.trim()) contentRatings[key] = value.trim()
    }
  }

  return {
    id: raw.id,
    title: cleanString(raw.title) ?? 'Untitled',
    year: finiteNumber(raw.year),
    type: normalizeType(raw.type),
    poster: safeUrl(raw.poster),
    posterMedium: safeUrl(raw.posterMedium),
    posterLarge: safeUrl(raw.posterLarge),
    backdrop: safeUrl(raw.backdrop),
    plotOverview: cleanString(raw.plot_overview),
    runtimeMinutes: finiteNumber(raw.runtime_minutes),
    releaseDate: cleanString(raw.release_date),
    endYear: finiteNumber(raw.end_year),
    genres: Array.isArray(raw.genres) ? raw.genres.filter((id) => typeof id === 'number') : [],
    genreNames: Array.isArray(raw.genre_names)
      ? raw.genre_names.filter((name): name is string => typeof name === 'string' && !!name.trim())
      : [],
    userRating: finiteNumber(raw.user_rating),
    criticScore: finiteNumber(raw.critic_score),
    contentRating: contentRatings[region] ?? cleanString(raw.us_rating),
    contentRatings,
    trailer: safeUrl(raw.trailer),
    trailerThumbnail: safeUrl(raw.trailer_thumbnail),
    similarTitles: Array.isArray(raw.similar_titles)
      ? raw.similar_titles.filter((id) => typeof id === 'number')
      : [],
    networkNames: Array.isArray(raw.network_names)
      ? raw.network_names.filter((name): name is string => typeof name === 'string' && !!name.trim())
      : [],
    imdbId: cleanString(raw.imdb_id),
    tmdbId: finiteNumber(raw.tmdb_id),
  }
}

export function normalizeSources(raw: RawSource[], region: string): ViewingSource[] {
  if (!Array.isArray(raw)) return []

  return raw
    .filter((source) => source && typeof source.name === 'string' && source.name.trim())
    .map((source) => ({
      sourceId: source.source_id,
      name: source.name.trim(),
      type: cleanString(source.type) ?? 'unknown',
      region: cleanString(source.region) ?? region,
      format: cleanString(source.format),
      price: finiteNumber(source.price),
      seasons: finiteNumber(source.seasons),
      episodes: finiteNumber(source.episodes),
      webUrl: safeUrl(source.web_url),
    }))
    .filter((source) => source.region === region && source.webUrl !== null)
}

export function normalizeCastCrew(raw: RawCastMember[]): CastCrew {
  if (!Array.isArray(raw)) return { cast: [], crew: [] }

  const members: CastMember[] = raw
    .filter((person) => person && typeof person.full_name === 'string')
    .map((person) => ({
      personId: person.person_id,
      name: person.full_name.trim(),
      type: cleanString(person.type) ?? 'Crew',
      role: cleanString(person.role) ?? '',
      episodeCount: finiteNumber(person.episode_count) ?? 0,
      order: finiteNumber(person.order) ?? 0,
    }))
    .filter((person) => person.name.length > 0)

  const cast = members
    .filter((person) => person.type.toLowerCase() === 'cast')
    .sort((a, b) => a.order - b.order)

  const crew = members.filter((person) => person.type.toLowerCase() !== 'cast')

  return { cast, crew }
}

export function normalizeSeasons(raw: RawSeason[]): SeasonSummary[] {
  if (!Array.isArray(raw)) return []
  return raw
    .filter((season) => season && typeof season.number === 'number')
    .map((season) => ({
      id: season.id,
      name: cleanString(season.name) ?? `Season ${season.number}`,
      number: season.number,
      episodeCount: finiteNumber(season.episode_count) ?? 0,
      airDate: cleanString(season.air_date),
      overview: cleanString(season.overview),
      posterUrl: safeUrl(season.poster_url),
    }))
    .sort((a, b) => a.number - b.number)
}

export function normalizeEpisodes(raw: RawEpisode[]): EpisodeSummary[] {
  if (!Array.isArray(raw)) return []
  return raw
    .filter((episode) => episode && typeof episode.id === 'number')
    .map((episode) => ({
      id: episode.id,
      name: cleanString(episode.name) ?? `Episode ${episode.episode_number}`,
      episodeNumber: finiteNumber(episode.episode_number) ?? 0,
      seasonNumber: finiteNumber(episode.season_number) ?? 0,
      airDate: cleanString(episode.release_date),
      runtimeMinutes: finiteNumber(episode.runtime_minutes),
      overview: cleanString(episode.overview),
      thumbnailUrl: safeUrl(episode.thumbnail_url),
      sources: Array.isArray(episode.sources)
        ? episode.sources.map((source) => ({
            sourceId: source.source_id,
            name: cleanString(source.name) ?? 'Provider',
            type: cleanString(source.type) ?? 'unknown',
            region: cleanString(source.region) ?? '',
            webUrl: safeUrl(source.web_url),
          }))
        : [],
    }))
    .filter((episode) => episode.seasonNumber > 0)
}

export function normalizeGenres(raw: RawGenre[]): Genre[] {
  if (!Array.isArray(raw)) return []
  return raw
    .filter((genre) => genre && typeof genre.id === 'number' && typeof genre.name === 'string')
    .map((genre) => ({ id: genre.id, name: genre.name.trim() }))
    .sort((a, b) => a.name.localeCompare(b.name))
}

export function normalizeSourceReferences(raw: RawSourceReference[]): SourceReference[] {
  if (!Array.isArray(raw)) return []
  return raw
    .filter((source) => source && typeof source.id === 'number' && typeof source.name === 'string')
    .map((source) => ({
      id: source.id,
      name: source.name.trim(),
      type: cleanString(source.type) ?? 'unknown',
      logo: safeUrl(source.logo_100px),
    }))
    .sort((a, b) => a.name.localeCompare(b.name))
}

export function normalizeRegions(raw: RawRegion[]): Region[] {
  if (!Array.isArray(raw)) return []
  return raw
    .filter(
      (region) =>
        region && typeof region.country === 'string' && /^[A-Z]{2}$/.test(region.country.trim()),
    )
    .map((region) => ({
      code: region.country.trim(),
      name: cleanString(region.name) ?? region.country.trim(),
      flag: safeUrl(region.flag),
    }))
    .sort((a, b) => a.name.localeCompare(b.name))
}

export function normalizeAutocomplete(raw: RawAutocompleteResult[]): AutocompleteItem[] {
  if (!Array.isArray(raw)) return []
  return raw
    .filter(
      (item) =>
        item &&
        typeof item.id === 'number' &&
        typeof item.name === 'string' &&
        isKnownTitleType(item.type),
    )
    .map((item) => ({
      id: item.id,
      name: item.name.trim(),
      type: normalizeType(item.type),
      year: finiteNumber(item.year),
      imageUrl: safeUrl(item.image_url),
    }))
    .filter((item) => item.name.length > 0)
}
