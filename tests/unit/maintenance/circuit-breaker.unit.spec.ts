import { describe, it, expect } from 'vitest'
import { GatewayCircuitBreaker } from '@/domains/maintenance/circuit-breaker'

describe('Maintenance Domain: Gateway Circuit Breaker Unit Tests', () => {
  it('should trip circuit breaker from CLOSED to OPEN when failure threshold is reached', () => {
    const cb = new GatewayCircuitBreaker(3, 1000)

    expect(cb.isOpen()).toBe(false)
    cb.recordFailure()
    cb.recordFailure()
    expect(cb.isOpen()).toBe(false)

    cb.recordFailure() // 3rd failure trips circuit
    expect(cb.isOpen()).toBe(true)
  })
})
