import dotenv from 'dotenv'
import path from 'path'
dotenv.config({ path: path.resolve(process.cwd(), '.env') })

// Set VITEST=true to bypass interactive drizzle push prompt during Payload initialization
process.env.VITEST = 'true'

async function run() {
  console.log('🚀 Applying Accommodation Options schema updates to PostgreSQL...')
  const { getPayload } = await import('payload')
  const { default: config } = await import('@payload-config')

  const payload = await getPayload({ config })
  const pool = (payload.db as any).pool

  const client = await pool.connect()
  try {
    console.log('Creating PostgreSQL enum types, tables, and indexes for nested options...')
    await client.query(`
      DO $$ BEGIN
        CREATE TYPE "public"."enum_experiences_accommodations_options_board_basis" AS ENUM('bed_and_breakfast', 'half_board', 'full_board', 'all_inclusive');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;

      DO $$ BEGIN
        CREATE TYPE "public"."enum_experiences_accommodations_options_pricing_unit" AS ENUM('per_stay', 'per_night');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;

      DO $$ BEGIN
        CREATE TYPE "public"."enum_experiences_accommodations_options_room_rates_occupancy" AS ENUM('single', 'double', 'triple', 'quad');
      EXCEPTION WHEN duplicate_object THEN null;
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
    console.log('✅ PostgreSQL types, tables, and indexes created successfully!')
  } finally {
    client.release()
  }

  process.exit(0)
}

run().catch((err) => {
  console.error('❌ Failed to apply schema updates:', err)
  process.exit(1)
})
