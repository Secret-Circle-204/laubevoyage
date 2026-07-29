import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  try {
    await db.execute(sql`
      ALTER TABLE "countries" ADD COLUMN IF NOT EXISTS "default_language_id" integer REFERENCES "languages"("id");
    `)
  } catch (e) {
    // Ignore error if column already exists
  }
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  try {
    await db.execute(sql`
      ALTER TABLE "countries" DROP COLUMN IF EXISTS "default_language_id";
    `)
  } catch (e) {
    // Ignore
  }
}
