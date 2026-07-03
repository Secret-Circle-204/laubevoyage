import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_home_page_video_gallery_category" AS ENUM('lifestyle', 'testimonial', 'event', 'bts');
  CREATE TABLE "home_page_video_gallery" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"youtube_url" varchar NOT NULL,
  	"description" varchar,
  	"category" "enum_home_page_video_gallery_category",
  	"thumbnail_id" integer
  );
  
  CREATE TABLE "home_page" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"hero_title" varchar NOT NULL,
  	"hero_subtitle" varchar,
  	"hero_background_image_id" integer,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "home_page_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"destinations_id" integer
  );
  
  ALTER TABLE "home_page_config_video_gallery" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "home_page_config" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "home_page_config_rels" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "home_page_config_video_gallery" CASCADE;
  DROP TABLE "home_page_config" CASCADE;
  DROP TABLE "home_page_config_rels" CASCADE;
  ALTER TABLE "packages" DROP CONSTRAINT "packages_city_id_cities_id_fk";
  
  DROP INDEX "packages_city_idx";
  ALTER TABLE "about_page_config" ALTER COLUMN "hero_title" SET DEFAULT 'Who We Are';
  ALTER TABLE "packages" ADD COLUMN "_order" varchar;
  ALTER TABLE "packages_rels" ADD COLUMN "cities_id" integer;
  ALTER TABLE "excursions" ADD COLUMN "_order" varchar;
  ALTER TABLE "home_page_video_gallery" ADD CONSTRAINT "home_page_video_gallery_thumbnail_id_media_id_fk" FOREIGN KEY ("thumbnail_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "home_page_video_gallery" ADD CONSTRAINT "home_page_video_gallery_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."home_page"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "home_page" ADD CONSTRAINT "home_page_hero_background_image_id_media_id_fk" FOREIGN KEY ("hero_background_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "home_page_rels" ADD CONSTRAINT "home_page_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."home_page"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "home_page_rels" ADD CONSTRAINT "home_page_rels_destinations_fk" FOREIGN KEY ("destinations_id") REFERENCES "public"."destinations"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "home_page_video_gallery_order_idx" ON "home_page_video_gallery" USING btree ("_order");
  CREATE INDEX "home_page_video_gallery_parent_id_idx" ON "home_page_video_gallery" USING btree ("_parent_id");
  CREATE INDEX "home_page_video_gallery_thumbnail_idx" ON "home_page_video_gallery" USING btree ("thumbnail_id");
  CREATE INDEX "home_page_hero_hero_background_image_idx" ON "home_page" USING btree ("hero_background_image_id");
  CREATE INDEX "home_page_rels_order_idx" ON "home_page_rels" USING btree ("order");
  CREATE INDEX "home_page_rels_parent_idx" ON "home_page_rels" USING btree ("parent_id");
  CREATE INDEX "home_page_rels_path_idx" ON "home_page_rels" USING btree ("path");
  CREATE INDEX "home_page_rels_destinations_id_idx" ON "home_page_rels" USING btree ("destinations_id");
  ALTER TABLE "packages_rels" ADD CONSTRAINT "packages_rels_cities_fk" FOREIGN KEY ("cities_id") REFERENCES "public"."cities"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "packages__order_idx" ON "packages" USING btree ("_order");
  CREATE INDEX "packages_rels_cities_id_idx" ON "packages_rels" USING btree ("cities_id");
  CREATE INDEX "excursions__order_idx" ON "excursions" USING btree ("_order");
  ALTER TABLE "packages" DROP COLUMN "city_id";
  ALTER TABLE "packages" DROP COLUMN "type";
  DROP TYPE "public"."enum_packages_type";
  DROP TYPE "public"."enum_home_page_config_video_gallery_category";`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_packages_type" AS ENUM('outbound', 'inbound');
  CREATE TYPE "public"."enum_home_page_config_video_gallery_category" AS ENUM('lifestyle', 'testimonial', 'event', 'bts');
  CREATE TABLE "home_page_config_video_gallery" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"youtube_url" varchar NOT NULL,
  	"description" varchar,
  	"category" "enum_home_page_config_video_gallery_category",
  	"thumbnail_id" integer
  );
  
  CREATE TABLE "home_page_config" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"hero_title" varchar NOT NULL,
  	"hero_subtitle" varchar,
  	"hero_background_image_id" integer,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "home_page_config_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"destinations_id" integer,
  	"packages_id" integer
  );
  
  ALTER TABLE "home_page_video_gallery" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "home_page" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "home_page_rels" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "home_page_video_gallery" CASCADE;
  DROP TABLE "home_page" CASCADE;
  DROP TABLE "home_page_rels" CASCADE;
  ALTER TABLE "packages_rels" DROP CONSTRAINT "packages_rels_cities_fk";
  
  DROP INDEX "packages__order_idx";
  DROP INDEX "packages_rels_cities_id_idx";
  DROP INDEX "excursions__order_idx";
  ALTER TABLE "about_page_config" ALTER COLUMN "hero_title" SET DEFAULT 'Our Story';
  ALTER TABLE "packages" ADD COLUMN "city_id" integer;
  ALTER TABLE "packages" ADD COLUMN "type" "enum_packages_type" NOT NULL;
  ALTER TABLE "home_page_config_video_gallery" ADD CONSTRAINT "home_page_config_video_gallery_thumbnail_id_media_id_fk" FOREIGN KEY ("thumbnail_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "home_page_config_video_gallery" ADD CONSTRAINT "home_page_config_video_gallery_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."home_page_config"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "home_page_config" ADD CONSTRAINT "home_page_config_hero_background_image_id_media_id_fk" FOREIGN KEY ("hero_background_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "home_page_config_rels" ADD CONSTRAINT "home_page_config_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."home_page_config"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "home_page_config_rels" ADD CONSTRAINT "home_page_config_rels_destinations_fk" FOREIGN KEY ("destinations_id") REFERENCES "public"."destinations"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "home_page_config_rels" ADD CONSTRAINT "home_page_config_rels_packages_fk" FOREIGN KEY ("packages_id") REFERENCES "public"."packages"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "home_page_config_video_gallery_order_idx" ON "home_page_config_video_gallery" USING btree ("_order");
  CREATE INDEX "home_page_config_video_gallery_parent_id_idx" ON "home_page_config_video_gallery" USING btree ("_parent_id");
  CREATE INDEX "home_page_config_video_gallery_thumbnail_idx" ON "home_page_config_video_gallery" USING btree ("thumbnail_id");
  CREATE INDEX "home_page_config_hero_hero_background_image_idx" ON "home_page_config" USING btree ("hero_background_image_id");
  CREATE INDEX "home_page_config_rels_order_idx" ON "home_page_config_rels" USING btree ("order");
  CREATE INDEX "home_page_config_rels_parent_idx" ON "home_page_config_rels" USING btree ("parent_id");
  CREATE INDEX "home_page_config_rels_path_idx" ON "home_page_config_rels" USING btree ("path");
  CREATE INDEX "home_page_config_rels_destinations_id_idx" ON "home_page_config_rels" USING btree ("destinations_id");
  CREATE INDEX "home_page_config_rels_packages_id_idx" ON "home_page_config_rels" USING btree ("packages_id");
  ALTER TABLE "packages" ADD CONSTRAINT "packages_city_id_cities_id_fk" FOREIGN KEY ("city_id") REFERENCES "public"."cities"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "packages_city_idx" ON "packages" USING btree ("city_id");
  ALTER TABLE "packages" DROP COLUMN "_order";
  ALTER TABLE "packages_rels" DROP COLUMN "cities_id";
  ALTER TABLE "excursions" DROP COLUMN "_order";
  DROP TYPE "public"."enum_home_page_video_gallery_category";`)
}
