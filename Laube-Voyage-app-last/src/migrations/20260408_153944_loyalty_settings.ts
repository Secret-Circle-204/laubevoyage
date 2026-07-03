import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "loyalty_settings_redemption_tiers" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"points" numeric NOT NULL,
  	"discount_value" numeric NOT NULL
  );
  
  CREATE TABLE "loyalty_settings" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"earning_points_per_dollar" numeric DEFAULT 0.1 NOT NULL,
  	"earning_explorer_multiplier" numeric DEFAULT 1.2 NOT NULL,
  	"earning_voyager_multiplier" numeric DEFAULT 1.5 NOT NULL,
  	"tiers_explorer_threshold" numeric DEFAULT 5000 NOT NULL,
  	"tiers_voyager_threshold" numeric DEFAULT 15000 NOT NULL,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  ALTER TABLE "excursions_itinerary" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "excursions_itinerary" CASCADE;
  ALTER TABLE "bookings" ADD COLUMN "points_redeemed" numeric DEFAULT 0;
  ALTER TABLE "bookings" ADD COLUMN "discount_amount" numeric DEFAULT 0;
  ALTER TABLE "excursions" ADD COLUMN "itinerary" jsonb;
  ALTER TABLE "company_settings" ADD COLUMN "slogan" varchar;
  ALTER TABLE "company_settings" ADD COLUMN "logo_id" integer;
  ALTER TABLE "company_settings" ADD COLUMN "footer_about_text" varchar;
  ALTER TABLE "company_settings" ADD COLUMN "whatsapp" varchar;
  ALTER TABLE "company_settings" ADD COLUMN "google_maps_link" varchar;
  ALTER TABLE "company_settings" ADD COLUMN "working_hours" varchar;
  ALTER TABLE "company_settings" ADD COLUMN "x" varchar;
  ALTER TABLE "company_settings" ADD COLUMN "youtube" varchar;
  ALTER TABLE "company_settings" ADD COLUMN "tiktok" varchar;
  ALTER TABLE "company_settings" ADD COLUMN "commercial_registration" varchar;
  ALTER TABLE "company_settings" ADD COLUMN "tax_id" varchar;
  ALTER TABLE "loyalty_settings_redemption_tiers" ADD CONSTRAINT "loyalty_settings_redemption_tiers_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."loyalty_settings"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "loyalty_settings_redemption_tiers_order_idx" ON "loyalty_settings_redemption_tiers" USING btree ("_order");
  CREATE INDEX "loyalty_settings_redemption_tiers_parent_id_idx" ON "loyalty_settings_redemption_tiers" USING btree ("_parent_id");
  ALTER TABLE "company_settings" ADD CONSTRAINT "company_settings_logo_id_media_id_fk" FOREIGN KEY ("logo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "company_settings_logo_idx" ON "company_settings" USING btree ("logo_id");
  ALTER TABLE "about_page_config" DROP COLUMN "services";`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "excursions_itinerary" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"time" varchar NOT NULL,
  	"activity" varchar NOT NULL
  );
  
  ALTER TABLE "loyalty_settings_redemption_tiers" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "loyalty_settings" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "loyalty_settings_redemption_tiers" CASCADE;
  DROP TABLE "loyalty_settings" CASCADE;
  ALTER TABLE "company_settings" DROP CONSTRAINT "company_settings_logo_id_media_id_fk";
  
  DROP INDEX "company_settings_logo_idx";
  ALTER TABLE "about_page_config" ADD COLUMN "services" varchar;
  ALTER TABLE "excursions_itinerary" ADD CONSTRAINT "excursions_itinerary_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."excursions"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "excursions_itinerary_order_idx" ON "excursions_itinerary" USING btree ("_order");
  CREATE INDEX "excursions_itinerary_parent_id_idx" ON "excursions_itinerary" USING btree ("_parent_id");
  ALTER TABLE "bookings" DROP COLUMN "points_redeemed";
  ALTER TABLE "bookings" DROP COLUMN "discount_amount";
  ALTER TABLE "excursions" DROP COLUMN "itinerary";
  ALTER TABLE "company_settings" DROP COLUMN "slogan";
  ALTER TABLE "company_settings" DROP COLUMN "logo_id";
  ALTER TABLE "company_settings" DROP COLUMN "footer_about_text";
  ALTER TABLE "company_settings" DROP COLUMN "whatsapp";
  ALTER TABLE "company_settings" DROP COLUMN "google_maps_link";
  ALTER TABLE "company_settings" DROP COLUMN "working_hours";
  ALTER TABLE "company_settings" DROP COLUMN "x";
  ALTER TABLE "company_settings" DROP COLUMN "youtube";
  ALTER TABLE "company_settings" DROP COLUMN "tiktok";
  ALTER TABLE "company_settings" DROP COLUMN "commercial_registration";
  ALTER TABLE "company_settings" DROP COLUMN "tax_id";`)
}
