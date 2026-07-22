import { describe, it, expect } from 'vitest'
import { BookingPolicy } from '@/domains/booking/policy'
import { BookingStatus } from '@/types'
import type { BookingAggregate, Actor } from '@/domains/booking/types'

describe('Layer 2: BookingPolicy Unit Tests', () => {
  describe('canCreate', () => {
    it('should disallow creation if customer account is suspended', () => {
      const result = BookingPolicy.canCreate('suspended', 'available')
      expect(result.allowed).toBe(false)
      expect(result.code).toBe('USER_INACTIVE')
    })

    it('should disallow creation if experience is sold out', () => {
      const result = BookingPolicy.canCreate('active', 'sold_out')
      expect(result.allowed).toBe(false)
      expect(result.code).toBe('EXPERIENCE_UNAVAILABLE')
    })

    it('should allow creation for active user and available experience', () => {
      const result = BookingPolicy.canCreate('active', 'available')
      expect(result.allowed).toBe(true)
    })
  })

  describe('canRedeemPoints', () => {
    it('should disallow redemption if requested points exceed available balance', () => {
      const result = BookingPolicy.canRedeemPoints(100, 200)
      expect(result.allowed).toBe(false)
      expect(result.code).toBe('INSUFFICIENT_LOYALTY_POINTS')
    })

    it('should allow valid points redemption within balance', () => {
      const result = BookingPolicy.canRedeemPoints(500, 200)
      expect(result.allowed).toBe(true)
    })
  })

  describe('canConfirm', () => {
    it('should disallow confirmation if status is not PAID', () => {
      const mockBooking = { status: BookingStatus.DRAFT } as BookingAggregate
      const result = BookingPolicy.canConfirm(mockBooking)
      expect(result.allowed).toBe(false)
      expect(result.code).toBe('INVALID_STATUS_FOR_CONFIRMATION')
    })

    it('should allow confirmation if status is PAID', () => {
      const mockBooking = { status: BookingStatus.PAID } as BookingAggregate
      const result = BookingPolicy.canConfirm(mockBooking)
      expect(result.allowed).toBe(true)
    })
  })

  describe('canCancel', () => {
    it('should disallow cancellation if booking is COMPLETED', () => {
      const mockBooking = { status: BookingStatus.COMPLETED } as BookingAggregate
      const actor: Actor = { id: 1, type: 'customer' }
      const result = BookingPolicy.canCancel(mockBooking, actor)
      expect(result.allowed).toBe(false)
      expect(result.code).toBe('BOOKING_ALREADY_COMPLETED')
    })

    it('should disallow customer cancellation within 24 hours of trip start', () => {
      const tomorrow = new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString()
      const mockBooking = { status: BookingStatus.CONFIRMED, startDate: tomorrow } as BookingAggregate
      const actor: Actor = { id: 1, type: 'customer' }

      const result = BookingPolicy.canCancel(mockBooking, actor)
      expect(result.allowed).toBe(false)
      expect(result.code).toBe('CANCELLATION_WINDOW_EXPIRED')
    })

    it('should allow admin cancellation anytime before completion', () => {
      const tomorrow = new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString()
      const mockBooking = { status: BookingStatus.CONFIRMED, startDate: tomorrow } as BookingAggregate
      const actor: Actor = { id: 'admin1', type: 'admin' }

      const result = BookingPolicy.canCancel(mockBooking, actor)
      expect(result.allowed).toBe(true)
    })
  })
})
