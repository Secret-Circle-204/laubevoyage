import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "experiences_itinerary" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"day_number" numeric NOT NULL,
  	"title" varchar NOT NULL,
  	"description" varchar NOT NULL
  );
  
  CREATE TABLE "contact_requests" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"email" varchar NOT NULL,
  	"subject" varchar NOT NULL,
  	"message" varchar NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "customers" ADD COLUMN "passport_number" varchar;
  ALTER TABLE "customers" ADD COLUMN "nationality" varchar;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "contact_requests_id" integer;
  ALTER TABLE "experiences_itinerary" ADD CONSTRAINT "experiences_itinerary_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."experiences"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "experiences_itinerary_order_idx" ON "experiences_itinerary" USING btree ("_order");
  CREATE INDEX "experiences_itinerary_parent_id_idx" ON "experiences_itinerary" USING btree ("_parent_id");
  CREATE INDEX "contact_requests_updated_at_idx" ON "contact_requests" USING btree ("updated_at");
  CREATE INDEX "contact_requests_created_at_idx" ON "contact_requests" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_contact_requests_fk" FOREIGN KEY ("contact_requests_id") REFERENCES "public"."contact_requests"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_contact_requests_id_idx" ON "payload_locked_documents_rels" USING btree ("contact_requests_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "experiences_itinerary" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "contact_requests" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "experiences_itinerary" CASCADE;
  DROP TABLE "contact_requests" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_contact_requests_fk";
  
  DROP INDEX "payload_locked_documents_rels_contact_requests_id_idx";
  ALTER TABLE "customers" DROP COLUMN "passport_number";
  ALTER TABLE "customers" DROP COLUMN "nationality";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "contact_requests_id";`)
}
