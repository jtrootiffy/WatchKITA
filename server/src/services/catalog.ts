import { env } from '../env.js'
import { withCache, withSearchCache } from '../lib/cache.js'
import { normalizeDetails, normalizeType } from '../lib/normalize.js'
import {
  normalizeAutocomplete,
  normalizeCastCrew,
  normalizeEpisodes,
  normalizeGenres,
  normalizePoster,
  normalizeRegions,
  normalizeSeasons,
  normalizeSourceReferences,
  normalizeSources,
  normalizeTitleList,
} from '../lib/normalize.js'
import { watchmodeApi } from '../lib/watchmode.js'
import type {
  AutocompleteItem,
  CastCrew,
  EpisodeSummary,
  Genre,
  PaginatedTitles,
  PosterInfo,
  Region,
  SeasonSummary,
  SourceReference,
  TitleDetails,
  TitleFilters,
  ViewingSource,
} from '../types.js'

const TTL = env.cacheTtl

async function mapWithLimit<T, R>(items: T[], limit: number, task: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length)
  let cursor = 0

  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor
      cursor += 1
      results[index] = await task(items[index])
    }
  })

  await Promise.all(workers)
  return results
}

export async function getTitleList(filters: TitleFilters): Promise<PaginatedTitles> {
  const key = [
    'list:v1',
    filters.types.join(',') || 'all',
    filters.genreIds.join(',') || 'all',
    filters.region ?? 'any',
    filters.sortBy,
    filters.page,
    filters.limit,
    filters.releaseDateStart ?? '-',
    filters.releaseDateEnd ?? '-',
  ].join(':')

  return withCache(key, TTL.list, async () => {
    const payload = await watchmodeApi.listTitles({
      types: filters.types.length > 0 ? filters.types.join(',') : undefined,
      genres: filters.genreIds.length > 0 ? filters.genreIds.join(',') : undefined,
      regions: filters.region ?? undefined,
      sort_by: filters.sortBy,
      page: filters.page,
      limit: filters.limit,
      release_date_start: filters.releaseDateStart ? Number(filters.releaseDateStart) : undefined,
      release_date_end: filters.releaseDateEnd ? Number(filters.releaseDateEnd) : undefined,
    })

    return normalizeTitleList(payload)
  })
}

/** Fetches title details, returning null when a title is no longer in the catalog. */
async function getPosterSafe(id: number): Promise<PosterInfo | null> {
  try {
    return await withCache(`poster:v1:${id}`, TTL.poster, async () => {
      const raw = await watchmodeApi.details(id)
      return normalizePoster(raw)
    })
  } catch {
    return null
  }
}

export async function getPosters(ids: number[]): Promise<PosterInfo[]> {
  const unique = [...new Set(ids)].slice(0, 30)
  const posters = await mapWithLimit(unique, 5, getPosterSafe)
  return posters.filter((poster): poster is PosterInfo => poster !== null)
}

export async function getTitleDetails(id: number, region: string): Promise<TitleDetails> {
  return withCache(`details:v2:${id}:${region}`, TTL.details, async () => {
    const raw = await watchmodeApi.details(id)
    return normalizeDetails(raw, region)
  })
}

export async function getTitleSources(id: number, region: string): Promise<ViewingSource[]> {
  return withCache(`sources:v2:${id}:${region}`, TTL.sources, async () => {
    const raw = await watchmodeApi.sources(id, region)
    return normalizeSources(raw, region)
  })
}

export async function getCastCrew(id: number): Promise<CastCrew> {
  return withCache(`cast:v2:${id}`, TTL.cast, async () => {
    const raw = await watchmodeApi.castCrew(id)
    return normalizeCastCrew(raw)
  })
}

export async function getSeasons(id: number): Promise<SeasonSummary[]> {
  return withCache(`seasons:v2:${id}`, TTL.seasons, async () => {
    const raw = await watchmodeApi.seasons(id)
    return normalizeSeasons(raw)
  })
}

export async function getEpisodes(id: number, season?: number): Promise<EpisodeSummary[]> {
  return withCache(`episodes:v2:${id}:${season ?? 'all'}`, TTL.episodes, async () => {
    const raw = await watchmodeApi.episodes(id, season)
    return normalizeEpisodes(raw)
  })
}

export async function getGenres(): Promise<Genre[]> {
  return withCache('genres:v2', TTL.reference, async () => normalizeGenres(await watchmodeApi.genres()))
}

export async function getSourceReferences(): Promise<SourceReference[]> {
  return withCache(
    'source-refs:v2',
    TTL.reference,
    async () => normalizeSourceReferences(await watchmodeApi.sourceReferences()),
  )
}

export async function getRegions(): Promise<Region[]> {
  return withCache('regions:v2', TTL.reference, async () => normalizeRegions(await watchmodeApi.regions()))
}

export interface UpstreamStatus {
  quota: number | null
  quotaUsed: number | null
  quotaRemaining: number | null
}

export async function getUpstreamStatus(): Promise<UpstreamStatus> {
  return withCache('status:v1', TTL.status, async () => {
    const raw = await watchmodeApi.status()
    const quota = typeof raw.quota === 'number' ? raw.quota : null
    const quotaUsed = typeof raw.quotaUsed === 'number' ? raw.quotaUsed : null
    return {
      quota,
      quotaUsed,
      quotaRemaining: quota !== null && quotaUsed !== null ? Math.max(quota - quotaUsed, 0) : null,
    }
  })
}

export type SearchTypeFilter = 'all' | 'movie' | 'tv'

function matchesType(type: string, filter: SearchTypeFilter): boolean {
  if (filter === 'all') return true
  const normalized = normalizeType(type)
  return filter === 'movie' ? normalized === 'movie' : normalized.startsWith('tv')
}

export async function searchTitles(term: string, typeFilter: SearchTypeFilter): Promise<AutocompleteItem[]> {
  const key = `search:v2:${term.toLowerCase()}:${typeFilter}`

  return withSearchCache(key, async () => {
    const payload = await watchmodeApi.autocomplete(term)
    const results = normalizeAutocomplete(payload.results ?? [])
    return results.filter((item) => matchesType(item.type, typeFilter)).slice(0, 20)
  })
}

export interface FullSearchResult {
  id: number
  title: string
  year: number | null
  type: string
}

export async function searchFull(term: string, typeFilter: SearchTypeFilter): Promise<FullSearchResult[]> {
  const key = `search-full:v2:${term.toLowerCase()}:${typeFilter}`

  return withSearchCache(key, async () => {
    const payload = await watchmodeApi.search(term)
    return (payload.title_results ?? [])
      .filter((item) => item && typeof item.id === 'number' && typeof item.name === 'string')
      .filter((item) => matchesType(item.type, typeFilter))
      .slice(0, 40)
      .map((item) => ({
        id: item.id,
        title: item.name.trim(),
        year: typeof item.year === 'number' ? item.year : null,
        type: normalizeType(item.type),
      }))
  })
}
