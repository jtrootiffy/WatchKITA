import { Router } from 'express'
import { getGenres } from '../services/catalog.js'

const router = Router()

router.get('/', async (_req, res, next) => {
  try {
    res.json(await getGenres())
  } catch (error) {
    next(error)
  }
})

export default router
