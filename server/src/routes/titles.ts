import { Router } from 'express'
import { z } from 'zod'
import { TITLE_TYPES } from '../lib/normalize.js'
import {
  getCastCrew,
  getEpisodes,
  getPosters,
  getSeasons,
  getTitleDetails,
  getTitleList,
  getTitleSources,
} from '../services/catalog.js'
import type { TitleFilters } from '../types.js'
import { parseOrThrow, regionSchema, titleIdSchema } from './utils.js'

const router = Router()

const SORT_OPTIONS = [
  'popularity_desc',
  'popularity_asc',
  'release_date_desc',
  'release_date_asc',
  'title_asc',
  'title_desc',
  'relevance_desc',
] as const

const listQuerySchema = z.object({
  types: z.string().optional(),
  genres: z.string().optional(),
  region: regionSchema.optional(),
  sort_by: z.enum(SORT_OPTIONS).default('popularity_desc'),
  page: z.coerce.number().int().min(1).max(500).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(24),
  year: z.coerce.number().int().min(1888).max(2100).optional(),
})

function parseTypes(value: string | undefined): TitleFilters['types'] {
  if (!value) return []
  const parts = value
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)

  if (parts.length > 5) throw new Error('Too many title types requested.')

  const invalid = parts.filter((part) => !(TITLE_TYPES as string[]).includes(part))
  if (invalid.length > 0) {
    throw new Error(`Unsupported title type: ${invalid[0]}.`)
  }

  return [...new Set(parts)] as TitleFilters['types']
}

function parseGenreIds(value: string | undefined): number[] {
  if (!value) return []
  const parts = value.split(',').map((part) => part.trim()).filter(Boolean)
  if (parts.length > 10) throw new Error('Select at most ten genres.')

  const ids = parts.map((part) => Number.parseInt(part, 10))
  if (ids.some((id) => !Number.isInteger(id) || id <= 0 || id > 10_000)) {
    throw new Error('Genre ids must be positive integers.')
  }
  return [...new Set(ids)]
}

/** GET /api/titles — catalog listing backed by Watchmode /list-titles. */
router.get('/', async (req, res, next) => {
  try {
    const query = parseOrThrow(listQuerySchema, req.query)

    let types: TitleFilters['types']
    let genreIds: number[]
    try {
      types = parseTypes(query.types)
      genreIds = parseGenreIds(query.genres)
    } catch (error) {
      res.status(400).json({
        error: {
          code: 'bad_request',
          message: error instanceof Error ? error.message : 'Invalid filter.',
          retryable: false,
        },
      })
      return
    }

    const result = await getTitleList({
      types,
      genreIds,
      region: query.region ?? null,
      sortBy: query.sort_by,
      page: query.page,
      limit: query.limit,
      releaseDateStart: query.year ? `${query.year}0101` : null,
      releaseDateEnd: query.year ? `${query.year}1231` : null,
    })

    res.json(result)
  } catch (error) {
    next(error)
  }
})

/** GET /api/titles/posters?ids=1,2,3 — poster artwork for catalog rows and grids. */
router.get('/posters', async (req, res, next) => {
  try {
    const raw = parseOrThrow(
      z.object({
        ids: z
          .string()
          .min(1, 'At least one title id is required.')
          .regex(/^\d+(,\d+)*$/, 'Ids must be a comma-separated list of numbers.'),
      }),
      req.query,
    )

    const ids = [...new Set(raw.ids.split(',').map((value) => Number.parseInt(value, 10)))]
    if (ids.length > 30) {
      res.status(400).json({
        error: {
          code: 'bad_request',
          message: 'Request at most 30 posters at a time.',
          retryable: false,
        },
      })
      return
    }

    res.json({ posters: await getPosters(ids) })
  } catch (error) {
    next(error)
  }
})

router.get('/:id', async (req, res, next) => {
  try {
    const id = Number.parseInt(parseOrThrow(titleIdSchema, req.params.id), 10)
    const region = parseOrThrow(regionSchema.optional().default('PH'), req.query.region)
    res.json(await getTitleDetails(id, region))
  } catch (error) {
    next(error)
  }
})

router.get('/:id/sources', async (req, res, next) => {
  try {
    const id = Number.parseInt(parseOrThrow(titleIdSchema, req.params.id), 10)
    const region = parseOrThrow(regionSchema.optional().default('PH'), req.query.region)
    res.json(await getTitleSources(id, region))
  } catch (error) {
    next(error)
  }
})

router.get('/:id/cast-crew', async (req, res, next) => {
  try {
    const id = Number.parseInt(parseOrThrow(titleIdSchema, req.params.id), 10)
    res.json(await getCastCrew(id))
  } catch (error) {
    next(error)
  }
})

router.get('/:id/seasons', async (req, res, next) => {
  try {
    const id = Number.parseInt(parseOrThrow(titleIdSchema, req.params.id), 10)
    res.json(await getSeasons(id))
  } catch (error) {
    next(error)
  }
})

router.get('/:id/episodes', async (req, res, next) => {
  try {
    const id = Number.parseInt(parseOrThrow(titleIdSchema, req.params.id), 10)
    const { season } = parseOrThrow(
      z.object({ season: z.coerce.number().int().min(0).max(200).optional() }),
      req.query,
    )
    res.json(await getEpisodes(id, season))
  } catch (error) {
    next(error)
  }
})

export default router
