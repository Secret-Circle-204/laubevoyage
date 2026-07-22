import type { ProblemDetailsDTO } from './types'

/**
 * Global Error Boundary
 * Catches unhandled domain exceptions, mapping internal errors to clean RFC 7807 Problem Details DTOs.
 */
export class GlobalErrorBoundary {
  static handleException(error: Error | unknown, path?: string): ProblemDetailsDTO {
    const errMessage = error instanceof Error ? error.message : String(error)
    const errName = error instanceof Error ? error.name : 'InternalServerError'

    let status = 500
    let code = 'INTERNAL_SERVER_ERROR'

    if (errMessage.includes('Permission denied')) {
      status = 403
      code = 'PERMISSION_DENIED'
    } else if (errMessage.includes('not found') || errMessage.includes('UNPUBLISHED')) {
      status = 404
      code = 'RESOURCE_NOT_FOUND'
    } else if (errMessage.includes('Invalid') || errMessage.includes('cannot exceed')) {
      status = 400
      code = 'INVALID_INPUT'
    }

    return {
      type: `https://laube-voyage.com/errors/${code.toLowerCase()}`,
      title: errName,
      status,
      detail: errMessage,
      code,
      timestamp: new Date().toISOString(),
      instance: path,
    }
  }
}
