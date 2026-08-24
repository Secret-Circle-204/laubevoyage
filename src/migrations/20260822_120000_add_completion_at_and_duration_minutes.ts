import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * Migration: Add duration_duration_minutes to experiences and completion_at to bookings.
 * 
 * Strict Historical Timezone-Aware Backfill (Rule 15 & Rule 9):
 * - Links Bookings ──► Experience ──► City ──► Country.timezone
 * - Computes accurate UTC Instant for legacy records from authoritative destination timezone.
 * - Zero silent fallbacks (NO COALESCE to Cairo, NO swallowed errors).
 * - Fails fast and reports any orphaned or timezone-missing bookings.
 */
export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  // 1. Add schema columns & indexes
  await db.execute(sql`
    ALTER TABLE "experiences" ADD COLUMN IF NOT EXISTS "duration_duration_minutes" numeric;
    ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "completion_at" timestamp(3) with time zone;
    CREATE INDEX IF NOT EXISTS "bookings_completion_at_idx" ON "bookings" USING btree ("completion_at");

    -- Backfill duration_duration_minutes for existing legacy daily tours (e.g. GEM tour = 240 min)
    UPDATE "experiences"
    SET "duration_duration_minutes" = 240
    WHERE "type" = 'daily_tour' AND ("duration_duration_minutes" IS NULL OR "duration_duration_minutes" < 15);
  `)

  // 2. Audit check: Ensure all existing bookings to be backfilled have an authoritative destination timezone
  const unresolvableCheck = await db.execute(sql`
    SELECT b.id, b.booking_number
    FROM "bookings" b
    JOIN "experiences" e ON b."experience_id" = e."id"
    LEFT JOIN "cities" ci ON e."city_id" = ci."id"
    LEFT JOIN "countries" c ON ci."country_id" = c."id"
    WHERE b."completion_at" IS NULL
      AND (c."timezone" IS NULL OR TRIM(c."timezone") = '');
  `)

  if (unresolvableCheck.rows && unresolvableCheck.rows.length > 0) {
    const ids = unresolvableCheck.rows.map((r: any) => `#${r.id} (${r.booking_number || 'no-number'})`).join(', ')
    throw new Error(
      `[Migration:add_completion_at] Cannot backfill historical bookings without authoritative Country.timezone. Affected bookings: ${ids}`,
    )
  }

  // 3. Historical Backfill for existing bookings using authoritative destination country timezone
  await db.execute(sql`
    UPDATE "bookings" b
    SET "completion_at" = (b."end_date"::date + TIME '12:00:00') AT TIME ZONE c."timezone"
    FROM "experiences" e
    JOIN "cities" ci ON e."city_id" = ci."id"
    JOIN "countries" c ON ci."country_id" = c."id"
    WHERE b."experience_id" = e."id" 
      AND b."completion_at" IS NULL
      AND c."timezone" IS NOT NULL;
  `)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP INDEX IF EXISTS "bookings_completion_at_idx";
    ALTER TABLE "bookings" DROP COLUMN IF EXISTS "completion_at";
    ALTER TABLE "experiences" DROP COLUMN IF EXISTS "duration_duration_minutes";
  `)
}
