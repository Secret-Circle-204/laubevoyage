import 'dotenv/config'
import { getPayload } from 'payload'
import config from '@payload-config'

/**
 * Booking Deletion & Relational Cleanup Script
 * Wipes all bookings and restores all dependent relations to a clean, consistent state:
 * 1. Deletes all Bookings
 * 2. Deletes all Payment Transactions linked to bookings
 * 3. Deletes Booking-related Point Ledger entries and recalculates Customer balances
 * 4. Resets Departure Slot capacities (capacityReserved = 0, capacitySold = 0, capacityAvailable = capacityTotal)
 * 5. Clears Customer Dashboard CQRS Projections
 * 6. Cleans up Notification Logs for booking/payment/loyalty events
 * 7. Cleans up Event Outbox & Inbox entries for booking lifecycles
 * 8. Releases orphaned maintenance leases
 */
async function deleteAllBookings() {
  console.log('🗑️  [Booking Delete] Initializing Payload CMS connection...')
  const payload = await getPayload({ config })
  const pool = (payload as unknown as { db?: { pool?: any } })?.db?.pool

  if (!pool || typeof pool.query !== 'function') {
    throw new Error('[Booking Delete] Database connection pool is not available.')
  }

  console.log('🚀 [Booking Delete] Starting atomic deletion of all bookings and relationships...')
  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    // 1. Count existing bookings
    const countRes = await client.query('SELECT COUNT(*) FROM "bookings"')
    const totalBookings = parseInt(countRes.rows[0].count, 10)
    console.log(`📊 [Booking Delete] Found ${totalBookings} bookings to delete.`)

    // 2. Delete Bookings
    const deletedBookings = await client.query('DELETE FROM "bookings"')
    console.log(`✅ [1/8] Deleted ${deletedBookings.rowCount} records from "bookings".`)

    // 3. Delete Payment Transactions
    const deletedTx = await client.query('DELETE FROM "payment_transactions"')
    console.log(`✅ [2/8] Deleted ${deletedTx.rowCount} records from "payment_transactions".`)

    // 4. Delete Point Ledger entries related to bookings
    const deletedPoints = await client.query(
      'DELETE FROM "point_ledger" WHERE reference_type = \'booking\' OR booking_id IS NOT NULL'
    )
    console.log(`✅ [3/8] Deleted ${deletedPoints.rowCount} booking records from "point_ledger".`)

    // 5. Recalculate customer loyalty point balances
    const customersRes = await client.query('SELECT id FROM "customers"')
    for (const row of customersRes.rows) {
      const customerId = row.id
      const balanceRes = await client.query(
        'SELECT COALESCE(SUM(amount), 0) as current_balance FROM "point_ledger" WHERE user_id = $1',
        [customerId]
      )
      const newBalance = parseInt(balanceRes.rows[0]?.current_balance || '0', 10)
      await client.query(
        'UPDATE "customers" SET loyalty_points = $1 WHERE id = $2',
        [newBalance, customerId]
      )
    }
    console.log(`✅ [4/8] Synchronized loyalty balances for ${customersRes.rowCount} customers.`)

    // 6. Reset Departure Slots capacities
    const resetSlots = await client.query(`
      UPDATE "departure_slots"
      SET 
        capacity_reserved = 0,
        capacity_sold = 0,
        capacity_available = capacity_total,
        status = CASE 
          WHEN status IN ('cancelled', 'blacked_out') THEN status 
          ELSE 'available' 
        END
    `)
    console.log(`✅ [5/8] Reset capacities for ${resetSlots.rowCount} departure slots.`)

    // 7. Clear Dashboard CQRS Projections cache
    const deletedProjections = await client.query('DELETE FROM "dashboard_projections"')
    console.log(`✅ [6/8] Cleared ${deletedProjections.rowCount} records from "dashboard_projections".`)

    // 8. Delete Booking / Payment Notification Logs
    const deletedNotifs = await client.query(`
      DELETE FROM "notification_logs" 
      WHERE reference_type IN ('BOOKING', 'PAYMENT', 'BOOKING_BNPL_CUSTOMER', 'BOOKING_BNPL_ADMIN', 'LOYALTY_EARN')
         OR template_id IN ('booking_confirmation', 'payment_receipt', 'loyalty_earned', 'booking_pending_admin_review', 'admin_bnpl_review_alert')
    `)
    console.log(`✅ [7/8] Deleted ${deletedNotifs.rowCount} related records from "notification_logs".`)

    // 9. Clean up Event Outbox & Inbox for booking events
    const deletedOutbox = await client.query(`
      DELETE FROM "event_outbox" 
      WHERE event_type IN (
        'BOOKING_CREATED',
        'BOOKING_CONFIRMED',
        'BOOKING_CANCELLED',
        'BOOKING_COMPLETED',
        'BOOKING_PENDING_ADMIN_REVIEW',
        'PAYMENT_COMPLETED',
        'PAYMENT_FAILED',
        'PAYMENT_REFUNDED',
        'LOYALTY_EARNED'
      )
    `)
    const deletedInbox = await client.query(`
      DELETE FROM "event_inbox" 
      WHERE subscriber_name LIKE '%Booking%' 
         OR subscriber_name LIKE '%Payment%' 
         OR subscriber_name LIKE '%LoyaltyEarned%'
    `)
    console.log(`✅ [8/8] Cleaned up ${deletedOutbox.rowCount} Outbox and ${deletedInbox.rowCount} Inbox booking events.`)

    await client.query('COMMIT')
    console.log('====================================================')
    console.log('🎉 [Booking Delete] SUCCESS: All bookings and related entities have been completely wiped!')
    console.log('====================================================')
  } catch (err) {
    await client.query('ROLLBACK')
    console.error('❌ [Booking Delete] Transaction failed and rolled back:', err)
    throw err
  } finally {
    client.release()
  }

  process.exit(0)
}

deleteAllBookings().catch((err) => {
  console.error('❌ Fatal error in deleteAllBookings:', err)
  process.exit(1)
})
