import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "event_outbox" ADD COLUMN "worker_id" varchar;
  ALTER TABLE "event_outbox" ADD COLUMN "lock_expires_at" timestamp(3) with time zone;
  CREATE INDEX "event_outbox_worker_id_idx" ON "event_outbox" USING btree ("worker_id");
  CREATE INDEX "event_outbox_lock_expires_at_idx" ON "event_outbox" USING btree ("lock_expires_at");
  CREATE INDEX "event_outbox_status_created_at_idx" ON "event_outbox" USING btree ("status", "created_at");
  CREATE INDEX "event_outbox_status_next_retry_idx" ON "event_outbox" USING btree ("status", "next_retry_at", "created_at");
  CREATE INDEX "notification_logs_status_priority_created_at_idx" ON "notification_logs" USING btree ("status", "priority", "created_at");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP INDEX "event_outbox_status_created_at_idx";
  DROP INDEX "event_outbox_status_next_retry_idx";
  DROP INDEX "notification_logs_status_priority_created_at_idx";
  DROP INDEX "event_outbox_worker_id_idx";
  DROP INDEX "event_outbox_lock_expires_at_idx";
  ALTER TABLE "event_outbox" DROP COLUMN "worker_id";
  ALTER TABLE "event_outbox" DROP COLUMN "lock_expires_at";`)
}
