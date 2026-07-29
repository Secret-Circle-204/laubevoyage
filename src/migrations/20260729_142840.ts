import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   DO $$ BEGIN
     CREATE TYPE "public"."enum_countries_measurement_system" AS ENUM('metric', 'imperial');
   EXCEPTION
     WHEN duplicate_object THEN null;
   END $$;
   DROP TABLE IF EXISTS "currencies_country_codes" CASCADE;
   ALTER TABLE "countries" ADD COLUMN IF NOT EXISTS "currency_id" integer;
   ALTER TABLE "countries" ADD COLUMN IF NOT EXISTS "timezone" varchar;
   ALTER TABLE "countries" ADD COLUMN IF NOT EXISTS "measurement_system" "enum_countries_measurement_system" DEFAULT 'metric';
   ALTER TABLE "countries" ADD COLUMN IF NOT EXISTS "week_start" numeric DEFAULT 1;
   DO $$ BEGIN
     ALTER TABLE "countries" ADD CONSTRAINT "countries_currency_id_currencies_id_fk" FOREIGN KEY ("currency_id") REFERENCES "public"."currencies"("id") ON DELETE set null ON UPDATE no action;
   EXCEPTION
     WHEN duplicate_object THEN null;
   END $$;
   CREATE INDEX IF NOT EXISTS "countries_currency_idx" ON "countries" USING btree ("currency_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "currencies_country_codes" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"code" varchar NOT NULL
  );
  
  ALTER TABLE "countries" DROP CONSTRAINT "countries_currency_id_currencies_id_fk";
  
  DROP INDEX "countries_currency_idx";
  ALTER TABLE "currencies_country_codes" ADD CONSTRAINT "currencies_country_codes_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."currencies"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "currencies_country_codes_order_idx" ON "currencies_country_codes" USING btree ("_order");
  CREATE INDEX "currencies_country_codes_parent_id_idx" ON "currencies_country_codes" USING btree ("_parent_id");
  ALTER TABLE "countries" DROP COLUMN "currency_id";
  ALTER TABLE "countries" DROP COLUMN "timezone";
  ALTER TABLE "countries" DROP COLUMN "measurement_system";
  ALTER TABLE "countries" DROP COLUMN "week_start";
  DROP TYPE "public"."enum_countries_measurement_system";`)
}
