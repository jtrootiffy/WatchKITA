import { Router } from 'express'
import { env } from '../env.js'
import { cacheMode } from '../lib/cache.js'
import { AppError } from '../lib/errors.js'
import { getUpstreamStatus } from '../services/catalog.js'

const router = Router()

router.get('/', async (_req, res) => {
  const base = {
    watchmode: env.watchmodeConfigured,
    tmdb: env.tmdbConfigured,
    cache: cacheMode(),
    supabase: env.supabaseConfigured ? 'configured' : 'not_configured',
  }

  if (!env.watchmodeConfigured) {
    res.status(503).json({
      ...base,
      reachable: false,
      message: 'The Watchmode API key is not configured on the server.',
    })
    return
  }

  try {
    const status = await getUpstreamStatus()
    res.json({ ...base, reachable: true, ...status })
  } catch (error) {
    const message =
      error instanceof AppError ? error.message : 'The Watchmode API could not be reached.'
    // Status is diagnostic: report the problem without failing the whole UI.
    res.status(200).json({ ...base, reachable: false, message })
  }
})

export default router
