export type TitleType =
  | 'movie'
  | 'tv_series'
  | 'tv_special'
  | 'tv_miniseries'
  | 'tv_movie'
  | 'short_film'

export interface TitleSummary {
  id: number
  title: string
  year: number | null
  type: TitleType
}

export interface PosterInfo extends TitleSummary {
  poster: string | null
  backdrop: string | null
}

export interface TitleDetails extends PosterInfo {
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
  posterMedium: string | null
  posterLarge: string | null
  trailer: string | null
  trailerThumbnail: string | null
  similarTitles: number[]
  networkNames: string[]
  imdbId: string | null
  tmdbId: number | null
}

export interface ViewingSource {
  sourceId: number
  name: string
  type: string
  region: string
  format: string | null
  price: number | null
  seasons: number | null
  episodes: number | null
  webUrl: string | null
}

export interface CastMember {
  personId: number
  name: string
  type: string
  role: string
  episodeCount: number
  order: number
}

export interface CastCrew {
  cast: CastMember[]
  crew: CastMember[]
}

export interface SeasonSummary {
  id: number
  name: string
  number: number
  episodeCount: number
  airDate: string | null
  overview: string | null
  posterUrl: string | null
}

export interface EpisodeSummary {
  id: number
  name: string
  episodeNumber: number
  seasonNumber: number
  airDate: string | null
  runtimeMinutes: number | null
  overview: string | null
  thumbnailUrl: string | null
}

export interface Genre {
  id: number
  name: string
}

export interface SourceReference {
  id: number
  name: string
  type: string
  logo: string | null
}

export interface Region {
  code: string
  name: string
  flag: string | null
}

export interface PaginatedTitles {
  titles: TitleSummary[]
  page: number
  totalPages: number
  totalResults: number
}

export interface AutocompleteItem {
  id: number
  name: string
  type: TitleType
  year: number | null
  imageUrl: string | null
}

export interface SearchResultsResponse {
  results: SearchResultItem[]
  total: number
}

export interface SearchResultItem {
  id: number
  title: string
  year: number | null
  type: TitleType
}

export interface UpstreamStatus {
  configured: boolean
  reachable: boolean
  cache: string
  supabase: string
  quota?: number | null
  quotaUsed?: number | null
  quotaRemaining?: number | null
  message?: string
}

export interface WatchlistItem {
  titleId: number
  title: string
  year: number | null
  type: TitleType
  poster: string | null
}
