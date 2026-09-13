import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    DROP TABLE IF EXISTS "experiences_accommodations_occupancy_options" CASCADE;
  `)
}

export async function down(): Promise<void> {
  // Irreversible drop of obsolete table superseded by experiences_accommodations_room_rates
}
