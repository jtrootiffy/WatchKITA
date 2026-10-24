import { Router } from 'express'
import { z } from 'zod'
import { badRequest } from '../lib/errors.js'
import { getTmdbMovie, getTmdbSeasonEpisodes, getTmdbSeries } from '../services/tmdb.js'
import { parseOrThrow } from './utils.js'

const router = Router()

const tmdbIdSchema = z.string().regex(/^\d{1,12}$/, 'A numeric TMDB id is required.')
const seasonSchema = z.coerce.number().int().min(0).max(999)

function parseTmdbId(value: string): number {
  const id = Number.parseInt(parseOrThrow(tmdbIdSchema, value), 10)
  if (id <= 0) {
    throw badRequest('A positive TMDB id is required.')
  }
  return id
}

/** GET /api/tmdb/movies/:tmdbId — movie metadata via TMDB by real TMDB id. */
router.get('/movies/:tmdbId', async (req, res, next) => {
  try {
    const tmdbId = parseTmdbId(req.params.tmdbId)
    res.json(await getTmdbMovie(tmdbId))
  } catch (error) {
    next(error)
  }
})

/** GET /api/tmdb/tv/:tmdbId — TV series metadata via TMDB by real TMDB id. */
router.get('/tv/:tmdbId', async (req, res, next) => {
  try {
    const tmdbId = parseTmdbId(req.params.tmdbId)
    res.json(await getTmdbSeries(tmdbId))
  } catch (error) {
    next(error)
  }
})

/** GET /api/tmdb/tv/:tmdbId/seasons/:season — episodes for one season via TMDB. */
router.get('/tv/:tmdbId/seasons/:season', async (req, res, next) => {
  try {
    const tmdbId = parseTmdbId(req.params.tmdbId)
    const season = parseOrThrow(seasonSchema, req.params.season)
    res.json(await getTmdbSeasonEpisodes(tmdbId, season))
  } catch (error) {
    next(error)
  }
})

export default router
