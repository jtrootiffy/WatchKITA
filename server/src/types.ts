/**
 * Normalized data model.
 * TMDB's upstream payloads are intentionally kept out of the client.
 * Every response returned by this server is expressed with the types below.
 */

export type TitleType = 'movie' | 'tv'

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

export interface EpisodeSource {
  sourceId: number
  name: string
  type: string
  region: string
  webUrl: string | null
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
  sources: EpisodeSource[]
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

export interface SearchResponse {
  results: AutocompleteItem[]
  total: number
}

export interface TitleFilters {
  types: TitleType[]
  genreIds: number[]
  region: string | null
  sortBy: string
  page: number
  limit: number
  releaseDateStart: string | null
  releaseDateEnd: string | null
}
