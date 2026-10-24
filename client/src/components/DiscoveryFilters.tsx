import { useMemo, useState } from 'react'
import { SlidersHorizontal, X } from 'lucide-react'
import RegionSelector from './RegionSelector'
import type { Genre } from '../types'

export type CatalogTypeFilter = 'all' | 'movie' | 'tv'

export interface CatalogFilters {
  type: CatalogTypeFilter
  genreIds: number[]
  year: number | null
  sortBy: string
}

export const SORT_OPTIONS = [
  { value: 'popularity_desc', label: 'Most popular' },
  { value: 'release_date_desc', label: 'Newest first' },
  { value: 'release_date_asc', label: 'Oldest first' },
  { value: 'title_asc', label: 'Title A–Z' },
  { value: 'title_desc', label: 'Title Z–A' },
] as const

export const DEFAULT_SORT = 'popularity_desc'

interface DiscoveryFiltersProps {
  filters: CatalogFilters
  onChange: (patch: Partial<CatalogFilters>) => void
  genres: Genre[]
  genresLoading?: boolean
  showTypeTabs: boolean
  onReset: () => void
  hasActiveFilters: boolean
}

const CURRENT_YEAR = new Date().getFullYear()
const YEARS = Array.from({ length: CURRENT_YEAR - 1949 }, (_, index) => CURRENT_YEAR - index)

export default function DiscoveryFilters({
  filters,
  onChange,
  genres,
  genresLoading = false,
  showTypeTabs,
  onReset,
  hasActiveFilters,
}: DiscoveryFiltersProps) {
  const [showAllGenres, setShowAllGenres] = useState(false)
  const visibleGenres = useMemo(
    () => (showAllGenres ? genres : genres.slice(0, 10)),
    [genres, showAllGenres],
  )

  const selectedGenres = useMemo(
    () => filters.genreIds.map((id) => genres.find((genre) => genre.id === id)).filter(Boolean),
    [filters.genreIds, genres],
  )

  const toggleGenre = (id: number) => {
    const next = filters.genreIds.includes(id)
      ? filters.genreIds.filter((genreId) => genreId !== id)
      : [...filters.genreIds, id].slice(-3)
    onChange({ genreIds: next })
  }

  return (
    <div className="sticky top-16 z-30 border-y border-line bg-bg lg:top-20">
      <div className="shell py-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          {showTypeTabs ? (
            <div className="flex items-center gap-1" role="group" aria-label="Content type">
              {(
                [
                  { value: 'all', label: 'All' },
                  { value: 'movie', label: 'Movies' },
                  { value: 'tv', label: 'TV Shows' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.value}
                  type="button"
                  aria-pressed={filters.type === tab.value}
                  onClick={() => onChange({ type: tab.value })}
                  className={`px-4 py-2 text-[10px] uppercase tracking-widest transition-colors ${
                    filters.type === tab.value
                      ? 'bg-primary text-white'
                      : 'text-muted hover:bg-surface hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-2 text-muted">
              <SlidersHorizontal size={14} aria-hidden="true" />
              <span className="eyebrow">Refine</span>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <label className="flex items-center gap-2">
              <span className="eyebrow hidden sm:inline">Year</span>
              <select
                value={filters.year ?? ''}
                onChange={(event) =>
                  onChange({ year: event.target.value ? Number(event.target.value) : null })
                }
                className="h-9 border border-line bg-bg px-2 text-xs text-white focus:border-muted focus:outline-none"
                aria-label="Release year"
              >
                <option value="">Any year</option>
                {YEARS.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex items-center gap-2">
              <span className="eyebrow hidden sm:inline">Sort</span>
              <select
                value={filters.sortBy}
                onChange={(event) => onChange({ sortBy: event.target.value })}
                className="h-9 border border-line bg-bg px-2 text-xs text-white focus:border-muted focus:outline-none"
                aria-label="Sort titles"
              >
                {SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <RegionSelector />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2" role="group" aria-label="Genres">
          {genresLoading ? (
            <span className="text-xs text-muted">Loading genres…</span>
          ) : genres.length === 0 ? (
            <span className="text-xs text-muted">Genres are unavailable right now.</span>
          ) : (
            <>
              {visibleGenres.map((genre) => {
                const selected = filters.genreIds.includes(genre.id)
                return (
                  <button
                    key={genre.id}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => toggleGenre(genre.id)}
                    className={`border px-2.5 py-1.5 text-[11px] transition-colors ${
                      selected
                        ? 'border-primary bg-primary text-white'
                        : 'border-line text-muted hover:border-muted hover:text-white'
                    }`}
                  >
                    {genre.name}
                  </button>
                )
              })}
              {genres.length > 10 ? (
                <button
                  type="button"
                  onClick={() => setShowAllGenres((value) => !value)}
                  className="px-1 py-1.5 text-[11px] text-accent underline decoration-accent/50 underline-offset-4 transition-colors hover:text-white"
                >
                  {showAllGenres ? 'Fewer genres' : 'More genres'}
                </button>
              ) : null}
            </>
          )}
        </div>

        {hasActiveFilters ? (
          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line pt-3">
            {selectedGenres.map((genre) =>
              genre ? (
                <button
                  key={genre.id}
                  type="button"
                  onClick={() => toggleGenre(genre.id)}
                  className="flex items-center gap-1.5 bg-surface px-2.5 py-1.5 text-[11px] text-white transition-colors hover:bg-raised"
                  aria-label={`Remove ${genre.name} filter`}
                >
                  {genre.name}
                  <X size={11} aria-hidden="true" />
                </button>
              ) : null,
            )}
            {filters.year ? (
              <button
                type="button"
                onClick={() => onChange({ year: null })}
                className="flex items-center gap-1.5 bg-surface px-2.5 py-1.5 text-[11px] text-white transition-colors hover:bg-raised"
                aria-label={`Remove ${filters.year} filter`}
              >
                {filters.year}
                <X size={11} aria-hidden="true" />
              </button>
            ) : null}
            <button
              type="button"
              onClick={onReset}
              className="ml-1 text-[10px] uppercase tracking-widest text-muted transition-colors hover:text-white"
            >
              Clear all
            </button>
          </div>
        ) : null}
      </div>
    </div>
  )
}
