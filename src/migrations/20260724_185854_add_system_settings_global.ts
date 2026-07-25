import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "system_settings" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"vat_rate" numeric DEFAULT 0 NOT NULL,
  	"prices_include_vat" boolean DEFAULT false,
  	"vat_enabled" boolean DEFAULT false,
  	"base_currency_id" integer NOT NULL,
  	"default_display_currency_id" integer NOT NULL,
  	"auto_sync_exchange_rates" boolean DEFAULT true,
  	"exchange_sync_interval" numeric DEFAULT 60,
  	"exchange_rate_cache_ttl" numeric DEFAULT 15,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  ALTER TABLE "system_settings" ADD CONSTRAINT "system_settings_base_currency_id_currencies_id_fk" FOREIGN KEY ("base_currency_id") REFERENCES "public"."currencies"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "system_settings" ADD CONSTRAINT "system_settings_default_display_currency_id_currencies_id_fk" FOREIGN KEY ("default_display_currency_id") REFERENCES "public"."currencies"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "system_settings_base_currency_idx" ON "system_settings" USING btree ("base_currency_id");
  CREATE INDEX "system_settings_default_display_currency_idx" ON "system_settings" USING btree ("default_display_currency_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "system_settings" CASCADE;`)
}
