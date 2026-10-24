/**
 * Watchmode rate-limits bursts of requests. All upstream calls pass through
 * this queue so a page with several rails and artwork requests cannot fire
 * dozens of parallel calls at once.
 */
const MAX_CONCURRENT = 2
const MIN_GAP_MS = 220

let active = 0
let lastStartedAt = 0
let pumpTimer: ReturnType<typeof setTimeout> | null = null
const waiting: Array<() => void> = []

function pump(): void {
  pumpTimer = null

  if (active >= MAX_CONCURRENT || waiting.length === 0) return

  const gap = lastStartedAt + MIN_GAP_MS - Date.now()
  if (gap > 0) {
    pumpTimer = setTimeout(pump, gap)
    return
  }

  const start = waiting.shift()
  if (!start) return

  active += 1
  lastStartedAt = Date.now()
  start()
}

export function enqueueUpstream<T>(task: () => Promise<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    waiting.push(() => {
      task()
        .then(resolve, reject)
        .finally(() => {
          active -= 1
          pump()
        })
    })

    if (pumpTimer === null) pump()
  })
}

export function upstreamQueueStats(): { active: number; waiting: number } {
  return { active, waiting: waiting.length }
}

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
