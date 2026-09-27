import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  // 1. Create canonical travelers table
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "travelers" (
      "id" serial PRIMARY KEY NOT NULL,
      "first_name" varchar NOT NULL,
      "last_name" varchar NOT NULL,
      "email" varchar,
      "phone" varchar,
      "date_of_birth" timestamp(3) with time zone,
      "passport_number" varchar,
      "nationality" varchar,
      "notes" varchar,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );

    CREATE INDEX IF NOT EXISTS "travelers_nationality_passport_idx" ON "travelers" ("nationality", "passport_number");
    CREATE INDEX IF NOT EXISTS "travelers_email_idx" ON "travelers" ("email");
    CREATE INDEX IF NOT EXISTS "travelers_names_idx" ON "travelers" ("last_name", "first_name");
  `)

  // 2. Add traveler_id to bookings_travelers
  await db.execute(sql`
    ALTER TABLE "bookings_travelers" ADD COLUMN IF NOT EXISTS "traveler_id" integer;
    DO $$ BEGIN
      ALTER TABLE "bookings_travelers" ADD CONSTRAINT "bookings_travelers_traveler_id_fk" FOREIGN KEY ("traveler_id") REFERENCES "public"."travelers"("id") ON DELETE set null ON UPDATE no action;
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
    CREATE INDEX IF NOT EXISTS "bookings_travelers_traveler_id_idx" ON "bookings_travelers" ("traveler_id");
  `)

  // 3. Update customer_travelers relationship table
  await db.execute(sql`
    ALTER TABLE "customer_travelers" ADD COLUMN IF NOT EXISTS "traveler_id" integer;
    ALTER TABLE "customer_travelers" ADD COLUMN IF NOT EXISTS "is_default" boolean DEFAULT false;
    DO $$ BEGIN
      ALTER TABLE "customer_travelers" ADD CONSTRAINT "customer_travelers_traveler_id_fk" FOREIGN KEY ("traveler_id") REFERENCES "public"."travelers"("id") ON DELETE cascade ON UPDATE no action;
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
    CREATE INDEX IF NOT EXISTS "customer_travelers_traveler_id_idx" ON "customer_travelers" ("traveler_id");
  `)

  // 4. Backfill canonical travelers from existing bookings_travelers safely (No fuzzy guessing)
  // Step A: Distinct travelers with verified legal travel documents (nationality + passport)
  await db.execute(sql`
    INSERT INTO "travelers" ("first_name", "last_name", "email", "phone", "date_of_birth", "passport_number", "nationality", "created_at", "updated_at")
    SELECT DISTINCT ON (TRIM(nationality), TRIM(passport_number))
      first_name,
      last_name,
      email,
      phone,
      date_of_birth,
      passport_number,
      nationality,
      now(),
      now()
    FROM "bookings_travelers"
    WHERE passport_number IS NOT NULL AND TRIM(passport_number) != ''
      AND nationality IS NOT NULL AND TRIM(nationality) != ''
    ORDER BY TRIM(nationality), TRIM(passport_number), _parent_id ASC;
  `)

  // Step B: Link bookings_travelers with matching document identity
  await db.execute(sql`
    UPDATE "bookings_travelers" bt
    SET "traveler_id" = t.id
    FROM "travelers" t
    WHERE TRIM(bt.nationality) = TRIM(t.nationality)
      AND TRIM(bt.passport_number) = TRIM(t.passport_number)
      AND bt.traveler_id IS NULL;
  `)

  // Step C: For remaining unverified / document-less rows, insert individual canonical records (no aggressive merging)
  await db.execute(sql`
    INSERT INTO "travelers" ("first_name", "last_name", "email", "phone", "date_of_birth", "passport_number", "nationality", "created_at", "updated_at")
    SELECT 
      first_name,
      last_name,
      email,
      phone,
      date_of_birth,
      passport_number,
      nationality,
      now(),
      now()
    FROM "bookings_travelers"
    WHERE traveler_id IS NULL;
  `)

  // Step D: Link remaining rows
  await db.execute(sql`
    UPDATE "bookings_travelers" bt
    SET "traveler_id" = t.id
    FROM "travelers" t
    WHERE bt.traveler_id IS NULL
      AND bt.first_name = t.first_name
      AND bt.last_name = t.last_name;
  `)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "bookings_travelers" DROP CONSTRAINT IF EXISTS "bookings_travelers_traveler_id_fk";
    ALTER TABLE "bookings_travelers" DROP COLUMN IF EXISTS "traveler_id";
    ALTER TABLE "customer_travelers" DROP CONSTRAINT IF EXISTS "customer_travelers_traveler_id_fk";
    ALTER TABLE "customer_travelers" DROP COLUMN IF EXISTS "traveler_id";
    ALTER TABLE "customer_travelers" DROP COLUMN IF EXISTS "is_default";
    DROP TABLE IF EXISTS "travelers" CASCADE;
  `)
}
