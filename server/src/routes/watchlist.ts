import { Router } from 'express'
import { z } from 'zod'
import { supabaseEnabled } from '../lib/supabase.js'
import { readWatchlist, replaceWatchlist } from '../lib/watchlistStore.js'
import { TITLE_TYPES } from '../lib/normalize.js'
import { parseOrThrow } from './utils.js'

const router = Router()

const deviceSchema = z.object({
  device: z
    .string()
    .regex(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      'A valid device identifier is required.',
    ),
})

const itemSchema = z.object({
  titleId: z.number().int().positive(),
  title: z.string().trim().min(1).max(300),
  year: z.number().int().min(1888).max(2100).nullable(),
  type: z.enum(TITLE_TYPES as [string, ...string[]]),
  poster: z.string().url().max(2000).nullable(),
})

const bodySchema = z.object({
  items: z.array(itemSchema).max(200),
})

function unavailable(res: import('express').Response): void {
  res.status(503).json({
    error: {
      code: 'watchlist_unavailable',
      message: 'Cloud watchlist sync is not configured for this deployment.',
      retryable: false,
    },
  })
}

router.get('/', async (req, res, next) => {
  try {
    const { device } = parseOrThrow(deviceSchema, req.query)

    if (!supabaseEnabled()) {
      res.json({ items: [], available: false })
      return
    }

    const items = await readWatchlist(device)
    res.json({ items: items ?? [], available: true })
  } catch (error) {
    next(error)
  }
})

router.put('/', async (req, res, next) => {
  try {
    if (!supabaseEnabled()) return unavailable(res)
    const { device } = parseOrThrow(deviceSchema, req.query)
    const { items } = parseOrThrow(bodySchema, req.body)
    const stored = await replaceWatchlist(
      device,
      items.map((item) => ({
        titleId: item.titleId,
        title: item.title,
        year: item.year,
        type: item.type as (typeof TITLE_TYPES)[number],
        poster: item.poster,
      })),
    )
    res.json({ items: stored })
  } catch (error) {
    next(error)
  }
})

export default router
