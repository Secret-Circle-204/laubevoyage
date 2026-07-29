import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_event_outbox_status" AS ENUM('pending', 'published', 'failed', 'dead_letter');
  CREATE TABLE "event_outbox" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"event_id" varchar NOT NULL,
  	"correlation_id" varchar NOT NULL,
  	"causation_id" varchar,
  	"event_type" varchar NOT NULL,
  	"event_version" numeric DEFAULT 1 NOT NULL,
  	"aggregate_type" varchar NOT NULL,
  	"aggregate_id" varchar NOT NULL,
  	"payload" jsonb NOT NULL,
  	"status" "enum_event_outbox_status" DEFAULT 'pending' NOT NULL,
  	"retry_count" numeric DEFAULT 0 NOT NULL,
  	"next_retry_at" timestamp(3) with time zone,
  	"error_message" varchar,
  	"published_at" timestamp(3) with time zone,
  	"occurred_at" timestamp(3) with time zone NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "event_inbox" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"idempotency_key" varchar NOT NULL,
  	"processed_event_id" varchar NOT NULL,
  	"subscriber_name" varchar NOT NULL,
  	"processed_at" timestamp(3) with time zone NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "event_outbox_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "event_inbox_id" integer;
  CREATE UNIQUE INDEX "event_outbox_event_id_idx" ON "event_outbox" USING btree ("event_id");
  CREATE INDEX "event_outbox_correlation_id_idx" ON "event_outbox" USING btree ("correlation_id");
  CREATE INDEX "event_outbox_causation_id_idx" ON "event_outbox" USING btree ("causation_id");
  CREATE INDEX "event_outbox_event_type_idx" ON "event_outbox" USING btree ("event_type");
  CREATE INDEX "event_outbox_aggregate_type_idx" ON "event_outbox" USING btree ("aggregate_type");
  CREATE INDEX "event_outbox_aggregate_id_idx" ON "event_outbox" USING btree ("aggregate_id");
  CREATE INDEX "event_outbox_status_idx" ON "event_outbox" USING btree ("status");
  CREATE INDEX "event_outbox_updated_at_idx" ON "event_outbox" USING btree ("updated_at");
  CREATE INDEX "event_outbox_created_at_idx" ON "event_outbox" USING btree ("created_at");
  CREATE UNIQUE INDEX "event_inbox_idempotency_key_idx" ON "event_inbox" USING btree ("idempotency_key");
  CREATE INDEX "event_inbox_processed_event_id_idx" ON "event_inbox" USING btree ("processed_event_id");
  CREATE INDEX "event_inbox_subscriber_name_idx" ON "event_inbox" USING btree ("subscriber_name");
  CREATE INDEX "event_inbox_updated_at_idx" ON "event_inbox" USING btree ("updated_at");
  CREATE INDEX "event_inbox_created_at_idx" ON "event_inbox" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_event_outbox_fk" FOREIGN KEY ("event_outbox_id") REFERENCES "public"."event_outbox"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_event_inbox_fk" FOREIGN KEY ("event_inbox_id") REFERENCES "public"."event_inbox"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_event_outbox_id_idx" ON "payload_locked_documents_rels" USING btree ("event_outbox_id");
  CREATE INDEX "payload_locked_documents_rels_event_inbox_id_idx" ON "payload_locked_documents_rels" USING btree ("event_inbox_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "event_outbox" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "event_inbox" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "event_outbox" CASCADE;
  DROP TABLE "event_inbox" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_event_outbox_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_event_inbox_fk";
  
  DROP INDEX "payload_locked_documents_rels_event_outbox_id_idx";
  DROP INDEX "payload_locked_documents_rels_event_inbox_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "event_outbox_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "event_inbox_id";
  DROP TYPE "public"."enum_event_outbox_status";`)
}
