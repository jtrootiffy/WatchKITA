import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { api } from '../lib/api'
import { useToast } from './ToastContext'
import type { TitleType, WatchlistItem } from '../types'

const STORAGE_KEY = 'watchkita.watchlist.v2'
const DEVICE_KEY = 'watchkita.device'
const MAX_ITEMS = 200
const VALID_TYPES: TitleType[] = [
  'movie',
  'tv_series',
  'tv_special',
  'tv_miniseries',
  'tv_movie',
  'short_film',
]

interface WatchlistContextValue {
  items: WatchlistItem[]
  count: number
  has: (titleId: number) => boolean
  add: (item: WatchlistItem) => void
  remove: (titleId: number) => void
  toggle: (item: WatchlistItem) => void
  clear: () => void
  cloudBackup: boolean
}

const WatchlistContext = createContext<WatchlistContextValue | undefined>(undefined)

function isHttpUrl(value: string): boolean {
  return /^https?:\/\//i.test(value)
}

function sanitizeItem(raw: unknown): WatchlistItem | null {
  if (!raw || typeof raw !== 'object') return null
  const item = raw as Partial<WatchlistItem>

  if (typeof item.titleId !== 'number' || !Number.isInteger(item.titleId) || item.titleId <= 0) {
    return null
  }
  if (typeof item.title !== 'string' || item.title.trim().length === 0) return null
  if (!VALID_TYPES.includes(item.type as TitleType)) return null

  return {
    titleId: item.titleId,
    title: item.title.trim(),
    year: typeof item.year === 'number' ? item.year : null,
    type: item.type as TitleType,
    poster: typeof item.poster === 'string' && isHttpUrl(item.poster) ? item.poster : null,
  }
}

function dedupe(items: WatchlistItem[]): WatchlistItem[] {
  const seen = new Set<number>()
  const result: WatchlistItem[] = []
  for (const item of items) {
    if (seen.has(item.titleId)) continue
    seen.add(item.titleId)
    result.push(item)
  }
  return result
}

function readStored(): WatchlistItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return dedupe(
      parsed
        .map(sanitizeItem)
        .filter((item): item is WatchlistItem => item !== null)
        .slice(0, MAX_ITEMS),
    )
  } catch {
    return []
  }
}

function getDeviceId(): string {
  try {
    const existing = localStorage.getItem(DEVICE_KEY)
    if (existing && /^[0-9a-f-]{36}$/i.test(existing)) return existing
    const created =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `00000000-0000-4000-8000-${Date.now().toString(16).slice(-12).padStart(12, '0')}`
    localStorage.setItem(DEVICE_KEY, created)
    return created
  } catch {
    return '00000000-0000-4000-8000-000000000000'
  }
}

function mergeWithRemote(local: WatchlistItem[], remote: WatchlistItem[]): WatchlistItem[] {
  const merged = [...local]
  const seen = new Set(local.map((item) => item.titleId))
  for (const item of remote) {
    const sanitized = sanitizeItem(item)
    if (!sanitized || seen.has(sanitized.titleId)) continue
    seen.add(sanitized.titleId)
    merged.push(sanitized)
  }
  return merged.slice(0, MAX_ITEMS)
}

export function WatchlistProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<WatchlistItem[]>(readStored)
  const [cloudBackup, setCloudBackup] = useState(false)
  const { addToast } = useToast()
  const deviceId = useRef<string>('')

  if (!deviceId.current) deviceId.current = getDeviceId()

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
    } catch {
      // Storage quota or privacy mode: the in-memory list still works.
    }
  }, [items])

  // Restore a cloud copy once, then mirror local changes back when available.
  useEffect(() => {
    let active = true

    api.watchlist
      .get(deviceId.current)
      .then((response) => {
        if (!active) return
        setItems((current) => mergeWithRemote(current, response.items))
        setCloudBackup(response.available)
      })
      .catch(() => {
        if (active) setCloudBackup(false)
      })

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (!cloudBackup) return
    const timer = setTimeout(() => {
      void api.watchlist.put(deviceId.current, items).catch(() => {
        // Keep the browser copy authoritative if the backup fails.
      })
    }, 1500)
    return () => clearTimeout(timer)
  }, [items, cloudBackup])

  const has = useCallback(
    (titleId: number) => items.some((item) => item.titleId === titleId),
    [items],
  )

  const add = useCallback(
    (item: WatchlistItem) => {
      const sanitized = sanitizeItem(item)
      if (!sanitized) return

      setItems((current) => {
        if (current.some((entry) => entry.titleId === sanitized.titleId)) {
          addToast('Already in your watchlist', 'info')
          return current
        }
        if (current.length >= MAX_ITEMS) {
          addToast('Your watchlist is full', 'info')
          return current
        }
        addToast('Added to watchlist', 'success')
        return [sanitized, ...current]
      })
    },
    [addToast],
  )

  const remove = useCallback(
    (titleId: number) => {
      setItems((current) => current.filter((item) => item.titleId !== titleId))
      addToast('Removed from watchlist', 'info')
    },
    [addToast],
  )

  const toggle = useCallback(
    (item: WatchlistItem) => {
      if (has(item.titleId)) remove(item.titleId)
      else add(item)
    },
    [has, add, remove],
  )

  const clear = useCallback(() => {
    setItems([])
    addToast('Watchlist cleared', 'info')
  }, [addToast])

  const value = useMemo(
    () => ({ items, count: items.length, has, add, remove, toggle, clear, cloudBackup }),
    [items, has, add, remove, toggle, clear, cloudBackup],
  )

  return <WatchlistContext.Provider value={value}>{children}</WatchlistContext.Provider>
}

export function useWatchlist(): WatchlistContextValue {
  const context = useContext(WatchlistContext)
  if (!context) throw new Error('useWatchlist must be used within WatchlistProvider')
  return context
}
