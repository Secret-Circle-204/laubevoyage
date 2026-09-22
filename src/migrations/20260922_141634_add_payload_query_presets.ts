import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   DO $$ BEGIN
     CREATE TYPE "public"."enum_payload_query_presets_access_read_constraint" AS ENUM('everyone', 'onlyMe', 'specificUsers');
   EXCEPTION WHEN duplicate_object THEN null;
   END $$;

   DO $$ BEGIN
     CREATE TYPE "public"."enum_payload_query_presets_access_update_constraint" AS ENUM('everyone', 'onlyMe', 'specificUsers');
   EXCEPTION WHEN duplicate_object THEN null;
   END $$;

   DO $$ BEGIN
     CREATE TYPE "public"."enum_payload_query_presets_access_delete_constraint" AS ENUM('everyone', 'onlyMe', 'specificUsers');
   EXCEPTION WHEN duplicate_object THEN null;
   END $$;

   DO $$ BEGIN
     CREATE TYPE "public"."enum_payload_query_presets_related_collection" AS ENUM('experiences', 'bookings');
   EXCEPTION WHEN duplicate_object THEN null;
   END $$;

   CREATE TABLE IF NOT EXISTS "payload_query_presets" (
     "id" serial PRIMARY KEY NOT NULL,
     "title" varchar NOT NULL,
     "is_shared" boolean DEFAULT false,
     "access_read_constraint" "enum_payload_query_presets_access_read_constraint" DEFAULT 'onlyMe',
     "access_update_constraint" "enum_payload_query_presets_access_update_constraint" DEFAULT 'onlyMe',
     "access_delete_constraint" "enum_payload_query_presets_access_delete_constraint" DEFAULT 'onlyMe',
     "where" jsonb,
     "columns" jsonb,
     "group_by" varchar,
     "related_collection" "enum_payload_query_presets_related_collection" NOT NULL,
     "is_temp" boolean,
     "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
     "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
   );

   CREATE TABLE IF NOT EXISTS "payload_query_presets_rels" (
     "id" serial PRIMARY KEY NOT NULL,
     "order" integer,
     "parent_id" integer NOT NULL,
     "path" varchar NOT NULL,
     "users_id" integer
   );

   DO $$ BEGIN
     ALTER TABLE "payload_query_presets_rels" ADD CONSTRAINT "payload_query_presets_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_query_presets"("id") ON DELETE cascade ON UPDATE no action;
   EXCEPTION
     WHEN duplicate_object THEN null;
   END $$;

   DO $$ BEGIN
     ALTER TABLE "payload_query_presets_rels" ADD CONSTRAINT "payload_query_presets_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
   EXCEPTION
     WHEN duplicate_object THEN null;
   END $$;

   CREATE INDEX IF NOT EXISTS "payload_query_presets_updated_at_idx" ON "payload_query_presets" USING btree ("updated_at");
   CREATE INDEX IF NOT EXISTS "payload_query_presets_created_at_idx" ON "payload_query_presets" USING btree ("created_at");
   CREATE INDEX IF NOT EXISTS "payload_query_presets_rels_order_idx" ON "payload_query_presets_rels" USING btree ("order");
   CREATE INDEX IF NOT EXISTS "payload_query_presets_rels_parent_idx" ON "payload_query_presets_rels" USING btree ("parent_id");
   CREATE INDEX IF NOT EXISTS "payload_query_presets_rels_path_idx" ON "payload_query_presets_rels" USING btree ("path");
   CREATE INDEX IF NOT EXISTS "payload_query_presets_rels_users_id_idx" ON "payload_query_presets_rels" USING btree ("users_id");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE IF EXISTS "payload_query_presets_rels" CASCADE;
   DROP TABLE IF EXISTS "payload_query_presets" CASCADE;
   DROP TYPE IF EXISTS "public"."enum_payload_query_presets_access_read_constraint";
   DROP TYPE IF EXISTS "public"."enum_payload_query_presets_access_update_constraint";
   DROP TYPE IF EXISTS "public"."enum_payload_query_presets_access_delete_constraint";
   DROP TYPE IF EXISTS "public"."enum_payload_query_presets_related_collection";
  `)
}
