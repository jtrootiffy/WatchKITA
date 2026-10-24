import dotenv from 'dotenv'

dotenv.config()

function readString(name: string, fallback = ''): string {
  const value = process.env[name]
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : fallback
}

const watchmodeApiKey = readString('WATCHMODE_API_KEY')
const tmdbApiKey = readString('TMDB_API_KEY')
const supabaseUrl = readString('SUPABASE_URL').replace(/\/+$/, '')
const supabaseServiceKey = readString('SUPABASE_SERVICE_KEY')

// Accept both legacy JWT service-role keys and newer sb_secret_ keys.
const looksLikeServiceKey =
  supabaseServiceKey.startsWith('eyJ') || supabaseServiceKey.startsWith('sb_secret_')
const supabaseConfigured =
  /^https:\/\/.+\.supabase\.co$/.test(supabaseUrl) && looksLikeServiceKey

export const env = {
  nodeEnv: readString('NODE_ENV', 'development'),
  port: Number.parseInt(readString('PORT', '5000'), 10) || 5000,
  watchmodeApiKey,
  watchmodeConfigured: watchmodeApiKey.length > 0,
  tmdbApiKey,
  tmdbConfigured: tmdbApiKey.length > 0,
  tmdbBaseUrl: readString('TMDB_BASE_URL', 'https://api.themoviedb.org/3'),
  supabaseUrl,
  supabaseServiceKey,
  supabaseConfigured,
  allowedOrigins: readString('ALLOWED_ORIGINS', 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
  cacheTtl: {
    search: 5 * 60 * 1000,
    list: 30 * 60 * 1000,
    details: 24 * 60 * 60 * 1000,
    poster: 7 * 24 * 60 * 60 * 1000,
    sources: 6 * 60 * 60 * 1000,
    cast: 7 * 24 * 60 * 60 * 1000,
    seasons: 24 * 60 * 60 * 1000,
    episodes: 12 * 60 * 60 * 1000,
    tmdbDetails: 24 * 60 * 60 * 1000,
    tmdbEpisodes: 12 * 60 * 60 * 1000,
    reference: 24 * 60 * 60 * 1000,
    status: 60 * 1000,
  },
}

if (!env.watchmodeConfigured) {
  console.warn('[startup] WATCHMODE_API_KEY is not configured. API routes will return 503.')
}

if (!env.tmdbConfigured) {
  console.warn('[startup] TMDB_API_KEY is not configured. Title playback endpoints will return 503.')
}

if (!env.supabaseConfigured) {
  console.warn('[startup] Supabase is not configured. Falling back to in-memory cache only.')
}
