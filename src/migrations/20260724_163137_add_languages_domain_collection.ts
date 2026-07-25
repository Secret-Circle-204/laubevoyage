import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "languages" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"native_name" varchar NOT NULL,
  	"code" varchar NOT NULL,
  	"is_r_t_l" boolean DEFAULT false,
  	"is_active" boolean DEFAULT true,
  	"is_default" boolean DEFAULT false,
  	"display_order" numeric DEFAULT 0,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  -- Check if table exists before altering
  DO $$
  BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'translations') THEN
      ALTER TABLE "translations" DISABLE ROW LEVEL SECURITY;
    END IF;
  END $$;

  DROP TABLE IF EXISTS "translations" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_translations_fk";
  
  DROP INDEX IF EXISTS "payload_locked_documents_rels_translations_id_idx";
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN IF NOT EXISTS "languages_id" integer;
  CREATE UNIQUE INDEX "languages_code_idx" ON "languages" USING btree ("code");
  CREATE INDEX "languages_is_active_idx" ON "languages" USING btree ("is_active");
  CREATE INDEX "languages_updated_at_idx" ON "languages" USING btree ("updated_at");
  CREATE INDEX "languages_created_at_idx" ON "languages" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_languages_fk" FOREIGN KEY ("languages_id") REFERENCES "public"."languages"("id") ON DELETE cascade ON UPDATE no action;
  -- Deduplicate translation_cache before creating unique index
  DELETE FROM "translation_cache" a USING "translation_cache" b
  WHERE a.id < b.id
    AND a.original_hash = b.original_hash
    AND a.language = b.language;

  CREATE UNIQUE INDEX "originalHash_language_idx" ON "translation_cache" USING btree ("original_hash","language");
  CREATE INDEX "payload_locked_documents_rels_languages_id_idx" ON "payload_locked_documents_rels" USING btree ("languages_id");
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "translations_id";
  DROP TYPE IF EXISTS "public"."enum_translations_provider";`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_translations_provider" AS ENUM('cache', 'google', 'libre', 'manual');
  CREATE TABLE "translations" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"translation_key" varchar NOT NULL,
  	"locale" varchar NOT NULL,
  	"translated_text" varchar NOT NULL,
  	"provider" "enum_translations_provider" DEFAULT 'manual' NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "languages" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "languages" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_languages_fk";
  
  DROP INDEX "originalHash_language_idx";
  DROP INDEX "payload_locked_documents_rels_languages_id_idx";
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "translations_id" integer;
  CREATE INDEX "translations_translation_key_idx" ON "translations" USING btree ("translation_key");
  CREATE INDEX "translations_locale_idx" ON "translations" USING btree ("locale");
  CREATE INDEX "translations_updated_at_idx" ON "translations" USING btree ("updated_at");
  CREATE INDEX "translations_created_at_idx" ON "translations" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_translations_fk" FOREIGN KEY ("translations_id") REFERENCES "public"."translations"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_translations_id_idx" ON "payload_locked_documents_rels" USING btree ("translations_id");
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "languages_id";`)
}
