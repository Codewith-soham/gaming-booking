export class ServiceError extends Error {
  constructor(code, message, details) {
    super(message)
    this.name = 'ServiceError'
    this.code = code
    this.details = details
  }
}

export function isServiceError(err) {
  return err instanceof ServiceError
}
