import type { TitleType } from '../types.js'

const VALID_TYPES: TitleType[] = ['movie', 'tv']

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

export { safeUrl, finiteNumber, cleanString }
