import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "notification_logs" ADD COLUMN "next_attempt_at" timestamp(3) with time zone;
  ALTER TABLE "notification_logs" ADD COLUMN "last_attempt_at" timestamp(3) with time zone;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "notification_logs" DROP COLUMN "next_attempt_at";
  ALTER TABLE "notification_logs" DROP COLUMN "last_attempt_at";`)
}
