import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TYPE "public"."enum_event_outbox_status" ADD VALUE 'processing' BEFORE 'published';`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "event_outbox" ALTER COLUMN "status" SET DATA TYPE text;
  ALTER TABLE "event_outbox" ALTER COLUMN "status" SET DEFAULT 'pending'::text;
  DROP TYPE "public"."enum_event_outbox_status";
  CREATE TYPE "public"."enum_event_outbox_status" AS ENUM('pending', 'published', 'failed', 'dead_letter');
  ALTER TABLE "event_outbox" ALTER COLUMN "status" SET DEFAULT 'pending'::"public"."enum_event_outbox_status";
  ALTER TABLE "event_outbox" ALTER COLUMN "status" SET DATA TYPE "public"."enum_event_outbox_status" USING "status"::"public"."enum_event_outbox_status";`)
}
