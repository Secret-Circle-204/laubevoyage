import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    DROP TABLE IF EXISTS "customer_addresses" CASCADE;
    DROP TYPE IF EXISTS "enum_customer_addresses_type" CASCADE;
  `)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  // Irreversible drop of obsolete, unpopulated table
}
