import { createApp } from './app.js'
import { env } from './env.js'

const app = createApp()

// Local development: start HTTP server when run directly.
// Serverless: export the app for Vercel's Express framework.
if (process.argv[1]?.includes('index.ts') || process.argv[1]?.includes('index.js')) {
  const server = app.listen(env.port, () => {
    console.log(`[server] WatchKITA API listening on http://localhost:${env.port}`)
    console.log(`[server] TMDB key: ${env.tmdbConfigured ? 'configured' : 'missing'}`)
    console.log(`[server] Cache: ${env.supabaseConfigured ? 'supabase + memory' : 'memory only'}`)
  })

  function shutdown(signal: string) {
    console.log(`[server] ${signal} received, closing.`)
    server.close(() => process.exit(0))
  }

  process.on('SIGINT', () => shutdown('SIGINT'))
  process.on('SIGTERM', () => shutdown('SIGTERM'))
}

export default app
