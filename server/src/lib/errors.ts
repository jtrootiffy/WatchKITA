/** Application error with a safe, client-facing message. */
export class AppError extends Error {
  readonly status: number
  readonly code: string
  readonly retryable: boolean

  constructor(status: number, code: string, message: string, retryable = false) {
    super(message)
    this.name = 'AppError'
    this.status = status
    this.code = code
    this.retryable = retryable
  }
}

export const badRequest = (message: string): AppError =>
  new AppError(400, 'bad_request', message)

export const notFound = (message: string): AppError =>
  new AppError(404, 'not_found', message)

export const serviceUnavailable = (message: string, code = 'upstream_unavailable'): AppError =>
  new AppError(503, code, message, true)
