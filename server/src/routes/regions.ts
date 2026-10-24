import { Router } from 'express'
import { getRegions } from '../services/catalog.js'

const router = Router()

router.get('/', async (_req, res, next) => {
  try {
    res.json(await getRegions())
  } catch (error) {
    next(error)
  }
})

export default router
