import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "countries" ADD COLUMN "default_language_id" integer;
  ALTER TABLE "countries" ADD CONSTRAINT "countries_default_language_id_languages_id_fk" FOREIGN KEY ("default_language_id") REFERENCES "public"."languages"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "countries_default_language_idx" ON "countries" USING btree ("default_language_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "countries" DROP CONSTRAINT "countries_default_language_id_languages_id_fk";
  
  DROP INDEX "countries_default_language_idx";
  ALTER TABLE "countries" DROP COLUMN "default_language_id";`)
}
