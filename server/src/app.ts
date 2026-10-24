import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import cors from 'cors'
import express from 'express'
import rateLimit from 'express-rate-limit'
import helmet from 'helmet'
import { env } from './env.js'
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js'
import autocompleteRoutes from './routes/autocomplete.js'
import genresRoutes from './routes/genres.js'
import healthRoutes from './routes/health.js'
import regionsRoutes from './routes/regions.js'
import searchRoutes from './routes/search.js'
import sourcesRoutes from './routes/sources.js'
import statusRoutes from './routes/status.js'
import tmdbRoutes from './routes/tmdb.js'
import titlesRoutes from './routes/titles.js'
import watchlistRoutes from './routes/watchlist.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export function createApp() {
  const app = express()

  app.set('trust proxy', 1)
  app.disable('x-powered-by')

  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  )

  app.use(
    cors((req, callback) => {
      const origin = req.header('Origin')
      const host = req.header('Host')
      let allowed = true

      if (origin) {
        try {
          const parsed = new URL(origin)
          allowed =
            parsed.host === host ||
            env.allowedOrigins.includes(origin) ||
            env.nodeEnv !== 'production'
        } catch {
          allowed = false
        }
      }

      callback(null, {
        origin: allowed ? origin ?? true : false,
        methods: ['GET', 'PUT', 'OPTIONS'],
        allowedHeaders: ['Content-Type'],
        maxAge: 86400,
      })
    }),
  )

  app.use(express.json({ limit: '100kb' }))

  app.use(
    '/api',
    rateLimit({
      windowMs: 5 * 60 * 1000,
      limit: 400,
      standardHeaders: 'draft-7',
      legacyHeaders: false,
      message: {
        error: {
          code: 'rate_limited',
          message: 'Too many requests. Please wait a moment and try again.',
          retryable: true,
        },
      },
    }),
  )

  app.use('/api/health', healthRoutes)
  app.use('/api/status', statusRoutes)
  app.use('/api/search', searchRoutes)
  app.use('/api/autocomplete', autocompleteRoutes)
  app.use('/api/titles', titlesRoutes)
  app.use('/api/genres', genresRoutes)
  app.use('/api/sources', sourcesRoutes)
  app.use('/api/tmdb', tmdbRoutes)
  app.use('/api/regions', regionsRoutes)
  app.use('/api/watchlist', watchlistRoutes)

  app.use('/api', notFoundHandler)

  // Optional single-service mode: serve the built client when it exists.
  const clientDist = path.resolve(__dirname, '../../client/dist')
  if (fs.existsSync(clientDist)) {
    app.use(express.static(clientDist, { maxAge: '1h', index: false }))
    app.get('*', (_req, res) => {
      res.sendFile(path.join(clientDist, 'index.html'))
    })
  }

  app.use(errorHandler)

  return app
}
