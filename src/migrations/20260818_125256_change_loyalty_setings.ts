import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "customers" ALTER COLUMN "loyalty_tier" SET DATA TYPE varchar;
  ALTER TABLE "customers" ALTER COLUMN "loyalty_tier" SET DEFAULT 'explorer';
  ALTER TABLE "loyalty_settings_tiers" ALTER COLUMN "tier" SET DATA TYPE varchar;
  ALTER TABLE "loyalty_settings_tiers" ADD COLUMN "label_en" varchar;
  ALTER TABLE "loyalty_settings_tiers" ADD COLUMN "label_ar" varchar;
  UPDATE "loyalty_settings_tiers" SET "label_en" = 'Explorer', "label_ar" = 'المكتشف' WHERE "tier" = 'explorer';
  UPDATE "loyalty_settings_tiers" SET "label_en" = 'Voyager', "label_ar" = 'المسافر' WHERE "tier" = 'voyager';
  UPDATE "loyalty_settings_tiers" SET "label_en" = 'Elite', "label_ar" = 'النخبة' WHERE "tier" = 'elite';
  UPDATE "loyalty_settings_tiers" SET "label_en" = "tier", "label_ar" = "tier" WHERE "label_en" IS NULL;
  ALTER TABLE "loyalty_settings_tiers" ALTER COLUMN "label_en" SET NOT NULL;
  ALTER TABLE "loyalty_settings_tiers" ALTER COLUMN "label_ar" SET NOT NULL;
  DROP TYPE IF EXISTS "public"."enum_customers_loyalty_tier";
  DROP TYPE IF EXISTS "public"."enum_loyalty_settings_tiers_tier";`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_customers_loyalty_tier" AS ENUM('explorer', 'voyager', 'elite');
  CREATE TYPE "public"."enum_loyalty_settings_tiers_tier" AS ENUM('explorer', 'voyager', 'elite');
  ALTER TABLE "customers" ALTER COLUMN "loyalty_tier" SET DEFAULT 'explorer'::"public"."enum_customers_loyalty_tier";
  ALTER TABLE "customers" ALTER COLUMN "loyalty_tier" SET DATA TYPE "public"."enum_customers_loyalty_tier" USING "loyalty_tier"::"public"."enum_customers_loyalty_tier";
  ALTER TABLE "loyalty_settings_tiers" ALTER COLUMN "tier" SET DATA TYPE "public"."enum_loyalty_settings_tiers_tier" USING "tier"::"public"."enum_loyalty_settings_tiers_tier";
  ALTER TABLE "loyalty_settings_tiers" DROP COLUMN "label_en";
  ALTER TABLE "loyalty_settings_tiers" DROP COLUMN "label_ar";`)
}
