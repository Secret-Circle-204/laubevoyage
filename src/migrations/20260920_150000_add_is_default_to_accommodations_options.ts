import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * Migration: 20260920_150000_add_is_default_to_accommodations_options
 *
 * Adds `is_default` boolean column to `experiences_accommodations_options` table.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "experiences_accommodations_options"
    ADD COLUMN IF NOT EXISTS "is_default" boolean DEFAULT false;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "experiences_accommodations_options"
    DROP COLUMN IF EXISTS "is_default";
  `)
}
