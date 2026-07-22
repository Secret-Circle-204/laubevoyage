import { describe, it, expect } from 'vitest'
import { validateTransition, isTransitionAllowed } from '@/domains/booking/state-machine'
import { BookingStatus } from '@/types'

describe('Layer 3: Booking State Machine Unit Tests', () => {
  it('should allow valid unidirectional state transitions', () => {
    expect(isTransitionAllowed(BookingStatus.DRAFT, BookingStatus.PENDING_PAYMENT)).toBe(true)
    expect(isTransitionAllowed(BookingStatus.PENDING_PAYMENT, BookingStatus.PAID)).toBe(true)
    expect(isTransitionAllowed(BookingStatus.PAID, BookingStatus.CONFIRMED)).toBe(true)
    expect(isTransitionAllowed(BookingStatus.CONFIRMED, BookingStatus.COMPLETED)).toBe(true)
  })

  it('should allow cancellation/refund from appropriate states', () => {
    expect(isTransitionAllowed(BookingStatus.PENDING_PAYMENT, BookingStatus.CANCELLED)).toBe(true)
    expect(isTransitionAllowed(BookingStatus.CONFIRMED, BookingStatus.CANCELLED)).toBe(true)
    expect(isTransitionAllowed(BookingStatus.PAID, BookingStatus.REFUNDED)).toBe(true)
    expect(isTransitionAllowed(BookingStatus.CONFIRMED, BookingStatus.REFUNDED)).toBe(true)
  })

  it('should forbid jumping states directly (e.g. Draft -> Completed)', () => {
    expect(isTransitionAllowed(BookingStatus.DRAFT, BookingStatus.COMPLETED)).toBe(false)
    expect(isTransitionAllowed(BookingStatus.DRAFT, BookingStatus.CONFIRMED)).toBe(false)
    expect(() => validateTransition(BookingStatus.DRAFT, BookingStatus.COMPLETED)).toThrowError(
      '[BookingStateMachine] Forbidden transition',
    )
  })

  it('should disallow state transitions out of terminal states (Completed, Cancelled, Refunded)', () => {
    expect(isTransitionAllowed(BookingStatus.COMPLETED, BookingStatus.CONFIRMED)).toBe(false)
    expect(isTransitionAllowed(BookingStatus.CANCELLED, BookingStatus.PAID)).toBe(false)
    expect(isTransitionAllowed(BookingStatus.REFUNDED, BookingStatus.CONFIRMED)).toBe(false)
  })
})
