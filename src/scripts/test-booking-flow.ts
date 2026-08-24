// @ts-nocheck
import 'dotenv/config'
import { getPayload } from 'payload'
import config from '../payload.config'
import { getDomainServices } from '../domains/factory'
import { StripePaymentAdapter } from '../domains/payment/adapters/stripe'
import { OutboxPublisherWorker } from '../domains/events/outbox-publisher'
import { PayloadOutboxRepository } from '../domains/events/repositories/payload-outbox-repository'

// Import seeders
import { seedCurrencies } from '../seed/seeders/currencies.seed'
import { seedLocales } from '../seed/seeders/locales.seed'
import { seedUsers } from '../seed/seeders/users.seed'
import { seedDestinations } from '../seed/seeders/destinations.seed'
import { seedExperiences } from '../seed/seeders/experiences.seed'
import { seedFaqs } from '../seed/seeders/faqs.seed'

async function run() {
  console.log('--- 🧪 STARTING END-TO-END BOOKING FLOW TEST ---')
  const payload = await getPayload({ config })

  // Database enum patch to add 'processing' to enum_event_outbox_status
  try {
    const pool = (payload.db as any).pool
    if (pool && typeof pool.query === 'function') {
      console.log('🔄 Checking database enum type for "processing"...')
      const checkRes = await pool.query(`
        SELECT enumlabel FROM pg_enum 
        WHERE enumtypid = 'public.enum_event_outbox_status'::regtype AND enumlabel = 'processing';
      `).catch(() => null)
      
      if (checkRes && checkRes.rows.length === 0) {
        console.log('🔄 Adding "processing" value to public.enum_event_outbox_status...')
        await pool.query('ALTER TYPE "public"."enum_event_outbox_status" ADD VALUE \'processing\';')
        console.log('✅ Successfully added "processing" to public.enum_event_outbox_status enum.')
      } else {
        console.log('✅ "processing" is already present in enum_event_outbox_status.')
      }
    }
  } catch (err: any) {
    console.warn('⚠️ Warning checking/adding enum value:', err.message)
  }

  const services = await getDomainServices()

  // 1. Find or seed target customer
  console.log('\n🔍 Finding test customer...')
  let customerRes = await payload.find({
    collection: 'customers',
    where: {
      email: { equals: 'customer@laubevoyage.com' }
    }
  })

  if (customerRes.docs.length === 0) {
    console.log('🌱 Test customer not found. Running programmatically modular database seeders...')
    await seedCurrencies(payload)
    await seedLocales(payload)
    await seedUsers(payload)
    const destinations = await seedDestinations(payload)
    await seedExperiences(payload, destinations)
    await seedFaqs(payload)

    // Re-query customer
    customerRes = await payload.find({
      collection: 'customers',
      where: {
        email: { equals: 'customer@laubevoyage.com' }
      }
    })
  }

  if (customerRes.docs.length === 0) {
    throw new Error('❌ Test customer (customer@laubevoyage.com) still not found after seeding.')
  }
  const customer = customerRes.docs[0]
  console.log(`✅ Customer ready: ID ${customer.id}, Name: ${customer.firstName} ${customer.lastName}, Email: ${customer.email}`)

  // Get current loyalty points balance
  const initialPoints = await services.loyalty.getCustomerBalance(customer.id)
  console.log(`ℹ️ Initial Loyalty Points: ${initialPoints}`)

  // 2. Find target experience
  console.log('\n🔍 Finding experience to book...')
  const experienceRes = await payload.find({
    collection: 'experiences',
    limit: 1
  })

  if (experienceRes.docs.length === 0) {
    throw new Error('❌ No experiences found in database.')
  }
  const experience = experienceRes.docs[0]
  console.log(`✅ Found Experience: ID ${experience.id}, Title: "${experience.title}"`)

  // 3. Resolve departure
  console.log('\n📅 Resolving departure info...')
  const departureSlotsRes = await payload.find({
    collection: 'departure-slots',
    where: {
      experience: { equals: experience.id }
    },
    limit: 1
  })

  let departure: any
  if (departureSlotsRes.docs.length > 0) {
    const slot = departureSlotsRes.docs[0]
    departure = await services.experience.resolveBookableDepartureBySlot(experience.id, slot.id)
  } else {
    const slot = await services.experience.getOrCreateDailyDeparture(experience.id, '2026-09-15', '09:00')
    departure = await services.experience.resolveBookableDepartureBySlot(experience.id, slot.id!)
  }
  console.log(`✅ Resolved Departure Date: ${departure.date}, Base Price: ${departure.effectiveBasePrice} EGP`)

  // 4. Create Draft Booking (Step 1)
  console.log('\n⚡ Step 1: Creating Draft Booking...')
  const bookingId = await services.booking.create({
    userId: customer.id,
    departure,
    travelers: [
      {
        firstName: 'Test',
        lastName: 'Passenger',
        email: 'testpassenger@example.com',
        phone: '+201234567890'
      }
    ],
    currency: 'EGP',
    source: 'website'
  })

  let booking = await services.booking.getById(bookingId)
  console.log(`✅ Booking Draft successfully created!`)
  console.log(`- Booking ID: ${booking.id}`)
  console.log(`- Booking Number: ${booking.bookingNumber}`)
  console.log(`- Status: ${booking.status}`)
  console.log(`- Capacity Hold:`, JSON.stringify(booking.capacityHold, null, 2))

  // 5. Move to Pending Payment
  console.log('\n⚡ Step 2: Moving Booking to Pending Payment...')
  await services.booking.moveToPendingPayment(bookingId)
  booking = await services.booking.getById(bookingId)
  console.log(`✅ Booking Status Updated: ${booking.status}`)

  // 6. Create Payment Checkout Session
  console.log('\n⚡ Step 3: Creating Payment Checkout Session (Stripe)...')
  const checkoutResult = await services.payment.processPaymentCheckout({
    bookingId,
    gatewayId: 'stripe'
  })
  console.log(`✅ Payment Checkout initiated!`)
  console.log(`- Transaction ID: ${checkoutResult.transactionId}`)
  console.log(`- Checkout URL: ${checkoutResult.checkoutUrl}`)

  // Get current transaction status
  const txBefore = await services.payment.getByTransactionId(checkoutResult.transactionId)
  console.log(`- Transaction Status: ${txBefore?.status}`)

  // 7. Mock Stripe Webhook Callback (Step 4)
  console.log('\n⚡ Step 4: Mocking successful payment callback (Stripe Webhook)...')
  const mockWebhookEventId = 'evt_test_stripe_' + Date.now()
  const mockSessionId = 'cs_test_' + Date.now()
  const mockPaymentIntent = 'pi_test_' + Date.now()

  // Override verifyWebhook in StripePaymentAdapter to bypass Stripe SDK call
  const originalVerifyWebhook = StripePaymentAdapter.prototype.verifyWebhook
  StripePaymentAdapter.prototype.verifyWebhook = async function(rawBody: string | Buffer, signature: string) {
    return {
      id: mockWebhookEventId,
      type: 'checkout.session.completed',
      data: {
        object: {
          id: mockSessionId,
          payment_intent: mockPaymentIntent,
          amount_total: Number(booking.pricingSnapshot.totalAmountEGP) * 100, // cents
          currency: 'egp',
          customer_details: {
            email: customer.email
          },
          metadata: {
            bookingId: String(bookingId),
            transactionId: checkoutResult.transactionId
          }
        }
      }
    } as any
  }

  try {
    // Call the webhook handler
    const webhookRes = await services.payment.handleStripeWebhook('{}', 'mock-signature')
    console.log(`✅ Webhook handler finished:`, webhookRes)
  } finally {
    // Restore original verifyWebhook
    StripePaymentAdapter.prototype.verifyWebhook = originalVerifyWebhook
  }

  // 8. Process Event Outbox (Step 5)
  console.log('\n⚡ Step 5: Manually executing Outbox worker to publish events...')
  const outboxRepo = new PayloadOutboxRepository(payload)
  const outboxWorker = new OutboxPublisherWorker(outboxRepo)
  let publishResult
  do {
    publishResult = await outboxWorker.publishPendingEvents()
  } while (publishResult.processedCount > 0)
  console.log(`✅ Outbox publisher completed:`, publishResult)

  // 9. Let's process the enqueued notifications (Step 6)
  console.log('\n⚡ Step 6: Processing notifications background worker...')
  // Process jobs until queue is empty
  let notificationProcessed = false
  do {
    notificationProcessed = await services.notification.processNextJob()
  } while (notificationProcessed)
  console.log(`✅ Notification worker finished processing queue.`)

  // 10. Verification Phase (Step 7)
  console.log('\n⚡ Step 7: Verifying all side effects in database...')

  // Verification 1: Booking Status
  const verifiedBooking = await services.booking.getById(bookingId)
  console.log(`\n📊 VERIFICATION 1: Booking Details`)
  console.log(`- Booking Status (Expected: CONFIRMED): ${verifiedBooking.status}`)
  console.log(`- Timeline entries count: ${verifiedBooking.timeline?.length}`)
  console.log(`- Timeline steps:`, verifiedBooking.timeline?.map(t => t.stepKey).join(' -> '))
  console.log(`- Capacity Hold committed (Expected: true):`, verifiedBooking.capacityHold?.status === 'committed')

  // Verification 2: Payment Transaction Status
  const verifiedTx = await services.payment.getByTransactionId(checkoutResult.transactionId)
  console.log(`\n📊 VERIFICATION 2: Payment Details`)
  console.log(`- Transaction Status (Expected: successful): ${verifiedTx?.status}`)
  console.log(`- Attempts logged: ${verifiedTx?.attempts?.length}`)
  console.log(`- Attempt status: ${verifiedTx?.attempts?.[0]?.status}`)

  // Verification 3: Loyalty points
  const verifiedPoints = await services.loyalty.getCustomerBalance(customer.id)
  console.log(`\n📊 VERIFICATION 3: Loyalty Points`)
  console.log(`- Initial points: ${initialPoints}`)
  console.log(`- Final points: ${verifiedPoints}`)
  console.log(`- Points gained: ${verifiedPoints - initialPoints}`)

  // Fetch loyalty ledgers
  const ledgerRes = await payload.find({
    collection: 'point-ledger',
    where: {
      user: { equals: customer.id }
    }
  })
  if (ledgerRes.docs.length > 0) {
    console.log(`- Points Ledger entry:`, JSON.stringify(ledgerRes.docs[0], null, 2))
  } else {
    console.log(`❌ No ledger entry found for Booking ID: ${bookingId}`)
  }

  // Verification 4: Notifications
  const { notification } = await getDomainServices()
  await notification.processNextJob()

  const notificationRes = await payload.find({
    collection: 'notification-logs',
    where: {
      referenceId: { equals: String(bookingId) },
      referenceType: { equals: 'BOOKING' }
    }
  })
  console.log(`\n📊 VERIFICATION 4: Notifications`)
  if (notificationRes.docs.length > 0) {
    console.log(`- Notification log entry found:`)
    console.log(`  - Recipient: ${notificationRes.docs[0].recipient}`)
    console.log(`  - Template: ${notificationRes.docs[0].templateId}`)
    console.log(`  - Status (Expected: delivered): ${notificationRes.docs[0].status}`)
    console.log(`  - Last Error: ${notificationRes.docs[0].lastError || 'None'}`)
  } else {
    console.log(`❌ No notification entry found for Booking ID: ${bookingId}`)
  }

  // Verification 5: CQRS Customer Projection
  console.log(`\n📊 VERIFICATION 5: CQRS Dashboard Projection`)
  const projectionRes = await payload.find({
    collection: 'dashboard-projections',
    where: {
      customer: { equals: customer.id }
    }
  })
  if (projectionRes.docs.length > 0) {
    const json = (projectionRes.docs[0] as any).projectionJson || {}
    console.log(`- Projection found for customer #${customer.id}:`)
    console.log(`  - Active Bookings Count:`, json.trips?.activeBookingsCount)
    console.log(`  - Loyalty points balance in projection:`, json.loyalty?.pointsBalance)
    console.log(`  - Active tier in projection:`, json.loyalty?.tier)
  } else {
    console.log(`❌ No customer projection found for Customer ID: ${customer.id}`)
  }

  console.log('\n--- 🧪 TEST COMPLETE ---')
  process.exit(0)
}

run().catch((err) => {
  console.error('❌ Fatal error running test booking flow:', err)
  process.exit(1)
})
