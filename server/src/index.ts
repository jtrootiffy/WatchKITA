import { createApp } from './app.js'
import { env } from './env.js'

const app = createApp()

const server = app.listen(env.port, () => {
  console.log(`[server] WatchKITA API listening on http://localhost:${env.port}`)
  console.log(`[server] Watchmode key: ${env.watchmodeConfigured ? 'configured' : 'missing'}`)
  console.log(`[server] Cache: ${env.supabaseConfigured ? 'supabase + memory' : 'memory only'}`)
})

function shutdown(signal: string) {
  console.log(`[server] ${signal} received, closing.`)
  server.close(() => process.exit(0))
}

process.on('SIGINT', () => shutdown('SIGINT'))
process.on('SIGTERM', () => shutdown('SIGTERM'))
