import type { PayloadRequest } from 'payload'
import type { RequestContext } from '@/types'
import type { TravelerInput } from '@/domains/booking/types'
import type { TravelerRepository } from '@/domains/customer/repositories/traveler-repository'
import type { BookingRepository } from '@/domains/booking/repository'

/**
 * Cross-Domain Application Orchestration Use Case:
 * Single Source of Truth for resolving/creating canonical travelers, linking them to
 * the booking manifest, and recording customer-companion relationships within an active transaction.
 *
 * Architecture Boundary:
 * Pure Application Layer function consumed symmetrically by both:
 * 1. Admin BNPL confirmation (confirmAdminBookingAction)
 * 2. Online Stripe confirmation (BookingPaymentSubscriber)
 *
 * Invariants:
 * - Fail-fast transaction binding (strictly uses the provided active transaction client).
 * - Zero mutation of financial pricing snapshots, payment attempts, capacity locks, or booking status.
 * - Idempotent and safe for empty/undefined traveler manifests.
 */
export async function attachCanonicalTravelersToBooking(params: {
  bookingId: number
  travelers?: TravelerInput[]
  customerId?: number
  travelerRepo: TravelerRepository
  bookingRepo: BookingRepository
  context?: RequestContext
  req?: PayloadRequest
}): Promise<void> {
  const { bookingId, travelers, customerId, travelerRepo, bookingRepo, context, req } = params
  if (!Array.isArray(travelers) || travelers.length === 0) return

  for (let i = 0; i < travelers.length; i++) {
    const order = i + 1
    const travelerInput = travelers[i]

    // 1. Resolve or create canonical traveler record (Customer Domain)
    const canonical = await travelerRepo.resolveOrCreateCanonicalTraveler(travelerInput, req)

    // 2. Attach canonical traveler_id to the booking manifest (Booking Domain persistence)
    await bookingRepo.updateManifestTravelerId(bookingId, order, canonical.id, context)

    // 3. Save customer companion relationship for companions (order > 1) if customer is authenticated
    if (customerId && order > 1) {
      await travelerRepo.saveCompanionRelationship(customerId, canonical.id, 'other', false, req)
    }
  }
}
