import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  // 1. Rename column base_price_e_g_p / base_price_egp to price_override_e_g_p on departure_slots if it exists
  await db.execute(sql`
    DO $$ 
    BEGIN 
      IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'departure_slots' AND column_name = 'base_price_e_g_p'
      ) THEN
        ALTER TABLE "departure_slots" RENAME COLUMN "base_price_e_g_p" TO "price_override_e_g_p";
      ELSIF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'departure_slots' AND column_name = 'base_price_egp'
      ) THEN
        ALTER TABLE "departure_slots" RENAME COLUMN "base_price_egp" TO "price_override_e_g_p";
      END IF;
    END $$;
  `)

  // 2. Add departure_slot_id to bookings table if not exists
  await db.execute(sql`
    DO $$ 
    BEGIN 
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'bookings' AND column_name = 'departure_slot_id'
      ) THEN
        ALTER TABLE "bookings" ADD COLUMN "departure_slot_id" integer REFERENCES "departure_slots"("id") ON DELETE SET NULL;
        CREATE INDEX IF NOT EXISTS "bookings_departure_slot_idx" ON "bookings" ("departure_slot_id");
      END IF;
    END $$;
  `)

  // 2b. Create experiences_schedules table if not exists
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "experiences_schedules" (
      "_order" integer NOT NULL,
      "_parent_id" integer NOT NULL REFERENCES "experiences"("id") ON DELETE CASCADE,
      "id" varchar PRIMARY KEY NOT NULL,
      "start_time" varchar NOT NULL,
      "default_capacity" numeric NOT NULL,
      "label" varchar
    );
    CREATE INDEX IF NOT EXISTS "experiences_schedules_order_idx" ON "experiences_schedules" ("_order");
    CREATE INDEX IF NOT EXISTS "experiences_schedules_parent_id_idx" ON "experiences_schedules" ("_parent_id");
  `)

  // 3. Deterministic Data Migration: Link unambiguous 1:1 historical bookings to departure slots
  await db.execute(sql`
    DO $$
    DECLARE
      r RECORD;
      slot_id INT;
      match_count INT;
    BEGIN
      FOR r IN 
        SELECT id, experience_id, start_date 
        FROM bookings 
        WHERE departure_slot_id IS NULL AND experience_id IS NOT NULL AND start_date IS NOT NULL
      LOOP
        SELECT COUNT(*), MAX(id) INTO match_count, slot_id
        FROM departure_slots
        WHERE experience_id = r.experience_id AND date::date = r.start_date::date;

        IF match_count = 1 THEN
          UPDATE bookings SET departure_slot_id = slot_id WHERE id = r.id;
          RAISE NOTICE '[Migration] DETERMINISTIC: Linked booking % to departure slot %', r.id, slot_id;
        ELSIF match_count > 1 THEN
          RAISE NOTICE '[Migration] AMBIGUOUS: Booking % has % matching slots for date %. Left null (Zero Fabrication).', r.id, match_count, r.start_date;
        ELSE
          RAISE NOTICE '[Migration] MISSING: Booking % has no matching departure slot for date %. Left null (Zero Fabrication).', r.id, r.start_date;
        END IF;
      END LOOP;
    END $$;
  `)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DO $$ 
    BEGIN 
      IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'departure_slots' AND column_name = 'price_override_egp'
      ) THEN
        ALTER TABLE "departure_slots" RENAME COLUMN "price_override_egp" TO "base_price_egp";
      END IF;
    END $$;
  `)
}
