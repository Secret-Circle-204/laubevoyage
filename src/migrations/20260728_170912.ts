import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_loyalty_settings_tiers_tier" AS ENUM('explorer', 'voyager', 'elite');
  CREATE TABLE "loyalty_settings_tiers" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"tier" "enum_loyalty_settings_tiers_tier" NOT NULL,
  	"min_spent_e_g_p" numeric NOT NULL,
  	"earn_multiplier" numeric NOT NULL,
  	"upgrade_bonus" numeric NOT NULL
  );
  
  CREATE TABLE "loyalty_settings" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"version" numeric DEFAULT 1 NOT NULL,
  	"program_code" varchar DEFAULT 'LAUBE_LOYALTY' NOT NULL,
  	"name" varchar DEFAULT 'L''Aube Voyage Loyalty Program' NOT NULL,
  	"base_earn_rate" numeric DEFAULT 1 NOT NULL,
  	"redemption_points_unit" numeric DEFAULT 100 NOT NULL,
  	"redemption_value_e_g_p" numeric DEFAULT 10 NOT NULL,
  	"min_redemption_points" numeric DEFAULT 50 NOT NULL,
  	"redemption_step_unit" numeric DEFAULT 50,
  	"max_redemption_percent" numeric DEFAULT 80 NOT NULL,
  	"max_redemption_fixed_e_g_p" numeric DEFAULT 5000,
  	"allow_partial_redemption" boolean DEFAULT true,
  	"welcome_bonus" numeric DEFAULT 100 NOT NULL,
  	"expiration_months" numeric DEFAULT 12 NOT NULL,
  	"bonus_never_expires" boolean DEFAULT true,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  ALTER TABLE "loyalty_programs_tiers" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "loyalty_programs" DISABLE ROW LEVEL SECURITY;
  DROP TABLE IF EXISTS "loyalty_programs_tiers" CASCADE;
  DROP TABLE IF EXISTS "loyalty_programs" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_loyalty_programs_fk";
  
  DROP INDEX IF EXISTS "payload_locked_documents_rels_loyalty_programs_id_idx";
  ALTER TABLE "loyalty_settings_tiers" ADD CONSTRAINT "loyalty_settings_tiers_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."loyalty_settings"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "loyalty_settings_tiers_order_idx" ON "loyalty_settings_tiers" USING btree ("_order");
  CREATE INDEX "loyalty_settings_tiers_parent_id_idx" ON "loyalty_settings_tiers" USING btree ("_parent_id");
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "loyalty_programs_id";
  DROP TYPE IF EXISTS "public"."enum_loyalty_programs_tiers_tier";
  DROP TYPE IF EXISTS "public"."enum_loyalty_programs_status";`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_loyalty_programs_tiers_tier" AS ENUM('explorer', 'voyager', 'elite');
  CREATE TYPE "public"."enum_loyalty_programs_status" AS ENUM('draft', 'review', 'published', 'archived');
  CREATE TABLE "loyalty_programs_tiers" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"tier" "enum_loyalty_programs_tiers_tier" NOT NULL,
  	"min_spent_e_g_p" numeric NOT NULL,
  	"earn_multiplier" numeric NOT NULL,
  	"upgrade_bonus" numeric NOT NULL
  );
  
  CREATE TABLE "loyalty_programs" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"program_code" varchar NOT NULL,
  	"name" varchar NOT NULL,
  	"status" "enum_loyalty_programs_status" DEFAULT 'draft' NOT NULL,
  	"version" numeric DEFAULT 1 NOT NULL,
  	"effective_from" timestamp(3) with time zone NOT NULL,
  	"effective_until" timestamp(3) with time zone,
  	"is_default" boolean DEFAULT false,
  	"base_earn_rate" numeric DEFAULT 1 NOT NULL,
  	"redemption_points_unit" numeric DEFAULT 100 NOT NULL,
  	"redemption_value_e_g_p" numeric DEFAULT 10 NOT NULL,
  	"min_redemption_points" numeric DEFAULT 50 NOT NULL,
  	"max_redemption_percent" numeric DEFAULT 80 NOT NULL,
  	"max_redemption_fixed_e_g_p" numeric DEFAULT 5000,
  	"allow_partial_redemption" boolean DEFAULT true,
  	"redemption_step_unit" numeric DEFAULT 50,
  	"welcome_bonus" numeric DEFAULT 100 NOT NULL,
  	"expiration_months" numeric DEFAULT 12 NOT NULL,
  	"bonus_never_expires" boolean DEFAULT true,
  	"published_at" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "loyalty_settings_tiers" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "loyalty_settings" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "loyalty_settings_tiers" CASCADE;
  DROP TABLE "loyalty_settings" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "loyalty_programs_id" integer;
  ALTER TABLE "loyalty_programs_tiers" ADD CONSTRAINT "loyalty_programs_tiers_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."loyalty_programs"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "loyalty_programs_tiers_order_idx" ON "loyalty_programs_tiers" USING btree ("_order");
  CREATE INDEX "loyalty_programs_tiers_parent_id_idx" ON "loyalty_programs_tiers" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "loyalty_programs_program_code_idx" ON "loyalty_programs" USING btree ("program_code");
  CREATE INDEX "loyalty_programs_status_idx" ON "loyalty_programs" USING btree ("status");
  CREATE INDEX "loyalty_programs_updated_at_idx" ON "loyalty_programs" USING btree ("updated_at");
  CREATE INDEX "loyalty_programs_created_at_idx" ON "loyalty_programs" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_loyalty_programs_fk" FOREIGN KEY ("loyalty_programs_id") REFERENCES "public"."loyalty_programs"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_loyalty_programs_id_idx" ON "payload_locked_documents_rels" USING btree ("loyalty_programs_id");
  DROP TYPE "public"."enum_loyalty_settings_tiers_tier";`)
}
