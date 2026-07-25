import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
  -- 1. Add columns as nullable first
  ALTER TABLE "countries" ADD COLUMN IF NOT EXISTS "name" varchar;
  ALTER TABLE "countries" ADD COLUMN IF NOT EXISTS "description" jsonb;
  ALTER TABLE "countries" ADD COLUMN IF NOT EXISTS "seo_title" varchar;
  ALTER TABLE "countries" ADD COLUMN IF NOT EXISTS "seo_description" varchar;
  ALTER TABLE "countries" ADD COLUMN IF NOT EXISTS "seo_keywords" varchar;

  ALTER TABLE "cities" ADD COLUMN IF NOT EXISTS "name" varchar;
  ALTER TABLE "cities" ADD COLUMN IF NOT EXISTS "description" jsonb;
  ALTER TABLE "cities" ADD COLUMN IF NOT EXISTS "seo_title" varchar;
  ALTER TABLE "cities" ADD COLUMN IF NOT EXISTS "seo_description" varchar;
  ALTER TABLE "cities" ADD COLUMN IF NOT EXISTS "seo_keywords" varchar;

  ALTER TABLE "experiences" ADD COLUMN IF NOT EXISTS "title" varchar;
  ALTER TABLE "experiences" ADD COLUMN IF NOT EXISTS "description" jsonb;
  ALTER TABLE "experiences" ADD COLUMN IF NOT EXISTS "policies" jsonb;
  ALTER TABLE "experiences" ADD COLUMN IF NOT EXISTS "seo_title" varchar;
  ALTER TABLE "experiences" ADD COLUMN IF NOT EXISTS "seo_description" varchar;
  ALTER TABLE "experiences" ADD COLUMN IF NOT EXISTS "seo_keywords" varchar;

  -- 2. Migrate existing data from _locales tables to main tables if they exist
  DO $$ 
  BEGIN 
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'countries_locales') THEN
      UPDATE "countries" c 
      SET "name" = cl.name, "description" = cl.description, "seo_title" = cl.seo_title, "seo_description" = cl.seo_description, "seo_keywords" = cl.seo_keywords
      FROM "countries_locales" cl 
      WHERE cl._parent_id = c.id;
    END IF;

    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'cities_locales') THEN
      UPDATE "cities" c 
      SET "name" = cl.name, "description" = cl.description, "seo_title" = cl.seo_title, "seo_description" = cl.seo_description, "seo_keywords" = cl.seo_keywords
      FROM "cities_locales" cl 
      WHERE cl._parent_id = c.id;
    END IF;

    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'experiences_locales') THEN
      UPDATE "experiences" e 
      SET "title" = el.title, "description" = el.description, "policies" = el.policies, "seo_title" = el.seo_title, "seo_description" = el.seo_description, "seo_keywords" = el.seo_keywords
      FROM "experiences_locales" el 
      WHERE el._parent_id = e.id;
    END IF;
  END $$;

  -- 3. Set fallback values for any remaining NULLs
  UPDATE "countries" SET "name" = 'Unknown Country' WHERE "name" IS NULL;
  UPDATE "cities" SET "name" = 'Unknown City' WHERE "name" IS NULL;
  UPDATE "experiences" SET "title" = 'Untitled Experience' WHERE "title" IS NULL;

  -- 4. Set NOT NULL constraints
  ALTER TABLE "countries" ALTER COLUMN "name" SET NOT NULL;
  ALTER TABLE "cities" ALTER COLUMN "name" SET NOT NULL;
  ALTER TABLE "experiences" ALTER COLUMN "title" SET NOT NULL;

  -- 5. Drop old locales tables & columns
  ALTER TABLE "countries_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cities_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "experiences_locales" DISABLE ROW LEVEL SECURITY;
  DROP TABLE IF EXISTS "countries_locales" CASCADE;
  DROP TABLE IF EXISTS "cities_locales" CASCADE;
  DROP TABLE IF EXISTS "experiences_locales" CASCADE;
  DROP INDEX IF EXISTS "experiences_included_locale_idx";
  DROP INDEX IF EXISTS "experiences_excluded_locale_idx";
  ALTER TABLE "experiences_included" DROP COLUMN IF EXISTS "_locale";
  ALTER TABLE "experiences_excluded" DROP COLUMN IF EXISTS "_locale";
  DROP TYPE IF EXISTS "public"."_locales";`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."_locales" AS ENUM('en', 'ar', 'fr');
  CREATE TABLE IF NOT EXISTS "countries_locales" (
  	"name" varchar NOT NULL,
  	"description" jsonb,
  	"seo_title" varchar,
  	"seo_description" varchar,
  	"seo_keywords" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE IF NOT EXISTS "cities_locales" (
  	"name" varchar NOT NULL,
  	"description" jsonb,
  	"seo_title" varchar,
  	"seo_description" varchar,
  	"seo_keywords" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE IF NOT EXISTS "experiences_locales" (
  	"title" varchar NOT NULL,
  	"description" jsonb,
  	"policies" jsonb,
  	"seo_title" varchar,
  	"seo_description" varchar,
  	"seo_keywords" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  ALTER TABLE "experiences_included" ADD COLUMN IF NOT EXISTS "_locale" "_locales" NOT NULL;
  ALTER TABLE "experiences_excluded" ADD COLUMN IF NOT EXISTS "_locale" "_locales" NOT NULL;
  ALTER TABLE "countries" DROP COLUMN IF EXISTS "name";
  ALTER TABLE "countries" DROP COLUMN IF EXISTS "description";
  ALTER TABLE "countries" DROP COLUMN IF EXISTS "seo_title";
  ALTER TABLE "countries" DROP COLUMN IF EXISTS "seo_description";
  ALTER TABLE "countries" DROP COLUMN IF EXISTS "seo_keywords";
  ALTER TABLE "cities" DROP COLUMN IF EXISTS "name";
  ALTER TABLE "cities" DROP COLUMN IF EXISTS "description";
  ALTER TABLE "cities" DROP COLUMN IF EXISTS "seo_title";
  ALTER TABLE "cities" DROP COLUMN IF EXISTS "seo_description";
  ALTER TABLE "cities" DROP COLUMN IF EXISTS "seo_keywords";
  ALTER TABLE "experiences" DROP COLUMN IF EXISTS "title";
  ALTER TABLE "experiences" DROP COLUMN IF EXISTS "description";
  ALTER TABLE "experiences" DROP COLUMN IF EXISTS "policies";
  ALTER TABLE "experiences" DROP COLUMN IF EXISTS "seo_title";
  ALTER TABLE "experiences" DROP COLUMN IF EXISTS "seo_description";
  ALTER TABLE "experiences" DROP COLUMN IF EXISTS "seo_keywords";`)
}

