import type { NextFunction, Request, Response } from 'express'
import { AppError } from '../lib/errors.js'

export function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json({
    error: {
      code: 'not_found',
      message: 'That API endpoint does not exist.',
      retryable: false,
    },
  })
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (res.headersSent) return

  const isAppError = err instanceof AppError
  const status = isAppError ? err.status : 500
  const code = isAppError ? err.code : 'internal_error'
  const message = isAppError ? err.message : 'Something went wrong on the server.'
  const retryable = isAppError ? err.retryable : false

  if (!isAppError) {
    const detail = err instanceof Error ? err.message : String(err)
    console.error(`[api] unhandled error: ${detail}`)
  } else if (status >= 500) {
    console.warn(`[api] ${code}: ${message}`)
  }

  res.status(status).json({ error: { code, message, retryable } })
}
