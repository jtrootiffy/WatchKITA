import { Router } from 'express'
import { getSourceReferences } from '../services/catalog.js'

const router = Router()

router.get('/', async (_req, res, next) => {
  try {
    res.json(await getSourceReferences())
  } catch (error) {
    next(error)
  }
})

export default router
