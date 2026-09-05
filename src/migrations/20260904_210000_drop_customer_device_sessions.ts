import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE IF EXISTS "payload_locked_documents_rels" DROP COLUMN IF EXISTS "customer_device_sessions_id";
    DROP TABLE IF EXISTS "customer_device_sessions" CASCADE;
  `)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  // Irreversible drop of dead scaffolding table
}
