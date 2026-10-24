import { env } from '../env.js'
import { getSupabase } from './supabase.js'

interface MemoryEntry {
  payload: unknown
  expiresAt: number
}

const MAX_MEMORY_ENTRIES = 400
const memory = new Map<string, MemoryEntry>()
const inFlight = new Map<string, Promise<unknown>>()

let supabaseWarned = false

export function cacheMode(): 'supabase+memory' | 'memory' {
  return getSupabase() ? 'supabase+memory' : 'memory'
}

function readMemory(key: string): { hit: true; payload: unknown } | { hit: false } {
  const entry = memory.get(key)
  if (!entry) return { hit: false }
  if (entry.expiresAt <= Date.now()) {
    memory.delete(key)
    return { hit: false }
  }
  // Refresh insertion order so the oldest entry is evicted first.
  memory.delete(key)
  memory.set(key, entry)
  return { hit: true, payload: entry.payload }
}

function writeMemory(key: string, payload: unknown, ttlMs: number): void {
  memory.set(key, { payload, expiresAt: Date.now() + ttlMs })
  while (memory.size > MAX_MEMORY_ENTRIES) {
    const oldest = memory.keys().next()
    if (oldest.done) break
    memory.delete(oldest.value)
  }
}

async function readSupabase(key: string): Promise<{ hit: true; payload: unknown } | { hit: false }> {
  const supabase = getSupabase()
  if (!supabase) return { hit: false }

  try {
    const { data, error } = await supabase
      .from('api_cache')
      .select('payload, expires_at')
      .eq('key', key)
      .maybeSingle()

    if (error) throw error
    if (!data?.payload) return { hit: false }
    if (new Date(data.expires_at as string).getTime() <= Date.now()) return { hit: false }

    return { hit: true, payload: data.payload }
  } catch {
    if (!supabaseWarned) {
      console.warn('[cache] Supabase cache read failed. Serve continues from memory.')
      supabaseWarned = true
    }
    return { hit: false }
  }
}

async function writeSupabase(key: string, payload: unknown, ttlMs: number): Promise<void> {
  const supabase = getSupabase()
  if (!supabase) return

  try {
    const { error } = await supabase.from('api_cache').upsert(
      {
        key,
        payload,
        expires_at: new Date(Date.now() + ttlMs).toISOString(),
      },
      { onConflict: 'key' },
    )
    if (error) throw error

    // Opportunistic cleanup keeps the table from growing without a cron job.
    if (Math.random() < 0.02) {
      await supabase
        .from('api_cache')
        .delete()
        .lt('expires_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
    }
  } catch {
    if (!supabaseWarned) {
      console.warn('[cache] Supabase cache write failed. Serve continues from memory.')
      supabaseWarned = true
    }
  }
}

/**
 * Reads from memory, then Supabase, and otherwise runs the loader once per key.
 * Concurrent requests for the same key share a single upstream call.
 */
export async function withCache<T>(key: string, ttlMs: number, loader: () => Promise<T>): Promise<T> {
  const fromMemory = readMemory(key)
  if (fromMemory.hit) return fromMemory.payload as T

  const fromSupabase = await readSupabase(key)
  if (fromSupabase.hit) {
    writeMemory(key, fromSupabase.payload, ttlMs)
    return fromSupabase.payload as T
  }

  const existing = inFlight.get(key)
  if (existing) return existing as Promise<T>

  const pending = (async () => {
    try {
      const value = await loader()
      writeMemory(key, value, ttlMs)
      void writeSupabase(key, value, ttlMs)
      return value
    } finally {
      inFlight.delete(key)
    }
  })()

  inFlight.set(key, pending)
  return pending
}

const SHORT_TTL = env.cacheTtl.search

/** Search results are cached briefly and never persisted to Supabase. */
export async function withSearchCache<T>(key: string, loader: () => Promise<T>): Promise<T> {
  const fromMemory = readMemory(key)
  if (fromMemory.hit) return fromMemory.payload as T

  const existing = inFlight.get(key)
  if (existing) return existing as Promise<T>

  const pending = (async () => {
    try {
      const value = await loader()
      writeMemory(key, value, SHORT_TTL)
      return value
    } finally {
      inFlight.delete(key)
    }
  })()

  inFlight.set(key, pending)
  return pending
}
