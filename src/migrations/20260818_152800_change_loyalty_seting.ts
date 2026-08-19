import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "loyalty_settings_tiers" ADD COLUMN "label" varchar;
    UPDATE "loyalty_settings_tiers" SET "label" = "label_en";
    ALTER TABLE "loyalty_settings_tiers" ALTER COLUMN "label" SET NOT NULL;
    ALTER TABLE "loyalty_settings_tiers" DROP COLUMN "label_en";
    ALTER TABLE "loyalty_settings_tiers" DROP COLUMN "label_ar";
  `)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "loyalty_settings_tiers" ADD COLUMN "label_en" varchar;
    ALTER TABLE "loyalty_settings_tiers" ADD COLUMN "label_ar" varchar;
    UPDATE "loyalty_settings_tiers" SET "label_en" = "label", "label_ar" = "label";
    ALTER TABLE "loyalty_settings_tiers" ALTER COLUMN "label_en" SET NOT NULL;
    ALTER TABLE "loyalty_settings_tiers" ALTER COLUMN "label_ar" SET NOT NULL;
    ALTER TABLE "loyalty_settings_tiers" DROP COLUMN "label";
  `)
}
