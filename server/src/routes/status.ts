import { Router } from 'express'
import { env } from '../env.js'
import { cacheMode } from '../lib/cache.js'

const router = Router()

router.get('/', async (_req, res) => {
  const base = {
    tmdb: env.tmdbConfigured,
    cache: cacheMode(),
    supabase: env.supabaseConfigured ? 'configured' : 'not_configured',
  }

  res.json({ ...base, reachable: env.tmdbConfigured })
})

export default router
