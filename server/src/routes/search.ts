import { Router } from 'express'
import { z } from 'zod'
import { searchFull } from '../services/catalog.js'
import { parseOrThrow, searchTermSchema, typeFilterSchema } from './utils.js'

const router = Router()

const querySchema = z.object({
  q: searchTermSchema,
  type: typeFilterSchema.optional(),
})

router.get('/', async (req, res, next) => {
  try {
    const { q, type } = parseOrThrow(querySchema, req.query)
    const results = await searchFull(q, type ?? 'all')
    res.json({ query: q, total: results.length, results })
  } catch (error) {
    next(error)
  }
})

export default router
