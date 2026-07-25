import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_departure_slots_status" AS ENUM('available', 'sold_out', 'blacked_out', 'cancelled');
  CREATE TABLE "departure_slots" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"departure_id" varchar NOT NULL,
  	"experience_id" integer NOT NULL,
  	"date" timestamp(3) with time zone NOT NULL,
  	"start_time" varchar DEFAULT '09:00',
  	"base_price_e_g_p" numeric NOT NULL,
  	"capacity_total" numeric DEFAULT 20 NOT NULL,
  	"capacity_reserved" numeric DEFAULT 0 NOT NULL,
  	"capacity_sold" numeric DEFAULT 0 NOT NULL,
  	"capacity_available" numeric DEFAULT 20 NOT NULL,
  	"version" numeric DEFAULT 1 NOT NULL,
  	"is_blacked_out" boolean DEFAULT false,
  	"status" "enum_departure_slots_status" DEFAULT 'available' NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "system_settings" ALTER COLUMN "vat_rate" SET DEFAULT 0;
  ALTER TABLE "system_settings" ALTER COLUMN "vat_enabled" SET DEFAULT false;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "departure_slots_id" integer;
  ALTER TABLE "departure_slots" ADD CONSTRAINT "departure_slots_experience_id_experiences_id_fk" FOREIGN KEY ("experience_id") REFERENCES "public"."experiences"("id") ON DELETE set null ON UPDATE no action;
  CREATE UNIQUE INDEX "departure_slots_departure_id_idx" ON "departure_slots" USING btree ("departure_id");
  CREATE INDEX "departure_slots_experience_idx" ON "departure_slots" USING btree ("experience_id");
  CREATE INDEX "departure_slots_updated_at_idx" ON "departure_slots" USING btree ("updated_at");
  CREATE INDEX "departure_slots_created_at_idx" ON "departure_slots" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_departure_slots_fk" FOREIGN KEY ("departure_slots_id") REFERENCES "public"."departure_slots"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_departure_slots_id_idx" ON "payload_locked_documents_rels" USING btree ("departure_slots_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "departure_slots" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "departure_slots" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_departure_slots_fk";
  
  DROP INDEX "payload_locked_documents_rels_departure_slots_id_idx";
  ALTER TABLE "system_settings" ALTER COLUMN "vat_rate" SET DEFAULT 14;
  ALTER TABLE "system_settings" ALTER COLUMN "vat_enabled" SET DEFAULT true;
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "departure_slots_id";
  DROP TYPE "public"."enum_departure_slots_status";`)
}
