import type { ViewingSource } from '../types'

export function typeLabel(type: string): string {
  switch (type) {
    case 'movie':
      return 'Movie'
    case 'tv':
    case 'tv_series':
      return 'TV Series'
    case 'tv_miniseries':
      return 'Miniseries'
    case 'tv_special':
      return 'TV Special'
    case 'tv_movie':
      return 'TV Movie'
    case 'short_film':
      return 'Short Film'
    default:
      return 'Title'
  }
}

export function isTv(type: string): boolean {
  return type.startsWith('tv')
}

export function runtimeLabel(minutes: number | null): string | null {
  if (!minutes || minutes <= 0) return null
  const hours = Math.floor(minutes / 60)
  const remaining = minutes % 60
  if (hours === 0) return `${remaining}m`
  if (remaining === 0) return `${hours}h`
  return `${hours}h ${remaining}m`
}

export function userRatingLabel(rating: number | null): string | null {
  if (rating === null || !Number.isFinite(rating)) return null
  return `${rating.toFixed(1)}/10`
}

export function criticScoreLabel(score: number | null): string | null {
  if (score === null || !Number.isFinite(score)) return null
  return `${Math.round(score)}%`
}

export function sourceTypeLabel(type: string): string {
  switch (type) {
    case 'sub':
      return 'Subscription'
    case 'free':
      return 'Free'
    case 'rent':
      return 'Rent'
    case 'buy':
      return 'Buy'
    case 'tve':
      return 'TV Everywhere'
    default:
      return 'Other'
  }
}

const SOURCE_GROUP_ORDER = ['free', 'sub', 'rent', 'buy', 'tve']

export interface SourceGroup {
  type: string
  label: string
  sources: ViewingSource[]
}

export function groupSources(sources: ViewingSource[]): SourceGroup[] {
  const groups = new Map<string, ViewingSource[]>()
  for (const source of sources) {
    const list = groups.get(source.type) ?? []
    list.push(source)
    groups.set(source.type, list)
  }

  return [...groups.entries()]
    .sort(([a], [b]) => {
      const aIndex = SOURCE_GROUP_ORDER.indexOf(a)
      const bIndex = SOURCE_GROUP_ORDER.indexOf(b)
      return (aIndex === -1 ? 99 : aIndex) - (bIndex === -1 ? 99 : bIndex)
    })
    .map(([type, list]) => ({
      type,
      label: sourceTypeLabel(type),
      sources: [...list].sort((a, b) => a.name.localeCompare(b.name)),
    }))
}

export function initials(title: string): string {
  const words = title
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter(Boolean)

  if (words.length === 0) return 'WK'
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  return `${words[0][0]}${words[1][0]}`.toUpperCase()
}

export function formatAirDate(value: string | null): string | null {
  if (!value) return null
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return parsed.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

export function titleCase(value: string): string {
  return value.replace(/\b\w/g, (character) => character.toUpperCase())
}
