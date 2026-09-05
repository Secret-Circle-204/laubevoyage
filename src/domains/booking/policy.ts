import { BookingStatus } from '@/types'
import type {
  Actor,
  BookingAggregate,
  PolicyResult,
  TravelerInput,
  TravelerManifestFieldIssue,
  ManifestDiagnostics,
} from './types'
import { validateTransition, isTransitionAllowed } from './state-machine'

/**
 * Booking Policy
 * Single source of truth for all business validation predicates in the Booking Domain.
 */
export class BookingPolicy {
  /**
   * Authoritative default payment window duration in minutes (15 minutes).
   * Single source of truth for payment lifecycle TTL across the domain.
   */
  public static readonly DEFAULT_PAYMENT_WINDOW_MINUTES = 5

  /**
   * Authoritative admin review decision window in minutes (7 days = 10080 minutes).
   * Single source of truth for admin negotiation decision window TTL.
   */
  public static readonly ADMIN_DECISION_WINDOW_MINUTES = 10080

  /**
   * Compute authoritative payment window expiry instant from booking creation time.
   */
  static calculatePaymentWindowExpiresAt(createdAt: Date): Date {
    return new Date(createdAt.getTime() + this.DEFAULT_PAYMENT_WINDOW_MINUTES * 60 * 1000)
  }

  /**
   * Compute authoritative admin review window expiry instant from booking transition time.
   */
  static calculateAdminReviewWindowExpiresAt(createdAt: Date): Date {
    return new Date(createdAt.getTime() + this.ADMIN_DECISION_WINDOW_MINUTES * 60 * 1000)
  }

  /**
   * Determine if payment window is currently active.
   * Deterministic invariant: active if and only if expiryTime > now.
   */
  static isPaymentWindowActive(expiresAt: string | Date, now: Date): boolean {
    const expiryTime = typeof expiresAt === 'string' ? new Date(expiresAt).getTime() : expiresAt.getTime()
    if (isNaN(expiryTime)) {
      throw new Error(`[BookingPolicy] Invalid paymentWindowExpiresAt timestamp: ${expiresAt}`)
    }
    return expiryTime > now.getTime()
  }

  /**
   * Determine if payment window has expired.
   */
  static isPaymentWindowExpired(expiresAt: string | Date, now: Date): boolean {
    return !this.isPaymentWindowActive(expiresAt, now)
  }

  /**
   * Validate if a new booking can be created for the customer, experience, and departure.
   */
  static canCreate(
    userStatus: string | undefined,
    experienceAvailability: string | undefined,
    bookabilityResult?: { allowed: boolean; code?: string; reason?: string },
  ): PolicyResult {
    if (userStatus === 'suspended' || userStatus === 'inactive') {
      return {
        allowed: false,
        code: 'USER_INACTIVE',
        reason: 'Customer account is suspended or inactive.',
      }
    }

    if (experienceAvailability && experienceAvailability !== 'available') {
      return {
        allowed: false,
        code: 'EXPERIENCE_UNAVAILABLE',
        reason: `Experience is currently ${experienceAvailability}.`,
      }
    }

    if (bookabilityResult && !bookabilityResult.allowed) {
      return {
        allowed: false,
        code: bookabilityResult.code || 'DEPARTURE_NOT_BOOKABLE',
        reason: bookabilityResult.reason || 'Departure is not eligible for booking.',
      }
    }

    return { allowed: true }
  }

  /**
   * Validate if points redemption request is valid.
   */
  static canRedeemPoints(availablePoints: number, requestedPoints: number): PolicyResult {
    if (requestedPoints <= 0) {
      return { allowed: true }
    }

    if (requestedPoints > availablePoints) {
      return {
        allowed: false,
        code: 'INSUFFICIENT_LOYALTY_POINTS',
        reason: `Requested redemption of ${requestedPoints} points exceeds available balance of ${availablePoints}.`,
      }
    }

    return { allowed: true }
  }

