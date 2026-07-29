import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    CREATE TABLE "maintenance_leases" (
      "job_name" varchar PRIMARY KEY,
      "worker_id" varchar NOT NULL,
      "lease_expires_at" timestamp(3) with time zone NOT NULL,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );
  `)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP TABLE "maintenance_leases" CASCADE;
  `)
}
