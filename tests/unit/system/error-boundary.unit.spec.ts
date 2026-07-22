import { describe, it, expect } from 'vitest'
import { GlobalErrorBoundary } from '@/domains/system/global-error-boundary'

describe('System Domain: Global Error Boundary Unit Tests', () => {
  it('should format domain exception to RFC 7807 Problem Details DTO', () => {
    const error = new Error('Permission denied: User lacks required permission')
    const problem = GlobalErrorBoundary.handleException(error, '/api/admin/refund')

    expect(problem.status).toBe(403)
    expect(problem.code).toBe('PERMISSION_DENIED')
    expect(problem.detail).toContain('Permission denied')
    expect(problem.instance).toBe('/api/admin/refund')
  })
})
