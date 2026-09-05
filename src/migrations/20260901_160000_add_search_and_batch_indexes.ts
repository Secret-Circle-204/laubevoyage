import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  // 1. Enable pg_trgm extension for fast text substring and trigram index support
  await db.execute(sql`
    CREATE EXTENSION IF NOT EXISTS pg_trgm;
  `)

  // 2. Add GIN Trigram indexes on experiences title and seo_keywords (if not exists)
  await db.execute(sql`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'experiences_title_trgm_idx'
      ) THEN
        CREATE INDEX "experiences_title_trgm_idx" ON "experiences" USING gin ("title" gin_trgm_ops);
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'experiences_keywords_trgm_idx'
      ) THEN
        CREATE INDEX "experiences_keywords_trgm_idx" ON "experiences" USING gin ("seo_keywords" gin_trgm_ops);
      END IF;
    END $$;
  `)

  // 3. Add Composite B-Tree Indexes on experiences for fast filtered catalog queries
  await db.execute(sql`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'experiences_active_type_city_idx'
      ) THEN
        CREATE INDEX "experiences_active_type_city_idx" ON "experiences" ("is_active", "type", "city_id");
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'experiences_active_price_idx'
      ) THEN
        CREATE INDEX "experiences_active_price_idx" ON "experiences" ("is_active", "price");
      END IF;
    END $$;
  `)

  // 4. Add Composite B-Tree Index on departure_slots for Candidate Batch queries (Starting Price)
  await db.execute(sql`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'departure_slots_candidate_batch_idx'
      ) THEN
        CREATE INDEX "departure_slots_candidate_batch_idx" ON "departure_slots" ("experience_id", "status", "date", "price_override_e_g_p");
      END IF;
    END $$;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP INDEX IF EXISTS "departure_slots_candidate_batch_idx";
    DROP INDEX IF EXISTS "experiences_active_price_idx";
    DROP INDEX IF EXISTS "experiences_active_type_city_idx";
    DROP INDEX IF EXISTS "experiences_keywords_trgm_idx";
    DROP INDEX IF EXISTS "experiences_title_trgm_idx";
  `)
}

