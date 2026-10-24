import { Router } from 'express'
import { env } from '../env.js'
import { cacheMode } from '../lib/cache.js'

const router = Router()

router.get('/', (_req, res) => {
  res.json({
    status: env.tmdbConfigured ? 'ok' : 'degraded',
    tmdbConfigured: env.tmdbConfigured,
    cache: cacheMode(),
    timestamp: new Date().toISOString(),
  })
})

export default router
