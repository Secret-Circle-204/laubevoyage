import { BookingStatus, RequestContext } from '@/types'
import type { BookingAggregate, IBookingPaymentGatewayCleanup } from './types'
import { BookingRepository } from './repository'
import { CapacityHoldService } from './capacity-hold'
import { PointHoldService } from '../loyalty/point-hold'
import { BookingHistoryService } from './history'
import { ExperienceService } from '../experience/service'

/**
 * Booking Expiration Sub-Service
 * Executes the 5-step expiration pipeline with exponential backoff retries, Dead Letter Queue (DLQ), and Admin Security Alerts.
 */
export class BookingExpiration {
  private repository: BookingRepository
  private experienceService: ExperienceService
  private paymentGatewayCleanup?: IBookingPaymentGatewayCleanup
  private deadLetterQueue: BookingAggregate[] = []

  constructor(
    repository: BookingRepository,
    experienceService: ExperienceService,
    paymentGatewayCleanup?: IBookingPaymentGatewayCleanup,
  ) {
    this.repository = repository
    this.experienceService = experienceService
    this.paymentGatewayCleanup = paymentGatewayCleanup
  }

  /**
   * Scan and expire uncompleted draft or pending payment bookings past expiration window.
   */
  /**
   * Scan and expire uncompleted draft or pending payment bookings past expiration window.
   */
  async processExpiredBookings(_expirationWindowMinutes?: number): Promise<number> {
    const nowIso = new Date().toISOString()
    const expiredDrafts = await this.repository.findExpiredDrafts(nowIso)

    let expiredCount = 0
    for (const booking of expiredDrafts) {
      const updated = await this.expireBookingWithRetry(booking, 3)
      if (updated && updated.status === BookingStatus.EXPIRED) {
        expiredCount += 1
      }
    }

    return expiredCount
  }

