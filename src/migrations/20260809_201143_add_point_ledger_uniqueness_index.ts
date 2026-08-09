import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS "point_ledger_welcome_uniqueness_idx" ON "point_ledger" USING btree ("user_id", "reference_type", "reference_id", "type");
  `)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP INDEX IF EXISTS "point_ledger_welcome_uniqueness_idx";
  `)
}
