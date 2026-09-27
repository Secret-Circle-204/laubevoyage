import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  // 1. Drop legacy identity columns from customer_travelers (Schema Cleanup)
  await db.execute(sql`
    ALTER TABLE "customer_travelers" 
    DROP COLUMN IF EXISTS "first_name",
    DROP COLUMN IF EXISTS "last_name",
    DROP COLUMN IF EXISTS "date_of_birth",
    DROP COLUMN IF EXISTS "passport_number";
  `)

  // 2. Add Unique Partial Index on travelers (nationality + passport) to enforce DB-level identity uniqueness
  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS "travelers_nationality_passport_unique_idx" 
    ON "travelers" (LOWER(TRIM("nationality")), LOWER(TRIM("passport_number"))) 
    WHERE "nationality" IS NOT NULL AND "passport_number" IS NOT NULL AND "passport_number" <> '';
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP INDEX IF EXISTS "travelers_nationality_passport_unique_idx";
    ALTER TABLE "customer_travelers" 
    ADD COLUMN IF NOT EXISTS "first_name" varchar,
    ADD COLUMN IF NOT EXISTS "last_name" varchar,
    ADD COLUMN IF NOT EXISTS "date_of_birth" timestamp with time zone,
    ADD COLUMN IF NOT EXISTS "passport_number" varchar;
  `)
}
