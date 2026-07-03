import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  // We need to update existing enum string values in the db before letting payload alter the type
  
  // 1. Rename existing enum values using ALTER TYPE ADD VALUE
  // Postgres 10+ doesn't allow renaming enum values directly inside a transaction if they are used, 
  // but we can add new values, update the table, and then Postgres will allow dropping the old ones 
  // when Payload reconstructs the ENUM type.

  // Actually, the easiest way to avoid the "invalid input value for enum" error during Payload's schema check 
  // is to just update the category names directly as strings *if* we cast them, but since we can't start Payload,
  // we must run this SQL manually outside of Payload's boot process, OR we can temporarily revert Excursions.ts, 
  // generate the migration, write the SQL, migrate, and then re-update Excursions.ts.
  
  await db.execute(sql`
    ALTER TYPE "public"."enum_excursions_category" ADD VALUE IF NOT EXISTS 'sea-trips';
    ALTER TYPE "public"."enum_excursions_category" ADD VALUE IF NOT EXISTS 'safari-adventure';
    ALTER TYPE "public"."enum_excursions_category" ADD VALUE IF NOT EXISTS 'cultural-history';
    ALTER TYPE "public"."enum_excursions_category" ADD VALUE IF NOT EXISTS 'family-kids';
  `)

  await db.execute(sql`
    UPDATE "excursions" SET "category" = 'sea-trips' WHERE "category"::text = 'cultural';
    UPDATE "excursions" SET "category" = 'safari-adventure' WHERE "category"::text = 'adventure';
    UPDATE "excursions" SET "category" = 'cultural-history' WHERE "category"::text = 'history';
    UPDATE "excursions" SET "category" = 'family-kids' WHERE "category"::text = 'food';
  `)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  // Rollback if needed
  await db.execute(sql`
    UPDATE "excursions" SET "category" = 'cultural' WHERE "category"::text = 'sea-trips';
    UPDATE "excursions" SET "category" = 'adventure' WHERE "category"::text = 'safari-adventure';
    UPDATE "excursions" SET "category" = 'history' WHERE "category"::text = 'cultural-history';
    UPDATE "excursions" SET "category" = 'food' WHERE "category"::text = 'family-kids';
  `)
}
