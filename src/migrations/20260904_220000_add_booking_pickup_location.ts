import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    DO $$ BEGIN
      CREATE TYPE "public"."enum_bookings_pickup_location_source" AS ENUM('map', 'search', 'current_location', 'fixed_meeting_point');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;

    ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "pickup_location_label" varchar;
    ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "pickup_location_address" varchar;
    ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "pickup_location_latitude" numeric;
    ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "pickup_location_longitude" numeric;
    ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "pickup_location_source" "public"."enum_bookings_pickup_location_source";
    ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "pickup_location_instructions" varchar;
  `)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "bookings" DROP COLUMN IF EXISTS "pickup_location_label";
    ALTER TABLE "bookings" DROP COLUMN IF EXISTS "pickup_location_address";
    ALTER TABLE "bookings" DROP COLUMN IF EXISTS "pickup_location_latitude";
    ALTER TABLE "bookings" DROP COLUMN IF EXISTS "pickup_location_longitude";
    ALTER TABLE "bookings" DROP COLUMN IF EXISTS "pickup_location_source";
    ALTER TABLE "bookings" DROP COLUMN IF EXISTS "pickup_location_instructions";
    DROP TYPE IF EXISTS "public"."enum_bookings_pickup_location_source";
  `)
}
