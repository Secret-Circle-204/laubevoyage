import 'dotenv/config'
import { getPayload } from 'payload'
import config from '../payload.config'
import type { PostgresAdapter } from '@payloadcms/db-postgres'

async function purge() {
  console.log('--- 🧹 DATABASE PURGE UTILITY ---')
  console.log('Target tables/collections to clear:')
  console.log('- Bookings (bookings)')
  console.log('- Customers (customers)')
  console.log('- Notifications (notification-logs)')
  console.log('- Events Inbox & Outbox (event-inbox, event-outbox)')
  console.log('- Point Ledger (point-ledger)')
  console.log('--------------------------------')

  const payload = await getPayload({ config })
  const dbAdapter = payload.db ? (payload.db as unknown as PostgresAdapter) : undefined
  const pool = dbAdapter ? dbAdapter.pool : undefined

  if (!pool || typeof pool.query !== 'function') {
    console.error('❌ Database connection pool is not available. Exiting.')
    process.exit(1)
  }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    console.log('Executing CASCADE truncations on target tables...')

    // Truncate tables with CASCADE to automatically handle foreign key dependencies
    const tables = [
      'bookings',
      'customers',
      'notification_logs',
      'event_outbox',
      'event_inbox',
      'point_ledger',
    ]

    for (const table of tables) {
      console.log(`Clearing table: ${table}...`)
      await client.query(`TRUNCATE TABLE "${table}" CASCADE;`)
    }

    await client.query('COMMIT')
    console.log('✅ Success: All target data has been purged from the database.')
  } catch (err: unknown) {
    await client.query('ROLLBACK')
    const errorMsg = err instanceof Error ? err.message : String(err)
    console.error('❌ Error during purge operation, transaction rolled back:', errorMsg)
  } finally {
    client.release()
    process.exit(0)
  }
}

purge().catch((err: unknown) => {
  console.error('Fatal execution error:', err)
  process.exit(1)
})
