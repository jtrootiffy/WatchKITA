import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Request, Response } from 'express'
import { createApp } from '../server/src/app.js'

/**
 * Vercel serverless entry point.
 *
 * vercel.json rewrites every /api/* request to this function and passes the
 * original sub-path in the `__path` query parameter. Local `npm start` and
 * `npm run dev` use server/src/index.ts instead.
 */
const app = createApp()

export default function handler(req: IncomingMessage, res: ServerResponse): void {
  const url = new URL(req.url ?? '/', 'http://localhost')
  const rewritten = url.searchParams.get('__path')

  if (rewritten !== null) {
    url.searchParams.delete('__path')
    const query = url.searchParams.toString()
    req.url = `/api/${rewritten.replace(/^\/+/, '')}${query ? `?${query}` : ''}`
  } else if (!url.pathname.startsWith('/api')) {
    const query = url.searchParams.toString()
    req.url = `/api${url.pathname}${query ? `?${query}` : ''}`
  }

  app(req as unknown as Request, res as unknown as Response)
}
