import type { Payload } from 'payload'
import { EventBus } from '../event-bus'
import type { PaymentCompletedEvent } from '../payment-events'
import { BookingWorkflowEngine } from '../../booking/workflow'

/**
 * Booking Payment Subscriber
 * Listens to PaymentCompletedEvent to mark booking as paid and execute confirmation workflow in the Booking Domain.
 * Fully decouples Payment Domain from Booking Domain.
 */
export function registerBookingPaymentSubscriber(payload: Payload): void {
  const eventBus = EventBus.getInstance()
  const bookingWorkflowEngine = new BookingWorkflowEngine(payload)

  eventBus.subscribe<PaymentCompletedEvent>('PAYMENT_COMPLETED', async (event) => {
    const bookingId = event.bookingId

    const paymentAttempt = {
      attemptId: `pay_att_${Date.now()}`,
      attemptNumber: 1,
      provider: 'stripe' as const,
      amount: event.amount,
      currency: event.currency,
      status: 'successful' as const,
      transactionReference: event.gatewayReference || event.transactionId,
      timestamp: event.timestamp,
    }

    // 1. Mark booking as paid in Booking Domain
    await bookingWorkflowEngine.executePaymentWorkflow(bookingId, paymentAttempt)

    // 2. Confirm booking in Booking Domain
    await bookingWorkflowEngine.executeConfirmationWorkflow(bookingId)
  })
}
