export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN'

/**
 * Gateway Circuit Breaker
 * Protects maintenance jobs from hanging or infinitely failing when payment gateways are down.
 */
export class GatewayCircuitBreaker {
  private state: CircuitState = 'CLOSED'
  private failureCount = 0
  private readonly failureThreshold: number
  private readonly resetTimeoutMs: number
  private lastStateChange: number = Date.now()

  constructor(failureThreshold = 3, resetTimeoutMs = 30000) {
    this.failureThreshold = failureThreshold
    this.resetTimeoutMs = resetTimeoutMs
  }

  getState(): CircuitState {
    if (this.state === 'OPEN' && Date.now() - this.lastStateChange > this.resetTimeoutMs) {
      this.state = 'HALF_OPEN'
      this.lastStateChange = Date.now()
    }
    return this.state
  }

  recordSuccess(): void {
    this.failureCount = 0
    this.state = 'CLOSED'
    this.lastStateChange = Date.now()
  }

  recordFailure(): void {
    this.failureCount += 1
    if (this.failureCount >= this.failureThreshold) {
      this.state = 'OPEN'
      this.lastStateChange = Date.now()
    }
  }

  isOpen(): boolean {
    return this.getState() === 'OPEN'
  }
}
