import 'dotenv/config'
import { getPayload } from 'payload'
import configPromise from '../payload.config'

async function main() {
  console.log("Initializing Payload...")
  const payload = await getPayload({ config: configPromise })
  console.log("Payload initialized.\n")

  console.log("=================== CUSTOMER STATUS ===================")
  const customer = await payload.find({
    collection: 'customers',
    where: {
      email: { equals: 'nonomazen6886@gmail.com' }
    }
  })

  if (customer.docs.length > 0) {
    const doc = customer.docs[0]
    console.log("Customer found:")
    console.log(`- ID: ${doc.id}`)
    console.log(`- Email: ${doc.email}`)
    console.log(`- Status: ${doc.status}`)
    console.log(`- Created At: ${doc.createdAt}`)
    console.log(`- Verification Expires At: ${doc.verificationExpiresAt}`)
  } else {
    console.log("Customer nonomazen6886@gmail.com NOT found in database.")
  }

  console.log("\n=================== RECENT MAINTENANCE LOGS ===================")
  const logs = await payload.find({
    collection: 'maintenance-logs',
    sort: '-executedAt',
    limit: 15
  })

  if (logs.docs.length > 0) {
    console.log(`Found ${logs.docs.length} maintenance logs:`)
    logs.docs.forEach((log: any) => {
      console.log(`[${log.executedAt}] Job: ${log.jobName} | Status: ${log.status} | Processed: ${log.itemsProcessed} | Error: ${log.errorDetails || 'None'}`)
    })
  } else {
    console.log("No maintenance logs found in the database.")
  }

  console.log("\n=================== DATABASE QUERY EXPLAIN ANALYZE ===================")
  const dbAdapter = payload.db as any
  const pool = dbAdapter.pool
  if (pool && typeof pool.query === 'function') {
    try {
      // Execute DB Migration
      console.log("\n=================== RUNNING DB MIGRATION ===================")
      
      console.log("Dropping default constraint on customers.loyalty_tier...")
      await pool.query(`ALTER TABLE "customers" ALTER COLUMN "loyalty_tier" DROP DEFAULT;`)

      console.log("Converting columns to varchar(50)...")
      await pool.query(`ALTER TABLE "customers" ALTER COLUMN "loyalty_tier" TYPE varchar(50);`)
      await pool.query(`ALTER TABLE "loyalty_settings_tiers" ALTER COLUMN "tier" TYPE varchar(50);`)

      console.log("Restoring default constraint to 'explorer'...")
      await pool.query(`ALTER TABLE "customers" ALTER COLUMN "loyalty_tier" SET DEFAULT 'explorer';`)

      console.log("Dropping old enum types...")
      await pool.query(`DROP TYPE IF EXISTS "enum_customers_loyalty_tier";`)
      await pool.query(`DROP TYPE IF EXISTS "enum_loyalty_settings_tiers_tier";`)

      console.log("DB Migration successfully applied!")

      // 1. Run EXPLAIN ANALYZE on the retention query
      const explainRes = await pool.query(
        `EXPLAIN ANALYZE SELECT id, email, status, verification_expires_at 
         FROM customers 
         WHERE status = 'pending_verification' 
           AND verification_expires_at < NOW()`
      )
      console.log("Execution Plan:")
      explainRes.rows.forEach((row: any) => {
        console.log(row['QUERY PLAN'])
      })

      // 2. Query existing indexes on customers table
      console.log("\nExisting indexes on 'customers' table:")
      const indexRes = await pool.query(
        `SELECT indexname, indexdef 
         FROM pg_indexes 
         WHERE tablename = 'customers'`
      )
      indexRes.rows.forEach((row: any) => {
        console.log(`- Index: ${row.indexname} | Definition: ${row.indexdef}`)
      })

      // 3. Query details about columns containing 'tier' on 'customers' table
      console.log("\nColumn Details for customers table (containing 'tier'):")
      const columnInfo = await pool.query(
        `SELECT column_name, data_type, udt_name, column_default, is_nullable
         FROM information_schema.columns 
         WHERE table_name = 'customers' AND column_name LIKE '%tier%'`
      )
      columnInfo.rows.forEach((row: any) => {
        console.log(`- Column: ${row.column_name} | Type: ${row.data_type} | UDT: ${row.udt_name} | Default: ${row.column_default} | Nullable: ${row.is_nullable}`)
      })

      // 4. Query pg_enum values related to tiers
      console.log("\nEnum Values for Tiers:")
      const enumDetails = await pool.query(
        `SELECT typname, enumlabel 
         FROM pg_enum 
         JOIN pg_type ON pg_enum.enumtypid = pg_type.oid 
         WHERE typname LIKE '%tier%'`
      )
      enumDetails.rows.forEach((row: any) => {
        console.log(`- Enum: ${row.typname} | Label: ${row.enumlabel}`)
      })

    } catch (e: any) {
      console.error("Failed to run DB diagnostics:", e.message)
    }
  } else {
    console.log("Postgres pool not available.")
  }

  process.exit(0)
}

main().catch((err) => {
  console.error("Query script failed:", err)
  process.exit(1)
})
