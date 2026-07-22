import { describe, it, expect } from 'vitest'
import {
  validateCustomerStatusTransition,
  isCustomerStatusTransitionAllowed,
} from '@/domains/customer/state-machine'

describe('Customer Domain: CustomerStateMachine Unit Tests', () => {
  it('should allow valid transitions: pending_verification -> active -> suspended -> pending_deletion -> deleted', () => {
    expect(isCustomerStatusTransitionAllowed('pending_verification', 'active')).toBe(true)
    expect(isCustomerStatusTransitionAllowed('active', 'suspended')).toBe(true)
    expect(isCustomerStatusTransitionAllowed('suspended', 'pending_deletion')).toBe(true)
    expect(isCustomerStatusTransitionAllowed('pending_deletion', 'deleted')).toBe(true)
  })

  it('should disallow invalid transition from deleted terminal state', () => {
    expect(isCustomerStatusTransitionAllowed('deleted', 'active')).toBe(false)
    expect(() => validateCustomerStatusTransition('deleted', 'active')).toThrow('[CustomerStateMachine] Forbidden status transition')
  })
})
