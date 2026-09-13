import dotenv from 'dotenv'
import path from 'path'
dotenv.config({ path: path.resolve(process.cwd(), '.env') })

// Set VITEST=true to bypass interactive drizzle push prompt during Payload initialization
process.env.VITEST = 'true'

async function run() {
  console.log('🚀 Applying Accommodation Room Rates schema updates to PostgreSQL...')
  const { getPayload } = await import('payload')
  const { default: config } = await import('@payload-config')

  const payload = await getPayload({ config })
  const pool = (payload.db as any).pool

  const client = await pool.connect()
  try {
    console.log('Creating PostgreSQL enum types and tables...')
    await client.query(`
      DO $$ BEGIN
        CREATE TYPE "public"."enum_experiences_accommodations_room_rates_occupancy" AS ENUM('single', 'double', 'triple', 'quad');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;

      DO $$ BEGIN
        CREATE TYPE "public"."enum_experiences_accommodations_pricing_unit" AS ENUM('per_stay', 'per_night');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;

      ALTER TABLE "experiences_accommodations" ADD COLUMN IF NOT EXISTS "pricing_unit" "enum_experiences_accommodations_pricing_unit" DEFAULT 'per_stay';

      CREATE TABLE IF NOT EXISTS "experiences_accommodations_room_rates" (
        "_order" integer NOT NULL,
        "_parent_id" varchar NOT NULL,
        "id" varchar PRIMARY KEY NOT NULL,
        "occupancy" "enum_experiences_accommodations_room_rates_occupancy",
        "rate_e_g_p" numeric,
        "enabled" boolean DEFAULT true
      );

      CREATE INDEX IF NOT EXISTS "experiences_accommodations_room_rates_order_idx" ON "experiences_accommodations_room_rates" ("_order");
      CREATE INDEX IF NOT EXISTS "experiences_accommodations_room_rates_parent_id_idx" ON "experiences_accommodations_room_rates" ("_parent_id");
    `)
    console.log('✅ PostgreSQL types and tables created successfully!')
  } finally {
    client.release()
  }

  process.exit(0)
}

run().catch((err) => {
  console.error('❌ Failed to apply schema updates:', err)
  process.exit(1)
})
