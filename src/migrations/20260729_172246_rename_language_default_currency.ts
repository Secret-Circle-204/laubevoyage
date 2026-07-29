import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "languages" DROP CONSTRAINT "languages_default_currency_id_currencies_id_fk";
    DROP INDEX "languages_default_currency_idx";
    ALTER TABLE "languages" RENAME COLUMN "default_currency_id" TO "preferred_display_currency_id";
    ALTER TABLE "languages" ADD CONSTRAINT "languages_preferred_display_currency_id_currencies_id_fk" FOREIGN KEY ("preferred_display_currency_id") REFERENCES "public"."currencies"("id") ON DELETE set null ON UPDATE no action;
    CREATE INDEX "languages_preferred_display_currency_idx" ON "languages" USING btree ("preferred_display_currency_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "languages" DROP CONSTRAINT "languages_preferred_display_currency_id_currencies_id_fk";
    DROP INDEX "languages_preferred_display_currency_idx";
    ALTER TABLE "languages" RENAME COLUMN "preferred_display_currency_id" TO "default_currency_id";
    ALTER TABLE "languages" ADD CONSTRAINT "languages_default_currency_id_currencies_id_fk" FOREIGN KEY ("default_currency_id") REFERENCES "public"."currencies"("id") ON DELETE set null ON UPDATE no action;
    CREATE INDEX "languages_default_currency_idx" ON "languages" USING btree ("default_currency_id");`)
}
