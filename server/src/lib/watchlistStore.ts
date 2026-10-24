import { getSupabase } from './supabase.js'
import type { TitleType } from '../types.js'

export interface StoredWatchlistItem {
  titleId: number
  title: string
  year: number | null
  type: TitleType
  poster: string | null
}

interface WatchlistRow {
  title_id: number
  title: string
  year: number | null
  title_type: string
  poster: string | null
}

export async function readWatchlist(deviceId: string): Promise<StoredWatchlistItem[] | null> {
  const supabase = getSupabase()
  if (!supabase) return null

  const { data, error } = await supabase
    .from('watchlist_items')
    .select('title_id, title, year, title_type, poster')
    .eq('device_id', deviceId)
    .order('created_at', { ascending: false })

  if (error) throw new Error('watchlist_read_failed')

  return ((data ?? []) as WatchlistRow[]).map((row) => ({
    titleId: row.title_id,
    title: row.title,
    year: row.year,
    type: row.title_type as TitleType,
    poster: row.poster,
  }))
}

export async function replaceWatchlist(
  deviceId: string,
  items: StoredWatchlistItem[],
): Promise<StoredWatchlistItem[]> {
  const supabase = getSupabase()
  if (!supabase) throw new Error('watchlist_unavailable')

  const { error: deleteError } = await supabase
    .from('watchlist_items')
    .delete()
    .eq('device_id', deviceId)
  if (deleteError) throw new Error('watchlist_replace_failed')

  if (items.length > 0) {
    const { error: insertError } = await supabase.from('watchlist_items').insert(
      items.map((item) => ({
        device_id: deviceId,
        title_id: item.titleId,
        title: item.title,
        year: item.year,
        title_type: item.type,
        poster: item.poster,
      })),
    )
    if (insertError) throw new Error('watchlist_replace_failed')
  }

  return items
}