  /**
   * Validate if a booking can be confirmed after payment.
   */
  static canConfirm(booking: BookingAggregate): PolicyResult {
    if (booking.status !== BookingStatus.PAID && booking.status !== BookingStatus.PENDING_ADMIN_REVIEW) {
      return {
        allowed: false,
        code: 'INVALID_STATUS_FOR_CONFIRMATION',
        reason: `Cannot confirm booking in '${booking.status}' status. Expected '${BookingStatus.PAID}' or '${BookingStatus.PENDING_ADMIN_REVIEW}'.`,
      }
    }

    if (!isTransitionAllowed(booking.status, BookingStatus.CONFIRMED)) {
      return {
        allowed: false,
        code: 'FORBIDDEN_TRANSITION',
        reason: `State machine forbids transition from '${booking.status}' to '${BookingStatus.CONFIRMED}'.`,
      }
    }

    // Capacity Hold Expiry Check (Sole Source of Truth)
    if (booking.capacityHold) {
      const isPaidOrReview = booking.status === BookingStatus.PAID || booking.status === BookingStatus.PENDING_ADMIN_REVIEW
      if (!isPaidOrReview && (booking.capacityHold.status === 'expired' || booking.capacityHold.status === 'released')) {
        return {
          allowed: false,
          code: 'CAPACITY_HOLD_EXPIRED',
          reason: 'Cannot confirm booking: seat capacity hold has already expired or released.',
        }
      }
      
      if (booking.capacityHold.expiresAt && !isPaidOrReview) {
        const expiresAt = new Date(booking.capacityHold.expiresAt)
        if (new Date() >= expiresAt) {
          return {
            allowed: false,
            code: 'CAPACITY_HOLD_EXPIRED',
            reason: 'Cannot confirm booking: seat capacity hold duration has expired.',
          }
        }
      }
    }

    // PointHold Safety Checks (Prevent confirmation with invalid/expired holds)
    if (booking.pointHold) {
      if (booking.pointHold.status !== 'held') {
        return {
          allowed: false,
          code: 'INVALID_POINT_HOLD_STATUS',
          reason: `Point hold is not in 'held' status. Current status: ${booking.pointHold.status}.`,
        }
      }
      if (booking.pointHold.expiresAt) {
        const pointHoldExpiresAt = new Date(booking.pointHold.expiresAt)
        if (new Date() >= pointHoldExpiresAt) {
          return {
            allowed: false,
            code: 'POINT_HOLD_EXPIRED',
            reason: 'Cannot confirm booking: points hold duration has expired.',
          }
        }
      }
    }

    return { allowed: true }
  }

  /**
   * Determine if a payment is late chronologically.
   * A payment is late if the payment completion time is strictly after the payment window expiration.
   */
  static isPaymentLate(booking: BookingAggregate, paymentCompletedAt?: string): boolean {
    if (!paymentCompletedAt) {
      return false
    }

    const paymentTime = new Date(paymentCompletedAt)
    if (isNaN(paymentTime.getTime())) {
      throw new Error(`[BookingPolicy] Invalid paymentCompletedAt timestamp: ${paymentCompletedAt}`)
    }

    return this.isPaymentWindowExpired(booking.paymentWindowExpiresAt, paymentTime)
  }

  /**
   * Validate if a booking can be cancelled.
   */
  static canCancel(booking: BookingAggregate, actor: Actor): PolicyResult {
    if (booking.status === BookingStatus.COMPLETED) {
      return {
        allowed: false,
        code: 'BOOKING_ALREADY_COMPLETED',
        reason: 'Completed bookings cannot be cancelled.',
      }
    }

    if (booking.status === BookingStatus.CANCELLED || booking.status === BookingStatus.REFUNDED) {
      return {
        allowed: false,
        code: 'BOOKING_ALREADY_CANCELLED',
        reason: `Booking is already in '${booking.status}' state.`,
      }
    }

    // Block paid but unconfirmed bookings from direct cancellation (must be refunded first)
    if (booking.status === BookingStatus.PAID) {
      return {
        allowed: false,
        code: 'PAID_BOOKING_CANNOT_BE_CANCELLED',
        reason: 'Paid bookings must be refunded rather than cancelled.',
      }
    }

    // Customer cancellation window check (e.g. at least 24 hours before trip start)
    if (actor.type === 'customer') {
      const startDate = new Date(booking.startDate)
      const now = new Date()
      const hoursUntilStart = (startDate.getTime() - now.getTime()) / (1000 * 60 * 60)

      if (hoursUntilStart < 24) {
        return {
          allowed: false,
          code: 'CANCELLATION_WINDOW_EXPIRED',
          reason: 'Customer cancellations are not permitted within 24 hours of trip start date.',
        }
      }
    }

    return { allowed: true }
  }

