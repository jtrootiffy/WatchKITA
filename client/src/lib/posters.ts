import { useEffect, useReducer } from 'react'
import { api } from './api'
import type { PosterInfo } from '../types'

/**
 * Watchmode's list endpoints do not include artwork, while the details
 * endpoint does. Cards request artwork through this queue so a page issues a
 * handful of batched requests instead of one request per card.
 */
const cache = new Map<number, PosterInfo | null>()
const failedAt = new Map<number, number>()
const pending = new Set<number>()
const listeners = new Set<() => void>()

let flushTimer: ReturnType<typeof setTimeout> | null = null
let flushing = false

const MAX_BATCH = 24
const RETRY_AFTER_MS = 5 * 60 * 1000

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
      const ids = [...pending].slice(0, MAX_BATCH)
      for (const id of ids) pending.delete(id)

      try {
        const { posters } = await api.posters(ids)
        const found = new Map(posters.map((poster) => [poster.id, poster]))
        const now = Date.now()
        for (const id of ids) {
          const poster = found.get(id)
          cache.set(id, poster ?? null)
          if (poster) failedAt.delete(id)
          // Artwork may be missing because the upstream was rate-limited;
          // allow a later retry instead of caching the gap forever.
          else failedAt.set(id, now)
        }
      } catch {
        const now = Date.now()
        for (const id of ids) failedAt.set(id, now)
      }
    }
  } finally {
    flushing = false
    notify()
    if (pending.size > 0) scheduleFlush()
  }
}

export function requestPoster(id: number): void {
  if (pending.has(id)) return

  const cached = cache.get(id)
  if (cached) return

  const failed = failedAt.get(id)
  if (failed !== undefined) {
    if (Date.now() - failed < RETRY_AFTER_MS) return
    failedAt.delete(id)
    cache.delete(id)
  }

  pending.add(id)
  scheduleFlush()
}

export function getPoster(id: number): PosterInfo | null | undefined {
  return cache.get(id)
}

export function subscribeToPosters(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/**
 * Returns cached artwork for a title, enqueueing a batched fetch on mount.
 * `undefined` means "still loading", `null` means "no artwork available".
 */
export function usePoster(id: number | undefined): PosterInfo | null | undefined {
  const [, rerender] = useReducer((value: number) => value + 1, 0)

  useEffect(() => {
    if (!id) return
    const unsubscribe = subscribeToPosters(rerender)
    requestPoster(id)
    return unsubscribe
  }, [id])

  if (!id) return undefined
  return cache.get(id)
}
