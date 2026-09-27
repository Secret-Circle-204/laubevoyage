import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  // 1. Synchronize Payload internal locking documents table with canonical travelers collection
  await db.execute(sql`
    ALTER TABLE "payload_locked_documents_rels" ADD COLUMN IF NOT EXISTS "travelers_id" integer;

    DO $$ BEGIN
      ALTER TABLE "payload_locked_documents_rels" 
      ADD CONSTRAINT "payload_locked_documents_rels_travelers_fk" 
      FOREIGN KEY ("travelers_id") REFERENCES "public"."travelers"("id") 
      ON DELETE cascade ON UPDATE no action;
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;

    CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_travelers_id_idx" 
    ON "payload_locked_documents_rels" USING btree ("travelers_id");
  `)

  // 2. Align customer_travelers table schema with refactored pure-relationship model
  await db.execute(sql`
    ALTER TABLE "customer_travelers" ALTER COLUMN "first_name" DROP NOT NULL;
    ALTER TABLE "customer_travelers" ALTER COLUMN "last_name" DROP NOT NULL;
  `)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_travelers_fk";
    DROP INDEX IF EXISTS "payload_locked_documents_rels_travelers_id_idx";
    ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "travelers_id";
  `)
}