  /**
   * Validate if a booking is eligible for refund.
   */
  static canRefund(booking: BookingAggregate): PolicyResult {
    const isPaidOrConfirmed = booking.status === BookingStatus.PAID || booking.status === BookingStatus.CONFIRMED
    const isCancelledWithPaid = booking.status === BookingStatus.CANCELLED && booking.amountPaid !== undefined && booking.amountPaid > 0

    if (!isPaidOrConfirmed && !isCancelledWithPaid) {
      return {
        allowed: false,
        code: 'INELIGIBLE_FOR_REFUND',
        reason: `Only bookings in PAID, CONFIRMED, or CANCELLED with paid deposit can be refunded. Current state: '${booking.status}', Amount Paid: ${booking.amountPaid || 0}.`,
      }
    }

    return { allowed: true }
  }

  /**
   * Validate if a booking can be marked as completed after trip ends.
   * Strictly compares current instant (now) against the frozen completionAt instant.
   */
  static canComplete(booking: BookingAggregate): PolicyResult {
    if (booking.status !== BookingStatus.CONFIRMED) {
      return {
        allowed: false,
        code: 'INVALID_STATUS_FOR_COMPLETION',
        reason: `Cannot complete booking in '${booking.status}' status. Expected '${BookingStatus.CONFIRMED}'.`,
      }
    }

    if (!booking.completionAt) {
      throw new Error(
        `[BookingPolicy] Booking #${booking.bookingNumber || booking.id} is missing required completionAt operational snapshot.`,
      )
    }

    const completionInstant = new Date(booking.completionAt)
    const now = new Date()

    if (now < completionInstant) {
      return {
        allowed: false,
        code: 'TRIP_NOT_ENDED',
        reason: 'Booking cannot be marked as completed before its operational completion instant.',
      }
    }

    return { allowed: true }
  }

  /**
   * Validate if an existing booking can be reused for checkout under the current parameters.
   */
  static canReuseForCheckout(
    booking: BookingAggregate,
    userId: number,
    experienceId: number,
    departureDate: string,
    requestedCurrencyOrNow?: string | Date,
    requestedGateway?: string,
    now: Date = new Date(),
  ): PolicyResult {
    let requestedCurrency: string | undefined
    let requestedNow = now

    if (requestedCurrencyOrNow instanceof Date) {
      requestedNow = requestedCurrencyOrNow
    } else if (typeof requestedCurrencyOrNow === 'string') {
      requestedCurrency = requestedCurrencyOrNow
    }

    // 1. Validate Customer Identity
    if (booking.customerId !== userId) {
      return {
        allowed: false,
        code: 'IDEMPOTENCY_IDENTITY_MISMATCH',
        reason: 'Existing booking belongs to a different customer.',
      }
    }

    // 2. Validate Experience Identity
    if (booking.experienceId !== experienceId) {
      return {
        allowed: false,
        code: 'IDEMPOTENCY_EXPERIENCE_MISMATCH',
        reason: 'Existing booking belongs to a different experience.',
      }
    }

    // 3. Validate Date Identity (both are now guaranteed YYYY-MM-DD)
    if (booking.startDate !== departureDate) {
      return {
        allowed: false,
        code: 'IDEMPOTENCY_DATE_MISMATCH',
        reason: `Existing booking date (${booking.startDate}) does not match requested date (${departureDate}).`,
      }
    }

    // 4. Enforce Operation State Reuse Rules (Prohibited Terminal/Resolved States)
    if (booking.status === BookingStatus.EXPIRED) {
      return {
        allowed: false,
        code: 'BOOKING_EXPIRED',
        reason: 'The seat reservation hold for this checkout attempt has expired.',
      }
    }

    if (booking.status === BookingStatus.CANCELLED || booking.status === BookingStatus.REFUNDED) {
      return {
        allowed: false,
        code: 'BOOKING_CANCELLED',
        reason: 'The booking for this checkout attempt has been cancelled.',
      }
    }

    if ([BookingStatus.PAID, BookingStatus.CONFIRMED, BookingStatus.COMPLETED].includes(booking.status)) {
      return {
        allowed: false,
        code: 'BOOKING_RESOLVED',
        reason: 'The checkout attempt has already been successfully paid and completed.',
      }
    }

    // 5. Validate Capacity Hold Status ONLY if present (Fixed Package departure slots)
    if (booking.capacityHold && booking.capacityHold.status !== 'active') {
      return {
        allowed: false,
        code: 'BOOKING_CORRUPTED',
        reason: 'The seat reservation hold for this checkout attempt is no longer active.',
      }
    }

    // 6. Enforce Authoritative Payment Window Timeout for Draft/Pending Payment Bookings
    if (booking.status === BookingStatus.DRAFT || booking.status === BookingStatus.PENDING_PAYMENT) {
      if (this.isPaymentWindowExpired(booking.paymentWindowExpiresAt, requestedNow)) {
        return {
          allowed: false,
          code: 'BOOKING_EXPIRED',
          reason: 'The payment window for this checkout attempt has expired.',
        }
      }
    }

    // 7. Validate Currency Intent (Strict Invariant Protection)
    if (requestedCurrency && booking.pricingSnapshot?.displayCurrency !== requestedCurrency) {
      return {
        allowed: false,
        code: 'IDEMPOTENCY_CURRENCY_MISMATCH',
        reason: `Existing booking currency (${booking.pricingSnapshot?.displayCurrency || 'none'}) does not match requested currency (${requestedCurrency}).`,
      }
    }

    // 8. Validate Gateway Intent (Strict Invariant Protection)
    if (requestedGateway) {
      const existingGatewayIsBnpl = booking.status === BookingStatus.PENDING_ADMIN_REVIEW
      const requestedGatewayIsBnpl = requestedGateway === 'bnpl'
      if (existingGatewayIsBnpl !== requestedGatewayIsBnpl) {
        return {
          allowed: false,
          code: 'IDEMPOTENCY_GATEWAY_MISMATCH',
          reason: `Existing booking payment method state does not match requested gateway (${requestedGateway}).`,
        }
      }
    }

    return { allowed: true }
  }

