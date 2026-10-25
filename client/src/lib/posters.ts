import { useEffect, useReducer } from 'react'
import { api } from './api'
import type { PosterInfo, TitleType } from '../types'

/**
 * TMDB list endpoints do not include artwork, while the details endpoint does.
 * Cards request artwork through this queue so a page issues a handful of
 * batched requests instead of one request per card.
 *
 * Movie and TV ids overlap on TMDB, so entries are keyed by media type as well
 * as id — otherwise a series card can be filled with the artwork of a movie
 * that happens to share its id.
 */
const cache = new Map<string, PosterInfo | null>()
const failedAt = new Map<string, number>()
const pending = new Set<string>()
const listeners = new Set<() => void>()

let flushTimer: ReturnType<typeof setTimeout> | null = null
let flushing = false

const MAX_BATCH = 24
const RETRY_AFTER_MS = 5 * 60 * 1000

function posterKey(id: number, type: TitleType | null | undefined): string {
  return `${type ?? 'any'}:${id}`
}

function notify() {
  for (const listener of listeners) listener()
}

function scheduleFlush() {
  if (flushTimer !== null || flushing) return
  flushTimer = setTimeout(() => {
    flushTimer = null
    void flush()
  }, 40)
}

async function flush() {
  if (flushing) return
  flushing = true

  try {
    while (pending.size > 0) {
      const keys = [...pending].slice(0, MAX_BATCH)
      for (const key of keys) pending.delete(key)

      const entries = keys.map((key) => {
        const [rawType, rawId] = key.split(':')
        const type: TitleType | null = rawType === 'movie' ? 'movie' : rawType === 'tv' ? 'tv' : null
        return { key, id: Number.parseInt(rawId, 10), type }
      })

      try {
        const { posters } = await api.posters(
          entries.map((entry) => entry.id),
          entries.map((entry) => entry.type),
        )
        const byKey = new Map(posters.map((poster) => [posterKey(poster.id, poster.type), poster]))
        const byId = new Map(posters.map((poster) => [poster.id, poster]))
        const now = Date.now()
        for (const entry of entries) {
          const poster = byKey.get(entry.key) ?? byId.get(entry.id) ?? null
          cache.set(entry.key, poster)
          if (poster) failedAt.delete(entry.key)
          // Artwork may be missing because the upstream was rate-limited;
          // allow a later retry instead of caching the gap forever.
          else failedAt.set(entry.key, now)
        }
      } catch {
        const now = Date.now()
        for (const entry of entries) failedAt.set(entry.key, now)
      }
    }
  } finally {
    flushing = false
    notify()
    if (pending.size > 0) scheduleFlush()
  }
}

export function requestPoster(id: number, type?: TitleType | null): void {
  const key = posterKey(id, type)
  if (pending.has(key)) return

  const cached = cache.get(key)
  if (cached) return

  const failed = failedAt.get(key)
  if (failed !== undefined) {
    if (Date.now() - failed < RETRY_AFTER_MS) return
    failedAt.delete(key)
    cache.delete(key)
  }

  pending.add(key)
  scheduleFlush()
}

export function getPoster(id: number, type?: TitleType | null): PosterInfo | null | undefined {
  return cache.get(posterKey(id, type))
}

export function subscribeToPosters(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/**
 * Returns cached artwork for a title, enqueueing a batched fetch on mount.
 * `undefined` means "still loading", `null` means "no artwork available".
 */
export function usePoster(
  id: number | undefined,
  type?: TitleType | null,
): PosterInfo | null | undefined {
  const [, rerender] = useReducer((value: number) => value + 1, 0)

  useEffect(() => {
    if (!id) return
    const unsubscribe = subscribeToPosters(rerender)
    requestPoster(id, type)
    return unsubscribe
  }, [id, type])

  if (!id) return undefined
  return cache.get(posterKey(id, type))
}
