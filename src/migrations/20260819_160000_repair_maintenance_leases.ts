import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "maintenance_leases" (
      "id" serial PRIMARY KEY NOT NULL,
      "job_name" varchar NOT NULL,
      "worker_id" varchar NOT NULL,
      "lease_expires_at" timestamp(3) with time zone NOT NULL,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );
    CREATE UNIQUE INDEX IF NOT EXISTS "maintenance_leases_job_name_idx" ON "maintenance_leases" USING btree ("job_name");
    CREATE INDEX IF NOT EXISTS "maintenance_leases_updated_at_idx" ON "maintenance_leases" USING btree ("updated_at");
    CREATE INDEX IF NOT EXISTS "maintenance_leases_created_at_idx" ON "maintenance_leases" USING btree ("created_at");
  `)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP TABLE IF EXISTS "maintenance_leases" CASCADE;
  `)
}
