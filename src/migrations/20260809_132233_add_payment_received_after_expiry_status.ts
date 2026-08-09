import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TYPE "public"."enum_bookings_status" ADD VALUE 'expired';
  ALTER TYPE "public"."enum_bookings_status" ADD VALUE 'payment_received_after_expiry';`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "bookings" ALTER COLUMN "status" SET DATA TYPE text;
  ALTER TABLE "bookings" ALTER COLUMN "status" SET DEFAULT 'draft'::text;
  DROP TYPE "public"."enum_bookings_status";
  CREATE TYPE "public"."enum_bookings_status" AS ENUM('draft', 'pending_payment', 'paid', 'confirmed', 'completed', 'cancelled', 'refunded');
  ALTER TABLE "bookings" ALTER COLUMN "status" SET DEFAULT 'draft'::"public"."enum_bookings_status";
  ALTER TABLE "bookings" ALTER COLUMN "status" SET DATA TYPE "public"."enum_bookings_status" USING "status"::"public"."enum_bookings_status";`)
}