  /**
   * Authoritative Single Source of Truth for Traveler Manifest Diagnostics.
   * Inspects every passenger in the manifest and returns detailed, actionable field-level issues.
   *
   * Invariants:
   * 1. Total manifest count strictly equals expected adults + expected children.
   * 2. travelers[0] (Lead Traveler): Non-empty firstName, lastName, valid email, non-empty phone.
   * 3. Companion travelers (1..N): Non-empty firstName, lastName.
   * 4. Children and infants: Non-empty firstName, lastName, and valid dateOfBirth.
   */
  static diagnoseTravelersManifest(
    travelers: TravelerInput[],
    expectedAdults: number,
    expectedChildren: number = 0,
  ): ManifestDiagnostics {
    const totalExpected = expectedAdults + expectedChildren
    const totalProvided = Array.isArray(travelers) ? travelers.length : 0
    const issues: TravelerManifestFieldIssue[] = []
    const travelerIssuesMap: Record<number, TravelerManifestFieldIssue[]> = {}

    const addIssue = (
      travelerIndex: number,
      travelerType: 'adult' | 'child' | 'infant',
      field: 'firstName' | 'lastName' | 'email' | 'phone' | 'dateOfBirth',
      code: string,
      message: string,
    ) => {
      const issue: TravelerManifestFieldIssue = {
        travelerIndex,
        travelerNumber: travelerIndex + 1,
        travelerType,
        field,
        code,
        message,
      }
      issues.push(issue)
      if (!travelerIssuesMap[travelerIndex]) {
        travelerIssuesMap[travelerIndex] = []
      }
      travelerIssuesMap[travelerIndex].push(issue)
    }

    if (!Array.isArray(travelers) || travelers.length !== totalExpected) {
      return {
        valid: false,
        totalExpected,
        totalProvided,
        issues: [
          {
            travelerIndex: 0,
            travelerNumber: 1,
            travelerType: 'adult',
            field: 'firstName',
            code: 'INVALID_TRAVELER_COUNT',
            message: `Passenger manifest count (${totalProvided}) does not match expected booking composition (${totalExpected} travelers: ${expectedAdults} adults + ${expectedChildren} children).`,
          },
        ],
        travelerIssuesMap: {},
      }
    }

    if (travelers.length === 0) {
      return {
        valid: false,
        totalExpected,
        totalProvided: 0,
        issues: [
          {
            travelerIndex: 0,
            travelerNumber: 1,
            travelerType: 'adult',
            field: 'firstName',
            code: 'EMPTY_TRAVELER_MANIFEST',
            message: 'Passenger manifest cannot be empty.',
          },
        ],
        travelerIssuesMap: {},
      }
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

    for (let i = 0; i < travelers.length; i++) {
      const t = travelers[i]
      const isLead = i === 0
      const travelerType: 'adult' | 'child' | 'infant' =
        t.type || (i < expectedAdults ? 'adult' : 'child')

      // 1. Legal First Name
      if (!t.firstName || !t.firstName.trim()) {
        addIssue(
          i,
          travelerType,
          'firstName',
          isLead ? 'MISSING_LEAD_FIRST_NAME' : 'MISSING_COMPANION_FIRST_NAME',
          "First name is required. Please enter the traveler's legal first name.",
        )
      }

      // 2. Legal Last Name
      if (!t.lastName || !t.lastName.trim()) {
        addIssue(
          i,
          travelerType,
          'lastName',
          isLead ? 'MISSING_LEAD_LAST_NAME' : 'MISSING_COMPANION_LAST_NAME',
          "Last name is required. Please enter the traveler's legal family / last name.",
        )
      }

      // 3. Lead Traveler Contact (Email & Phone)
      if (isLead) {
        if (!t.email || !t.email.trim()) {
          addIssue(
            i,
            travelerType,
            'email',
            'MISSING_LEAD_EMAIL',
            'Booking contact email is required for tickets and itinerary updates.',
          )
        } else if (!emailRegex.test(t.email.trim())) {
          addIssue(
            i,
            travelerType,
            'email',
            'INVALID_LEAD_EMAIL',
            'Please provide a valid booking contact email address (e.g. name@example.com).',
          )
        }

        if (!t.phone || !t.phone.trim()) {
          addIssue(
            i,
            travelerType,
            'phone',
            'MISSING_LEAD_PHONE',
            'Booking contact phone number is required for urgent journey alerts.',
          )
        } else {
          const digitsOnly = t.phone.replace(/\D/g, '')
          // International Telephony Standard (ITU-T E.164): 7 to 15 digits
          const validPhoneChars = /^\+?[0-9\s\-().]{7,25}$/
          if (!validPhoneChars.test(t.phone.trim()) || digitsOnly.length < 7 || digitsOnly.length > 15) {
            addIssue(
              i,
              travelerType,
              'phone',
              'INVALID_LEAD_PHONE',
              'Please provide a valid booking contact phone number with 7 to 15 digits (e.g. +20 100 123 4567).',
            )
          }
        }
      }

      // 4. Children & Infants (Date of Birth for age verification)
      if (travelerType === 'child' || travelerType === 'infant') {
        if (!t.dateOfBirth || !t.dateOfBirth.trim()) {
          addIssue(
            i,
            travelerType,
            'dateOfBirth',
            'MISSING_CHILD_DOB',
            'Date of birth is required for child/infant age verification and accommodation eligibility.',
          )
        }
      }
    }

    return {
      valid: issues.length === 0,
      totalExpected,
      totalProvided,
      issues,
      travelerIssuesMap,
    }
  }

  /**
   * Validates the passenger manifest against the expected traveler composition.
   * Delegates to diagnoseTravelersManifest to ensure single source of truth.
   */
  static validateTravelersManifest(
    travelers: TravelerInput[],
    expectedAdults: number,
    expectedChildren: number = 0,
  ): PolicyResult {
    const diagnostics = BookingPolicy.diagnoseTravelersManifest(
      travelers,
      expectedAdults,
      expectedChildren,
    )

    if (!diagnostics.valid) {
      const firstIssue = diagnostics.issues[0]
      return {
        allowed: false,
        code: firstIssue ? firstIssue.code : 'INVALID_TRAVELER_MANIFEST',
        reason: firstIssue
          ? `[BookingPolicy] Traveler #${firstIssue.travelerNumber}: ${firstIssue.message}`
          : '[BookingPolicy] Passenger manifest validation failed.',
      }
    }

    return { allowed: true }
  }
}
