import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { env } from '../env.js'

let client: SupabaseClient | null | undefined
let warned = false

/** Returns a service-role Supabase client, or null when Supabase is not configured. */
export function getSupabase(): SupabaseClient | null {
  if (client !== undefined) return client

  if (!env.supabaseConfigured) {
    client = null
    return client
  }

  try {
    client = createClient(env.supabaseUrl, env.supabaseServiceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { 'X-Client-Info': 'watchkita-server' } },
    })
  } catch {
    client = null
    if (!warned) {
      console.warn('[supabase] Could not initialise the Supabase client.')
      warned = true
    }
  }

  return client
}

export function supabaseEnabled(): boolean {
  return getSupabase() !== null
}
