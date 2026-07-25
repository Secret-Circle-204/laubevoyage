import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "departure_slots" ALTER COLUMN "base_price_e_g_p" DROP NOT NULL;
  ALTER TABLE "experiences" DROP COLUMN "capacity_total";
  ALTER TABLE "departure_slots" DROP COLUMN "is_blacked_out";`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "departure_slots" ALTER COLUMN "base_price_e_g_p" SET NOT NULL;
  ALTER TABLE "experiences" ADD COLUMN "capacity_total" numeric DEFAULT 20 NOT NULL;
  ALTER TABLE "departure_slots" ADD COLUMN "is_blacked_out" boolean DEFAULT false;`)
}
