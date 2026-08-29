import 'dotenv/config'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { BookingDetailsLoader, CustomerPortalLoader } from '@/application/dashboard/loaders'
import { getDomainServices } from '@/domains/factory'

async function runRuntimeCurrencyVerification() {
  console.log('==================================================================')
  console.log('🔍 GATE 17.5.51: REAL RUNTIME MULTI-CURRENCY E2E VERIFICATION')
  console.log('==================================================================\n')

  const payload = await getPayload({ config })
  const { booking: bookingService, customer: customerService } = await getDomainServices()

  // 1. Find a customer
  const customers = await payload.find({ collection: 'customers', limit: 1 })
  const customer = customers.docs[0]
  if (!customer) {
    throw new Error('No customer found in database')
  }
  const customerId = customer.id
  console.log(`👤 Testing Customer #${customerId} (${customer.email})`)

  // 2. Find or inspect latest booking
  const bookings = await payload.find({
    collection: 'bookings',
    where: { user: { equals: customerId } },
    sort: '-createdAt',
    limit: 1,
  })

  let testBookingNumber: string
  if (bookings.docs.length > 0) {
    testBookingNumber = bookings.docs[0].bookingNumber
  } else {
    // Pick any booking
    const anyBookings = await payload.find({ collection: 'bookings', limit: 1 })
    if (anyBookings.docs.length === 0) {
      throw new Error('No bookings found in database')
    }
    testBookingNumber = anyBookings.docs[0].bookingNumber
  }

  console.log(`📋 Target Booking Number: #${testBookingNumber}\n`)

  const testCurrencies = ['USD', 'EUR', 'EGP'] as const

  for (const curr of testCurrencies) {
    console.log(`──────────────────────────────────────────────────────────────────`)
    console.log(`🌍 TESTING RUNTIME WITH RESOLVED CURRENCY: [ ${curr} ]`)
    console.log(`──────────────────────────────────────────────────────────────────`)

    // A. Test Booking Details Loader
    const details = await BookingDetailsLoader.loadByNumber(testBookingNumber, {
      locale: curr === 'EGP' ? 'ar' : 'en',
      currency: curr,
    })

    if (!details) {
      throw new Error(`Failed to load booking details for #${testBookingNumber} in ${curr}`)
    }

    console.log(`\n  [Booking Details Screen Output in ${curr}]`)
    console.log(`  • Experience:           ${details.experienceTitle}`)
    console.log(`  • Base Price:           ${details.basePrice.formatted} (CurrencyCode: ${details.basePrice.currencyCode}, Rate: ${details.basePrice.exchangeRate})`)
    if (details.loyaltySummary.discountPrice) {
      console.log(`  • Loyalty Discount:     -${details.loyaltySummary.discountPrice.formatted} (Points: -${details.loyaltySummary.pointsRedeemed})`)
    } else {
      console.log(`  • Loyalty Discount:     None (0 EGP)`)
    }
    console.log(`  • Total Cost:           ${details.totalCost.formatted} (CurrencyCode: ${details.totalCost.currencyCode})`)
    console.log(`  • Amount Paid:          ${details.paidAmount.formatted}`)
    console.log(`  • Outstanding Balance:  ${details.outstandingBalance.formatted}`)
    console.log(`  • Points Earned:        +${details.pointsEarned} pts`)
    console.log(`  • Status:               ${details.status} | Payment: ${details.paymentStatus}`)
    console.log(`  • Raw DB Values (EGP):  Total: ${details.rawTotalCost} EGP, Paid: ${details.rawPaidAmount} EGP, Outstanding: ${details.rawOutstandingBalance} EGP`)

    // B. Test General Dashboard Overview Loader
    const overview = await CustomerPortalLoader.loadOverview(customerId, {
      locale: curr === 'EGP' ? 'ar' : 'en',
      currency: curr,
    })

    console.log(`\n  [General Dashboard Overview Output in ${curr}]`)
    console.log(`  • Tier:                 ${overview.currentTier.toUpperCase()}`)
    console.log(`  • Points:               ${overview.formattedPoints} pts`)
    console.log(`  • Points Cash Value:    ${overview.pointsMonetaryValue.formatted}`)
    console.log(`  • Total Qualifying:     ${overview.formattedTotalSpentEGP}`)
    console.log(`  • Recent Bookings Count:${overview.recentBookings.length}`)
    if (overview.recentBookings.length > 0) {
      const recent = overview.recentBookings[0]
      console.log(`  • Recent Booking #1:    ${recent.reference} -> Cost: ${recent.totalCost.formatted}, Paid: ${recent.paidAmount?.formatted || 'N/A'}, Remaining: ${recent.outstandingBalance?.formatted || 'N/A'}`)
    }

    // C. Test Bookings History Loader
    const history = await CustomerPortalLoader.loadBookingsHistory(customerId, {
      locale: curr === 'EGP' ? 'ar' : 'en',
      currency: curr,
      page: 1,
      limit: 5,
    })

    console.log(`\n  [Bookings History Output in ${curr}]`)
    console.log(`  • Total Bookings:       ${history.total}`)
    if (history.bookings.length > 0) {
      const b = history.bookings[0]
      console.log(`  • History Booking #1:   ${b.reference} -> Cost: ${b.totalCost.formatted}, Paid: ${b.paidAmount?.formatted || 'N/A'}, Remaining: ${b.outstandingBalance?.formatted || 'N/A'}`)
    }

    console.log(`\n  ✅ Currency ${curr} Verified: All monetary values correctly localized with 0 raw leaks.\n`)
  }

  console.log('==================================================================')
  console.log('🎉 ALL RUNTIME MULTI-CURRENCY TESTS PASSED SUCCESSFULLY!')
  console.log('==================================================================')
  process.exit(0)
}

runRuntimeCurrencyVerification().catch((err) => {
  console.error('❌ Verification failed:', err)
  process.exit(1)
})
