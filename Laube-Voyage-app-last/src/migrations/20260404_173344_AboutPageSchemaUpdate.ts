import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "about_page_config_philosophy_characteristics" CASCADE;
  DROP TABLE "about_page_config_services" CASCADE;
  ALTER TABLE "about_page_config" ADD COLUMN "philosophy_characteristics" varchar;
  ALTER TABLE "about_page_config" ADD COLUMN "services" varchar;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "about_page_config_philosophy_characteristics" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"title" varchar
  );
  
  CREATE TABLE "about_page_config_services" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"title" varchar
  );
  
  ALTER TABLE "about_page_config_philosophy_characteristics" ADD CONSTRAINT "about_page_config_philosophy_characteristics_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."about_page_config"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "about_page_config_services" ADD CONSTRAINT "about_page_config_services_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."about_page_config"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "about_page_config_philosophy_characteristics_order_idx" ON "about_page_config_philosophy_characteristics" USING btree ("_order");
  CREATE INDEX "about_page_config_philosophy_characteristics_parent_id_idx" ON "about_page_config_philosophy_characteristics" USING btree ("_parent_id");
  CREATE INDEX "about_page_config_services_order_idx" ON "about_page_config_services" USING btree ("_order");
  CREATE INDEX "about_page_config_services_parent_id_idx" ON "about_page_config_services" USING btree ("_parent_id");
  ALTER TABLE "about_page_config" DROP COLUMN "philosophy_characteristics";
  ALTER TABLE "about_page_config" DROP COLUMN "services";`)
}
