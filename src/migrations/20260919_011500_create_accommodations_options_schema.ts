import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * Migration: 20260919_011500_create_accommodations_options_schema
 *
 * Establishes the nested Accommodation Options schema for Package Experiences:
 *   experiences_accommodations (Stay)
 *     └── experiences_accommodations_options (AccommodationOption)
 *           └── experiences_accommodations_options_room_rates (RoomRate)
 *
 * Non-destructive: preserves existing experiences and accommodations records.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    DO $$ BEGIN
      CREATE TYPE "public"."enum_experiences_accommodations_options_board_basis" AS ENUM('bed_and_breakfast', 'half_board', 'full_board', 'all_inclusive');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;

    DO $$ BEGIN
      CREATE TYPE "public"."enum_experiences_accommodations_options_pricing_unit" AS ENUM('per_stay', 'per_night');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;

    DO $$ BEGIN
      CREATE TYPE "public"."enum_experiences_accommodations_options_room_rates_occupancy" AS ENUM('single', 'double', 'triple', 'quad');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;

    CREATE TABLE IF NOT EXISTS "experiences_accommodations_options" (
      "_order" integer NOT NULL,
      "_parent_id" varchar NOT NULL,
      "id" varchar PRIMARY KEY NOT NULL,
      "property_id" integer,
      "room_category" varchar,
      "board_basis" "enum_experiences_accommodations_options_board_basis",
      "pricing_unit" "enum_experiences_accommodations_options_pricing_unit" DEFAULT 'per_stay',
      CONSTRAINT "experiences_accommodations_options_property_id_fk" FOREIGN KEY ("property_id") REFERENCES "accommodations"("id") ON DELETE set null,
      CONSTRAINT "experiences_accommodations_options_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "experiences_accommodations"("id") ON DELETE cascade
    );

    CREATE TABLE IF NOT EXISTS "experiences_accommodations_options_room_rates" (
      "_order" integer NOT NULL,
      "_parent_id" varchar NOT NULL,
      "id" varchar PRIMARY KEY NOT NULL,
      "occupancy" "enum_experiences_accommodations_options_room_rates_occupancy",
      "rate_e_g_p" numeric,
      "enabled" boolean DEFAULT true
    );

    CREATE INDEX IF NOT EXISTS "experiences_accommodations_options_order_idx" ON "experiences_accommodations_options" ("_order");
    CREATE INDEX IF NOT EXISTS "experiences_accommodations_options_parent_id_idx" ON "experiences_accommodations_options" ("_parent_id");
    CREATE INDEX IF NOT EXISTS "experiences_accommodations_options_property_id_idx" ON "experiences_accommodations_options" ("property_id");

    CREATE INDEX IF NOT EXISTS "experiences_accommodations_options_room_rates_order_idx" ON "experiences_accommodations_options_room_rates" ("_order");
    CREATE INDEX IF NOT EXISTS "experiences_accommodations_options_room_rates_parent_id_idx" ON "experiences_accommodations_options_room_rates" ("_parent_id");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP TABLE IF EXISTS "experiences_accommodations_options_room_rates";
    DROP TABLE IF EXISTS "experiences_accommodations_options";
    DROP TYPE IF EXISTS "public"."enum_experiences_accommodations_options_room_rates_occupancy";
    DROP TYPE IF EXISTS "public"."enum_experiences_accommodations_options_pricing_unit";
    DROP TYPE IF EXISTS "public"."enum_experiences_accommodations_options_board_basis";
  `)
}
