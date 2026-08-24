import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * Migration: Add payment_window_expires_at to bookings collection.
 * 
 * Strict Financial Contract (Phase P0-C & Rule 9):
 * - Adds payment_window_expires_at as an authoritative, indexed timestamp.
 * - One-time deterministic historical backfill for existing bookings (createdAt + 15 minutes).
 * - Enforces NOT NULL constraint to prevent any orphaned or uncontracted bookings.
 */
export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  // 1. Add column if it doesn't exist
  await db.execute(sql`
    ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "payment_window_expires_at" timestamp(3) with time zone;
    CREATE INDEX IF NOT EXISTS "bookings_payment_window_expires_at_idx" ON "bookings" USING btree ("payment_window_expires_at");
  `)

  // 2. Deterministic Historical Backfill for existing bookings without payment_window_expires_at
  await db.execute(sql`
    UPDATE "bookings"
    SET "payment_window_expires_at" = "created_at" + INTERVAL '15 minutes'
    WHERE "payment_window_expires_at" IS NULL;
  `)

  // 3. Enforce NOT NULL constraint now that historical data is backfilled
  await db.execute(sql`
    ALTER TABLE "bookings" ALTER COLUMN "payment_window_expires_at" SET NOT NULL;
  `)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP INDEX IF EXISTS "bookings_payment_window_expires_at_idx";
    ALTER TABLE "bookings" DROP COLUMN IF EXISTS "payment_window_expires_at";
  `)
}
