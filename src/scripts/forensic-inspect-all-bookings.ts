import 'dotenv/config'
import { getPayload } from 'payload'
import config from '../payload.config'

async function main() {
  const payload = await getPayload({ config })

  console.log('================================================================================')
  console.log('🔍 READ-ONLY FORENSIC INSPECTION: ALL DATABASE BOOKINGS & LOYALTY LEDGER ENTRIES')
  console.log('================================================================================')

  const bookingsRes = await payload.find({
    collection: 'bookings',
    limit: 100,
  })

  console.log(`Total Bookings in Database: ${bookingsRes.totalDocs}`)
  for (const b of bookingsRes.docs) {
    const booking = b as any
    console.log(`\n--- Booking #${booking.id} (${booking.bookingNumber}) ---`)
    console.log(`   Customer: #${typeof booking.user === 'object' ? booking.user?.id : booking.user}`)
    console.log(`   Status: ${booking.status}`)
    console.log(`   Payment Status: ${booking.paymentStatus}`)
    console.log(`   Amount Paid: ${booking.amountPaid} EGP`)
    console.log(`   Outstanding Balance: ${booking.outstandingBalance} EGP`)
    console.log(`   Total Contract (Snapshot): ${booking.pricingSnapshot?.totalAmountEGP} EGP`)
    console.log(`   Payment Attempts Count: ${booking.paymentAttempts?.length || 0}`)
    if (booking.paymentAttempts?.length > 0) {
      booking.paymentAttempts.forEach((a: any, idx: number) => {
        console.log(`      Attempt #${idx + 1}: ID=${a.attemptId}, Provider=${a.provider}, Amount=${a.amount} ${a.currency}, Status=${a.status}, Ref=${a.transactionReference}`)
      })
    }

    const ledgerRes = await payload.find({
      collection: 'point-ledger',
      where: {
        booking: { equals: booking.id },
      },
      limit: 10,
    })
    console.log(`   Associated PointLedger Entries: ${ledgerRes.totalDocs}`)
    for (const l of ledgerRes.docs) {
      const entry = l as any
      console.log(`      Ledger #${entry.id}: Type=${entry.type}, Points=${entry.amount}, ResultingBalance=${entry.balance}, RefType=${entry.referenceType}, RefId=${entry.referenceId}, AmountSpentEGP=${entry.metadata?.amountSpentEGP}`)
    }
  }

  const allLedgerRes = await payload.find({
    collection: 'point-ledger',
    limit: 100,
  })
  console.log(`\nTotal Point Ledger Entries across all users: ${allLedgerRes.totalDocs}`)

  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