  /**
   * Execute 7-step expiration pipeline with retry and DLQ fallback.
   */
  private async expireBookingWithRetry(booking: BookingAggregate, maxRetries: number = 3): Promise<BookingAggregate | null> {
    let attempt = 0
    let lastError: Error | null = null

    while (attempt < maxRetries) {
      try {
        attempt += 1
        return await this.executeExpirationPipeline(booking)
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))
        console.warn(`[BookingExpiration] Retry ${attempt}/${maxRetries} failed for booking #${booking.bookingNumber}:`, lastError.message)

        // Exponential backoff wait
        await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt) * 100))
      }
    }

    // Max retries exceeded -> Dead Letter Queue & Admin Security Alert
    console.error(`[BookingExpiration] CRITICAL: Max retries exceeded for booking #${booking.bookingNumber}. Moving to DLQ.`)
    this.deadLetterQueue.push(booking)
    this.emitAdminSecurityAlert(booking, lastError)
    return null
  }

  /**
   * 5-Step Sequential Expiration Pipeline:
   * 1. Expire Booking Status (conditionally & atomically)
   * 2. Release Capacity Hold
   * 3. Release Loyalty Point Hold
   * 4. Append Customer Timeline Entry
   * 5. Append System Audit Record
   */
  private async executeExpirationPipeline(booking: BookingAggregate): Promise<BookingAggregate> {
    const transactionID = await this.repository.beginTransaction()
    const context: RequestContext = { transactionId: transactionID }

    try {
      // Fresh look up to prevent TOCTOU race conditions (inside transaction)
      const latestBooking = await this.repository.findById(booking.id, context)
      if (latestBooking.status !== BookingStatus.DRAFT && latestBooking.status !== BookingStatus.PENDING_PAYMENT) {
        console.log(`[BookingExpiration] Booking #${booking.bookingNumber} status has changed to ${latestBooking.status} concurrently. Skipping expiration.`)
        await this.repository.rollbackTransaction(transactionID)
        return latestBooking
      }

      const allowedSourceStatuses = [BookingStatus.DRAFT, BookingStatus.PENDING_PAYMENT]

      let expiredCapacity = null
      let expiredPointHold = null

      if (!latestBooking.capacityHold) {
        console.log(`[BookingExpiration] Booking #${booking.bookingNumber} has no capacityHold (orphaned). Transitioning directly to EXPIRED.`)
      } else {
        if (latestBooking.capacityHold.status !== 'active') {
          console.log(`[BookingExpiration] Booking #${booking.bookingNumber} capacityHold status is no longer active (${latestBooking.capacityHold.status}). Skipping expiration.`)
          await this.repository.rollbackTransaction(transactionID)
          return latestBooking
        }
        // Step 2 & 3: Release holds if active
        expiredCapacity = CapacityHoldService.expireHold(latestBooking.capacityHold)
        expiredPointHold = latestBooking.pointHold
          ? PointHoldService.expireHold(latestBooking.pointHold)
          : null
      }

      // Step 4: Append Customer Timeline
      const updatedTimeline = BookingHistoryService.appendTimelineEntry(latestBooking.timeline, {
        stepKey: 'booking_expired',
        title: 'Booking Expired',
        description: 'Your booking draft expired due to payment window timeout.',
      })

      // Step 5: Append System Audit
      const updatedAudit = BookingHistoryService.appendAuditEntry(latestBooking.auditTrail, {
        actor: { id: 'system', type: 'system', name: 'Expiration Worker' },
        action: 'BOOKING_EXPIRED',
        reason: 'Payment window timed out',
        previousValue: latestBooking.status,
        newValue: BookingStatus.EXPIRED,
      })

      // Record structured terminalReason in metadata
      const updatedMetadata = latestBooking.metadata || {}
      updatedMetadata.terminalReason = {
        type: 'EXPIRATION',
        reason: 'PAYMENT_TIMEOUT',
      }

      // Step 1: Update status in repository conditionally (atomic database transition)
      const expiredBooking = await this.repository.updateStatusConditionally(
        latestBooking.id,
        allowedSourceStatuses,
        {
          status: BookingStatus.EXPIRED,
          capacityHold: expiredCapacity,
          pointHold: expiredPointHold,
          notes: 'Auto-expired: Payment window timed out',
          timeline: updatedTimeline,
          auditTrail: updatedAudit,
          metadata: updatedMetadata,
        },
        context,
      )

      if (!expiredBooking) {
        console.log(`[BookingExpiration] Concurrency Guard: Booking #${booking.bookingNumber} status was concurrently updated. Skipping.`)
        await this.repository.rollbackTransaction(transactionID)
        return latestBooking
      }

      // Release slot capacity (if experience service is injected and capacityHold is present)
      try {
        if (latestBooking.capacityHold && typeof this.experienceService?.getDepartureSlotByDate === 'function' && typeof this.experienceService?.releaseCapacity === 'function') {
          const hold = latestBooking.capacityHold
          const rawExpId = hold.experienceId as unknown
          const rawDate = hold.date as unknown

          const expId = typeof rawExpId === 'number'
            ? rawExpId
            : (typeof rawExpId === 'string' && rawExpId.trim().length > 0 ? Number(rawExpId) : NaN)

          const hasValidExperienceId = Number.isInteger(expId) && expId > 0
          const hasValidDate = typeof rawDate === 'string' && rawDate.trim().length > 0 && !isNaN(Date.parse(rawDate))

          if (hasValidExperienceId && hasValidDate) {
            const slot = await this.experienceService.getDepartureSlotByDate(expId, rawDate)
            if (slot && slot.departureId) {
              await this.experienceService.releaseCapacity(slot.departureId, latestBooking.capacityHold.seats, context)
              console.log(`[BookingExpiration] Released slot capacity: Slot ID ${slot.departureId}, ${latestBooking.capacityHold.seats} seats.`)
            }
          } else {
            console.warn(
              `🚨 [BookingExpiration] Capacity cleanup is not resolvable from the persisted hold metadata for booking #${booking.bookingNumber} (ID: ${booking.id}). ` +
              `Reason: Invalid lookup fields in capacityHold (experienceId: ${rawExpId}, date: ${rawDate}). Skipping capacity release cleanup.`
            )
          }
        }
      } catch (err: any) {
        console.error(`[BookingExpiration] Failed to release slot capacity:`, err)
        throw err // Trigger rollback of status change
      }

      await this.repository.commitTransaction(transactionID)

      // ------------------------------------------------------------------------------------------------
      // Gate 3A: Post-Commit External Stripe Gateway Cleanup (Decoupled Resiliency)
      // The internal booking expiration and hold release are already permanently committed to PostgreSQL.
      // Any external network/gateway error MUST NOT affect the committed expiration.
      // ------------------------------------------------------------------------------------------------
      try {
        if (this.paymentGatewayCleanup) {
          await this.paymentGatewayCleanup.expireSessionForBooking(expiredBooking.id)
        }
      } catch (gatewayErr: unknown) {
        const errMsg = gatewayErr instanceof Error ? gatewayErr.message : String(gatewayErr)
        console.error(
          `[BookingExpiration] Post-commit gateway cleanup encountered an error for Booking #${expiredBooking.bookingNumber}:`,
          errMsg,
        )
      }

      return expiredBooking
    } catch (error) {
      await this.repository.rollbackTransaction(transactionID)
      throw error
    }
  }

  /**
   * Dispatch urgent security alert to administrators if expiration cleanup fails.
   */
  private emitAdminSecurityAlert(booking: BookingAggregate, error: Error | null): void {
    console.error(`🚨 [ADMIN ALERT] Security/Capacity Release Lock Failure on Booking ID #${booking.id} (${booking.bookingNumber}). Error: ${error?.message}`)
  }

  getDeadLetterQueue(): BookingAggregate[] {
    return this.deadLetterQueue
  }
}
