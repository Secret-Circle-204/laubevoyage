import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  // 1. Enable pg_trgm for free-text ILIKE search acceleration
  await db.execute(sql`
    CREATE EXTENSION IF NOT EXISTS pg_trgm;
  `)

  // 2. Add GIN Trigram index on experiences.title for high-performance ILIKE substring queries
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "experiences_title_trgm_idx" 
    ON "experiences" USING gin ("title" gin_trgm_ops);
  `)

  // 3. Add B-Tree indexes for single-field filters (type, availability, price)
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "experiences_type_idx" 
    ON "experiences" USING btree ("type");
  `)

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "experiences_availability_idx" 
    ON "experiences" USING btree ("availability");
  `)

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "experiences_price_idx" 
    ON "experiences" USING btree ("price");
  `)

  // 4. Add Compound B-Tree index for common access pattern: Filter by City + Sort by UpdatedAt DESC
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "experiences_city_updated_at_idx" 
    ON "experiences" USING btree ("city_id", "updated_at" DESC);
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP INDEX IF EXISTS "experiences_city_updated_at_idx";
    DROP INDEX IF EXISTS "experiences_price_idx";
    DROP INDEX IF EXISTS "experiences_availability_idx";
    DROP INDEX IF EXISTS "experiences_type_idx";
    DROP INDEX IF EXISTS "experiences_title_trgm_idx";
  `)
}
