import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_users_role" AS ENUM('admin', 'customer');
  CREATE TYPE "public"."enum_users_loyalty_tier" AS ENUM('traveler', 'explorer', 'voyager');
  CREATE TYPE "public"."enum_packages_type" AS ENUM('outbound', 'inbound');
  CREATE TYPE "public"."enum_bookings_travelers_list_type" AS ENUM('adult', 'infant');
  CREATE TYPE "public"."enum_bookings_status" AS ENUM('pending', 'confirmed', 'completed', 'cancelled');
  CREATE TYPE "public"."enum_blog_posts_categories" AS ENUM('travel-tips', 'destinations', 'culture', 'food-dining', 'adventure', 'luxury');
  CREATE TYPE "public"."enum_blog_posts_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum_excursions_category" AS ENUM('sea-trips', 'safari-adventure', 'cultural-history', 'family-kids');
  CREATE TYPE "public"."enum_loyalty_points_type" AS ENUM('earned', 'redeemed', 'admin');
  CREATE TYPE "public"."enum_emails_type" AS ENUM('welcome', 'verification', 'booking_confirmation', 'tier_jump', 'points_earned');
  CREATE TYPE "public"."enum_emails_status" AS ENUM('sent', 'failed', 'pending');
  CREATE TYPE "public"."enum_destinations_region" AS ENUM('europe', 'middle-east', 'africa', 'asia', 'americas', 'local');
  CREATE TYPE "public"."enum_hotels_amenities" AS ENUM('pool', 'spa', 'gym', 'wifi', 'restaurant', 'all-inclusive');
  CREATE TYPE "public"."enum_contact_inquiries_subject" AS ENUM('booking', 'reservation', 'loyalty', 'feedback', 'partnership');
  CREATE TYPE "public"."enum_contact_inquiries_status" AS ENUM('new', 'in-progress', 'responded', 'closed');
  CREATE TYPE "public"."enum_reviews_status" AS ENUM('pending', 'approved', 'rejected');
  CREATE TYPE "public"."enum_home_page_config_video_gallery_category" AS ENUM('lifestyle', 'testimonial', 'event', 'bts');
  CREATE TABLE "users_sessions" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"created_at" timestamp(3) with time zone,
  	"expires_at" timestamp(3) with time zone NOT NULL
  );
  
  CREATE TABLE "users" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"role" "enum_users_role" DEFAULT 'customer' NOT NULL,
  	"name" varchar NOT NULL,
  	"is_verified" boolean DEFAULT false,
  	"verification_code" varchar,
  	"loyalty_tier" "enum_users_loyalty_tier" DEFAULT 'traveler',
  	"loyalty_points" numeric DEFAULT 0,
  	"total_spend" numeric DEFAULT 0,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"email" varchar NOT NULL,
  	"reset_password_token" varchar,
  	"reset_password_expiration" timestamp(3) with time zone,
  	"salt" varchar,
  	"hash" varchar,
  	"login_attempts" numeric DEFAULT 0,
  	"lock_until" timestamp(3) with time zone
  );
  
  CREATE TABLE "media" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"alt" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"url" varchar,
  	"thumbnail_u_r_l" varchar,
  	"filename" varchar,
  	"mime_type" varchar,
  	"filesize" numeric,
  	"width" numeric,
  	"height" numeric,
  	"focal_x" numeric,
  	"focal_y" numeric,
  	"sizes_thumbnail_url" varchar,
  	"sizes_thumbnail_width" numeric,
  	"sizes_thumbnail_height" numeric,
  	"sizes_thumbnail_mime_type" varchar,
  	"sizes_thumbnail_filesize" numeric,
  	"sizes_thumbnail_filename" varchar,
  	"sizes_card_url" varchar,
  	"sizes_card_width" numeric,
  	"sizes_card_height" numeric,
  	"sizes_card_mime_type" varchar,
  	"sizes_card_filesize" numeric,
  	"sizes_card_filename" varchar,
  	"sizes_tablet_url" varchar,
  	"sizes_tablet_width" numeric,
  	"sizes_tablet_height" numeric,
  	"sizes_tablet_mime_type" varchar,
  	"sizes_tablet_filesize" numeric,
  	"sizes_tablet_filename" varchar
  );
  
  CREATE TABLE "packages_dates" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"start_date" timestamp(3) with time zone,
  	"end_date" timestamp(3) with time zone,
  	"adult_price" numeric,
  	"infant_price" numeric
  );
  
  CREATE TABLE "packages" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"related_destination_id" integer,
  	"city_id" integer,
  	"slug" varchar,
  	"type" "enum_packages_type" NOT NULL,
  	"adult_price" numeric NOT NULL,
  	"infant_price" numeric NOT NULL,
  	"price" numeric,
  	"description" jsonb,
  	"itinerary" jsonb,
  	"excerpt" varchar,
  	"whats_included" jsonb,
  	"duration" varchar,
  	"tour_type" varchar,
  	"group_size" varchar,
  	"languages" varchar,
  	"hero_image_id" integer NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "packages_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"hotels_id" integer,
  	"media_id" integer
  );
  
  CREATE TABLE "bookings_travelers_list" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"full_name" varchar NOT NULL,
  	"type" "enum_bookings_travelers_list_type" DEFAULT 'adult' NOT NULL,
  	"passport_number" varchar,
  	"special_requests" varchar
  );
  
  CREATE TABLE "bookings" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"user_id" integer NOT NULL,
  	"package_id" integer NOT NULL,
  	"contact_email" varchar NOT NULL,
  	"contact_phone" varchar NOT NULL,
  	"booking_date" timestamp(3) with time zone NOT NULL,
  	"total_price" numeric NOT NULL,
  	"status" "enum_bookings_status" DEFAULT 'pending' NOT NULL,
  	"notes" varchar,
  	"receipt_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "bookings_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"excursions_id" integer
  );
  
  CREATE TABLE "blog_posts_categories" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum_blog_posts_categories",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "blog_posts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"slug" varchar NOT NULL,
  	"excerpt" varchar,
  	"featured_image_id" integer,
  	"content" jsonb,
  	"author_id" integer,
  	"status" "enum_blog_posts_status" DEFAULT 'draft' NOT NULL,
  	"published_at" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "excursions_itinerary" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"time" varchar NOT NULL,
  	"activity" varchar NOT NULL
  );
  
  CREATE TABLE "excursions" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"slug" varchar,
  	"related_destination_id" integer,
  	"price" numeric NOT NULL,
  	"category" "enum_excursions_category" NOT NULL,
  	"description" jsonb,
  	"whats_included" jsonb,
  	"what_to_bring" jsonb,
  	"main_image_id" integer,
  	"duration" varchar,
  	"tour_type" varchar,
  	"group_size" varchar,
  	"languages" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "excursions_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"cities_id" integer,
  	"media_id" integer
  );
  
  CREATE TABLE "loyalty_points" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"user_id" integer NOT NULL,
  	"points" numeric NOT NULL,
  	"type" "enum_loyalty_points_type" NOT NULL,
  	"reason" varchar NOT NULL,
  	"booking_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "emails" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"subject" varchar NOT NULL,
  	"to" varchar NOT NULL,
  	"type" "enum_emails_type" NOT NULL,
  	"status" "enum_emails_status" DEFAULT 'pending',
  	"content" jsonb,
  	"user_id" integer NOT NULL,
  	"metadata" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "destinations" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"slug" varchar,
  	"region" "enum_destinations_region" NOT NULL,
  	"country" varchar NOT NULL,
  	"image_id" integer NOT NULL,
  	"description" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "hotels_images" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"image_id" integer NOT NULL
  );
  
  CREATE TABLE "hotels_amenities" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum_hotels_amenities",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "hotels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"location" varchar NOT NULL,
  	"stars" numeric NOT NULL,
  	"description" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "contact_inquiries" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"email" varchar NOT NULL,
  	"phone" varchar,
  	"subject" "enum_contact_inquiries_subject" NOT NULL,
  	"preferred_travel_date" timestamp(3) with time zone,
  	"destination" varchar,
  	"message" varchar NOT NULL,
  	"status" "enum_contact_inquiries_status" DEFAULT 'new',
  	"internal_notes" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "reviews_photos" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"image_id" integer
  );
  
  CREATE TABLE "reviews" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"user_id" integer NOT NULL,
  	"excursion_id" integer NOT NULL,
  	"rating" numeric NOT NULL,
  	"title" varchar NOT NULL,
  	"comment" varchar NOT NULL,
  	"trip_date" timestamp(3) with time zone,
  	"status" "enum_reviews_status" DEFAULT 'pending',
  	"admin_response" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "cities" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"slug" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_kv" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar NOT NULL,
  	"data" jsonb NOT NULL
  );
  
  CREATE TABLE "payload_locked_documents" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"global_slug" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_locked_documents_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"users_id" integer,
  	"media_id" integer,
  	"packages_id" integer,
  	"bookings_id" integer,
  	"blog_posts_id" integer,
  	"excursions_id" integer,
  	"loyalty_points_id" integer,
  	"emails_id" integer,
  	"destinations_id" integer,
  	"hotels_id" integer,
  	"contact_inquiries_id" integer,
  	"reviews_id" integer,
  	"cities_id" integer
  );
  
  CREATE TABLE "payload_preferences" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar,
  	"value" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_preferences_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"users_id" integer
  );
  
  CREATE TABLE "payload_migrations" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"batch" numeric,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "company_settings" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"company_name" varchar DEFAULT 'L''Aube Voyage' NOT NULL,
  	"email" varchar NOT NULL,
  	"phone" varchar NOT NULL,
  	"address" varchar DEFAULT '6th, El-Margoushy street, 6th District, Nasr City, Cairo, Egypt',
  	"instagram" varchar,
  	"facebook" varchar,
  	"linkedin" varchar,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
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
  
  CREATE TABLE "about_page_config_management" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"position" varchar NOT NULL,
  	"bio" jsonb,
  	"image_id" integer
  );
  
  CREATE TABLE "about_page_config_accreditations" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"organization" varchar,
  	"logo_id" integer
  );
  
  CREATE TABLE "about_page_config" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"hero_title" varchar DEFAULT 'Our Story' NOT NULL,
  	"hero_subtitle" varchar DEFAULT 'Crafting extraordinary journeys for the discerning traveler since 1996.' NOT NULL,
  	"hero_image_id" integer NOT NULL,
  	"history_content" jsonb NOT NULL,
  	"history_image_id" integer,
  	"philosophy_content" jsonb NOT NULL,
  	"mission_vision_mission" jsonb,
  	"mission_vision_vision" jsonb,
  	"specialized_programs_cultural_description" jsonb,
  	"specialized_programs_cultural_image_id" integer,
  	"specialized_programs_incentive_description" jsonb,
  	"specialized_programs_incentive_image_id" integer,
  	"specialized_programs_adventure_description" jsonb,
  	"specialized_programs_adventure_image_id" integer,
  	"transport_content" jsonb,
  	"transport_image_id" integer,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  ALTER TABLE "users_sessions" ADD CONSTRAINT "users_sessions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "packages_dates" ADD CONSTRAINT "packages_dates_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."packages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "packages" ADD CONSTRAINT "packages_related_destination_id_destinations_id_fk" FOREIGN KEY ("related_destination_id") REFERENCES "public"."destinations"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "packages" ADD CONSTRAINT "packages_city_id_cities_id_fk" FOREIGN KEY ("city_id") REFERENCES "public"."cities"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "packages" ADD CONSTRAINT "packages_hero_image_id_media_id_fk" FOREIGN KEY ("hero_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "packages_rels" ADD CONSTRAINT "packages_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."packages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "packages_rels" ADD CONSTRAINT "packages_rels_hotels_fk" FOREIGN KEY ("hotels_id") REFERENCES "public"."hotels"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "packages_rels" ADD CONSTRAINT "packages_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "bookings_travelers_list" ADD CONSTRAINT "bookings_travelers_list_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "bookings" ADD CONSTRAINT "bookings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "bookings" ADD CONSTRAINT "bookings_package_id_packages_id_fk" FOREIGN KEY ("package_id") REFERENCES "public"."packages"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "bookings" ADD CONSTRAINT "bookings_receipt_id_media_id_fk" FOREIGN KEY ("receipt_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "bookings_rels" ADD CONSTRAINT "bookings_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "bookings_rels" ADD CONSTRAINT "bookings_rels_excursions_fk" FOREIGN KEY ("excursions_id") REFERENCES "public"."excursions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "blog_posts_categories" ADD CONSTRAINT "blog_posts_categories_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."blog_posts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "blog_posts" ADD CONSTRAINT "blog_posts_featured_image_id_media_id_fk" FOREIGN KEY ("featured_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "blog_posts" ADD CONSTRAINT "blog_posts_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "excursions_itinerary" ADD CONSTRAINT "excursions_itinerary_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."excursions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "excursions" ADD CONSTRAINT "excursions_related_destination_id_destinations_id_fk" FOREIGN KEY ("related_destination_id") REFERENCES "public"."destinations"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "excursions" ADD CONSTRAINT "excursions_main_image_id_media_id_fk" FOREIGN KEY ("main_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "excursions_rels" ADD CONSTRAINT "excursions_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."excursions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "excursions_rels" ADD CONSTRAINT "excursions_rels_cities_fk" FOREIGN KEY ("cities_id") REFERENCES "public"."cities"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "excursions_rels" ADD CONSTRAINT "excursions_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "loyalty_points" ADD CONSTRAINT "loyalty_points_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "loyalty_points" ADD CONSTRAINT "loyalty_points_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "emails" ADD CONSTRAINT "emails_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "destinations" ADD CONSTRAINT "destinations_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "hotels_images" ADD CONSTRAINT "hotels_images_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "hotels_images" ADD CONSTRAINT "hotels_images_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."hotels"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "hotels_amenities" ADD CONSTRAINT "hotels_amenities_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."hotels"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "reviews_photos" ADD CONSTRAINT "reviews_photos_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "reviews_photos" ADD CONSTRAINT "reviews_photos_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."reviews"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "reviews" ADD CONSTRAINT "reviews_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "reviews" ADD CONSTRAINT "reviews_excursion_id_excursions_id_fk" FOREIGN KEY ("excursion_id") REFERENCES "public"."excursions"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_locked_documents"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_packages_fk" FOREIGN KEY ("packages_id") REFERENCES "public"."packages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_bookings_fk" FOREIGN KEY ("bookings_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_blog_posts_fk" FOREIGN KEY ("blog_posts_id") REFERENCES "public"."blog_posts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_excursions_fk" FOREIGN KEY ("excursions_id") REFERENCES "public"."excursions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_loyalty_points_fk" FOREIGN KEY ("loyalty_points_id") REFERENCES "public"."loyalty_points"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_emails_fk" FOREIGN KEY ("emails_id") REFERENCES "public"."emails"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_destinations_fk" FOREIGN KEY ("destinations_id") REFERENCES "public"."destinations"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_hotels_fk" FOREIGN KEY ("hotels_id") REFERENCES "public"."hotels"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_contact_inquiries_fk" FOREIGN KEY ("contact_inquiries_id") REFERENCES "public"."contact_inquiries"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_reviews_fk" FOREIGN KEY ("reviews_id") REFERENCES "public"."reviews"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_cities_fk" FOREIGN KEY ("cities_id") REFERENCES "public"."cities"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_preferences"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "home_page_config_video_gallery" ADD CONSTRAINT "home_page_config_video_gallery_thumbnail_id_media_id_fk" FOREIGN KEY ("thumbnail_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "home_page_config_video_gallery" ADD CONSTRAINT "home_page_config_video_gallery_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."home_page_config"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "home_page_config" ADD CONSTRAINT "home_page_config_hero_background_image_id_media_id_fk" FOREIGN KEY ("hero_background_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "home_page_config_rels" ADD CONSTRAINT "home_page_config_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."home_page_config"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "home_page_config_rels" ADD CONSTRAINT "home_page_config_rels_destinations_fk" FOREIGN KEY ("destinations_id") REFERENCES "public"."destinations"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "home_page_config_rels" ADD CONSTRAINT "home_page_config_rels_packages_fk" FOREIGN KEY ("packages_id") REFERENCES "public"."packages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "about_page_config_philosophy_characteristics" ADD CONSTRAINT "about_page_config_philosophy_characteristics_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."about_page_config"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "about_page_config_services" ADD CONSTRAINT "about_page_config_services_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."about_page_config"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "about_page_config_management" ADD CONSTRAINT "about_page_config_management_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "about_page_config_management" ADD CONSTRAINT "about_page_config_management_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."about_page_config"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "about_page_config_accreditations" ADD CONSTRAINT "about_page_config_accreditations_logo_id_media_id_fk" FOREIGN KEY ("logo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "about_page_config_accreditations" ADD CONSTRAINT "about_page_config_accreditations_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."about_page_config"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "about_page_config" ADD CONSTRAINT "about_page_config_hero_image_id_media_id_fk" FOREIGN KEY ("hero_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "about_page_config" ADD CONSTRAINT "about_page_config_history_image_id_media_id_fk" FOREIGN KEY ("history_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "about_page_config" ADD CONSTRAINT "about_page_config_specialized_programs_cultural_image_id_media_id_fk" FOREIGN KEY ("specialized_programs_cultural_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "about_page_config" ADD CONSTRAINT "about_page_config_specialized_programs_incentive_image_id_media_id_fk" FOREIGN KEY ("specialized_programs_incentive_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "about_page_config" ADD CONSTRAINT "about_page_config_specialized_programs_adventure_image_id_media_id_fk" FOREIGN KEY ("specialized_programs_adventure_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "about_page_config" ADD CONSTRAINT "about_page_config_transport_image_id_media_id_fk" FOREIGN KEY ("transport_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "users_sessions_order_idx" ON "users_sessions" USING btree ("_order");
  CREATE INDEX "users_sessions_parent_id_idx" ON "users_sessions" USING btree ("_parent_id");
  CREATE INDEX "users_updated_at_idx" ON "users" USING btree ("updated_at");
  CREATE INDEX "users_created_at_idx" ON "users" USING btree ("created_at");
  CREATE UNIQUE INDEX "users_email_idx" ON "users" USING btree ("email");
  CREATE INDEX "media_updated_at_idx" ON "media" USING btree ("updated_at");
  CREATE INDEX "media_created_at_idx" ON "media" USING btree ("created_at");
  CREATE UNIQUE INDEX "media_filename_idx" ON "media" USING btree ("filename");
  CREATE INDEX "media_sizes_thumbnail_sizes_thumbnail_filename_idx" ON "media" USING btree ("sizes_thumbnail_filename");
  CREATE INDEX "media_sizes_card_sizes_card_filename_idx" ON "media" USING btree ("sizes_card_filename");
  CREATE INDEX "media_sizes_tablet_sizes_tablet_filename_idx" ON "media" USING btree ("sizes_tablet_filename");
  CREATE INDEX "packages_dates_order_idx" ON "packages_dates" USING btree ("_order");
  CREATE INDEX "packages_dates_parent_id_idx" ON "packages_dates" USING btree ("_parent_id");
  CREATE INDEX "packages_related_destination_idx" ON "packages" USING btree ("related_destination_id");
  CREATE INDEX "packages_city_idx" ON "packages" USING btree ("city_id");
  CREATE UNIQUE INDEX "packages_slug_idx" ON "packages" USING btree ("slug");
  CREATE INDEX "packages_hero_image_idx" ON "packages" USING btree ("hero_image_id");
  CREATE INDEX "packages_updated_at_idx" ON "packages" USING btree ("updated_at");
  CREATE INDEX "packages_created_at_idx" ON "packages" USING btree ("created_at");
  CREATE INDEX "packages_rels_order_idx" ON "packages_rels" USING btree ("order");
  CREATE INDEX "packages_rels_parent_idx" ON "packages_rels" USING btree ("parent_id");
  CREATE INDEX "packages_rels_path_idx" ON "packages_rels" USING btree ("path");
  CREATE INDEX "packages_rels_hotels_id_idx" ON "packages_rels" USING btree ("hotels_id");
  CREATE INDEX "packages_rels_media_id_idx" ON "packages_rels" USING btree ("media_id");
  CREATE INDEX "bookings_travelers_list_order_idx" ON "bookings_travelers_list" USING btree ("_order");
  CREATE INDEX "bookings_travelers_list_parent_id_idx" ON "bookings_travelers_list" USING btree ("_parent_id");
  CREATE INDEX "bookings_user_idx" ON "bookings" USING btree ("user_id");
  CREATE INDEX "bookings_package_idx" ON "bookings" USING btree ("package_id");
  CREATE INDEX "bookings_receipt_idx" ON "bookings" USING btree ("receipt_id");
  CREATE INDEX "bookings_updated_at_idx" ON "bookings" USING btree ("updated_at");
  CREATE INDEX "bookings_created_at_idx" ON "bookings" USING btree ("created_at");
  CREATE INDEX "bookings_rels_order_idx" ON "bookings_rels" USING btree ("order");
  CREATE INDEX "bookings_rels_parent_idx" ON "bookings_rels" USING btree ("parent_id");
  CREATE INDEX "bookings_rels_path_idx" ON "bookings_rels" USING btree ("path");
  CREATE INDEX "bookings_rels_excursions_id_idx" ON "bookings_rels" USING btree ("excursions_id");
  CREATE INDEX "blog_posts_categories_order_idx" ON "blog_posts_categories" USING btree ("order");
  CREATE INDEX "blog_posts_categories_parent_idx" ON "blog_posts_categories" USING btree ("parent_id");
  CREATE UNIQUE INDEX "blog_posts_slug_idx" ON "blog_posts" USING btree ("slug");
  CREATE INDEX "blog_posts_featured_image_idx" ON "blog_posts" USING btree ("featured_image_id");
  CREATE INDEX "blog_posts_author_idx" ON "blog_posts" USING btree ("author_id");
  CREATE INDEX "blog_posts_updated_at_idx" ON "blog_posts" USING btree ("updated_at");
  CREATE INDEX "blog_posts_created_at_idx" ON "blog_posts" USING btree ("created_at");
  CREATE INDEX "excursions_itinerary_order_idx" ON "excursions_itinerary" USING btree ("_order");
  CREATE INDEX "excursions_itinerary_parent_id_idx" ON "excursions_itinerary" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "excursions_slug_idx" ON "excursions" USING btree ("slug");
  CREATE INDEX "excursions_related_destination_idx" ON "excursions" USING btree ("related_destination_id");
  CREATE INDEX "excursions_main_image_idx" ON "excursions" USING btree ("main_image_id");
  CREATE INDEX "excursions_updated_at_idx" ON "excursions" USING btree ("updated_at");
  CREATE INDEX "excursions_created_at_idx" ON "excursions" USING btree ("created_at");
  CREATE INDEX "excursions_rels_order_idx" ON "excursions_rels" USING btree ("order");
  CREATE INDEX "excursions_rels_parent_idx" ON "excursions_rels" USING btree ("parent_id");
  CREATE INDEX "excursions_rels_path_idx" ON "excursions_rels" USING btree ("path");
  CREATE INDEX "excursions_rels_cities_id_idx" ON "excursions_rels" USING btree ("cities_id");
  CREATE INDEX "excursions_rels_media_id_idx" ON "excursions_rels" USING btree ("media_id");
  CREATE INDEX "loyalty_points_user_idx" ON "loyalty_points" USING btree ("user_id");
  CREATE INDEX "loyalty_points_booking_idx" ON "loyalty_points" USING btree ("booking_id");
  CREATE INDEX "loyalty_points_updated_at_idx" ON "loyalty_points" USING btree ("updated_at");
  CREATE INDEX "loyalty_points_created_at_idx" ON "loyalty_points" USING btree ("created_at");
  CREATE INDEX "emails_user_idx" ON "emails" USING btree ("user_id");
  CREATE INDEX "emails_updated_at_idx" ON "emails" USING btree ("updated_at");
  CREATE INDEX "emails_created_at_idx" ON "emails" USING btree ("created_at");
  CREATE UNIQUE INDEX "destinations_slug_idx" ON "destinations" USING btree ("slug");
  CREATE INDEX "destinations_image_idx" ON "destinations" USING btree ("image_id");
  CREATE INDEX "destinations_updated_at_idx" ON "destinations" USING btree ("updated_at");
  CREATE INDEX "destinations_created_at_idx" ON "destinations" USING btree ("created_at");
  CREATE INDEX "hotels_images_order_idx" ON "hotels_images" USING btree ("_order");
  CREATE INDEX "hotels_images_parent_id_idx" ON "hotels_images" USING btree ("_parent_id");
  CREATE INDEX "hotels_images_image_idx" ON "hotels_images" USING btree ("image_id");
  CREATE INDEX "hotels_amenities_order_idx" ON "hotels_amenities" USING btree ("order");
  CREATE INDEX "hotels_amenities_parent_idx" ON "hotels_amenities" USING btree ("parent_id");
  CREATE INDEX "hotels_updated_at_idx" ON "hotels" USING btree ("updated_at");
  CREATE INDEX "hotels_created_at_idx" ON "hotels" USING btree ("created_at");
  CREATE INDEX "contact_inquiries_updated_at_idx" ON "contact_inquiries" USING btree ("updated_at");
  CREATE INDEX "contact_inquiries_created_at_idx" ON "contact_inquiries" USING btree ("created_at");
  CREATE INDEX "reviews_photos_order_idx" ON "reviews_photos" USING btree ("_order");
  CREATE INDEX "reviews_photos_parent_id_idx" ON "reviews_photos" USING btree ("_parent_id");
  CREATE INDEX "reviews_photos_image_idx" ON "reviews_photos" USING btree ("image_id");
  CREATE INDEX "reviews_user_idx" ON "reviews" USING btree ("user_id");
  CREATE INDEX "reviews_excursion_idx" ON "reviews" USING btree ("excursion_id");
  CREATE INDEX "reviews_updated_at_idx" ON "reviews" USING btree ("updated_at");
  CREATE INDEX "reviews_created_at_idx" ON "reviews" USING btree ("created_at");
  CREATE UNIQUE INDEX "cities_name_idx" ON "cities" USING btree ("name");
  CREATE UNIQUE INDEX "cities_slug_idx" ON "cities" USING btree ("slug");
  CREATE INDEX "cities_updated_at_idx" ON "cities" USING btree ("updated_at");
  CREATE INDEX "cities_created_at_idx" ON "cities" USING btree ("created_at");
  CREATE UNIQUE INDEX "payload_kv_key_idx" ON "payload_kv" USING btree ("key");
  CREATE INDEX "payload_locked_documents_global_slug_idx" ON "payload_locked_documents" USING btree ("global_slug");
  CREATE INDEX "payload_locked_documents_updated_at_idx" ON "payload_locked_documents" USING btree ("updated_at");
  CREATE INDEX "payload_locked_documents_created_at_idx" ON "payload_locked_documents" USING btree ("created_at");
  CREATE INDEX "payload_locked_documents_rels_order_idx" ON "payload_locked_documents_rels" USING btree ("order");
  CREATE INDEX "payload_locked_documents_rels_parent_idx" ON "payload_locked_documents_rels" USING btree ("parent_id");
  CREATE INDEX "payload_locked_documents_rels_path_idx" ON "payload_locked_documents_rels" USING btree ("path");
  CREATE INDEX "payload_locked_documents_rels_users_id_idx" ON "payload_locked_documents_rels" USING btree ("users_id");
  CREATE INDEX "payload_locked_documents_rels_media_id_idx" ON "payload_locked_documents_rels" USING btree ("media_id");
  CREATE INDEX "payload_locked_documents_rels_packages_id_idx" ON "payload_locked_documents_rels" USING btree ("packages_id");
  CREATE INDEX "payload_locked_documents_rels_bookings_id_idx" ON "payload_locked_documents_rels" USING btree ("bookings_id");
  CREATE INDEX "payload_locked_documents_rels_blog_posts_id_idx" ON "payload_locked_documents_rels" USING btree ("blog_posts_id");
  CREATE INDEX "payload_locked_documents_rels_excursions_id_idx" ON "payload_locked_documents_rels" USING btree ("excursions_id");
  CREATE INDEX "payload_locked_documents_rels_loyalty_points_id_idx" ON "payload_locked_documents_rels" USING btree ("loyalty_points_id");
  CREATE INDEX "payload_locked_documents_rels_emails_id_idx" ON "payload_locked_documents_rels" USING btree ("emails_id");
  CREATE INDEX "payload_locked_documents_rels_destinations_id_idx" ON "payload_locked_documents_rels" USING btree ("destinations_id");
  CREATE INDEX "payload_locked_documents_rels_hotels_id_idx" ON "payload_locked_documents_rels" USING btree ("hotels_id");
  CREATE INDEX "payload_locked_documents_rels_contact_inquiries_id_idx" ON "payload_locked_documents_rels" USING btree ("contact_inquiries_id");
  CREATE INDEX "payload_locked_documents_rels_reviews_id_idx" ON "payload_locked_documents_rels" USING btree ("reviews_id");
  CREATE INDEX "payload_locked_documents_rels_cities_id_idx" ON "payload_locked_documents_rels" USING btree ("cities_id");
  CREATE INDEX "payload_preferences_key_idx" ON "payload_preferences" USING btree ("key");
  CREATE INDEX "payload_preferences_updated_at_idx" ON "payload_preferences" USING btree ("updated_at");
  CREATE INDEX "payload_preferences_created_at_idx" ON "payload_preferences" USING btree ("created_at");
  CREATE INDEX "payload_preferences_rels_order_idx" ON "payload_preferences_rels" USING btree ("order");
  CREATE INDEX "payload_preferences_rels_parent_idx" ON "payload_preferences_rels" USING btree ("parent_id");
  CREATE INDEX "payload_preferences_rels_path_idx" ON "payload_preferences_rels" USING btree ("path");
  CREATE INDEX "payload_preferences_rels_users_id_idx" ON "payload_preferences_rels" USING btree ("users_id");
  CREATE INDEX "payload_migrations_updated_at_idx" ON "payload_migrations" USING btree ("updated_at");
  CREATE INDEX "payload_migrations_created_at_idx" ON "payload_migrations" USING btree ("created_at");
  CREATE INDEX "home_page_config_video_gallery_order_idx" ON "home_page_config_video_gallery" USING btree ("_order");
  CREATE INDEX "home_page_config_video_gallery_parent_id_idx" ON "home_page_config_video_gallery" USING btree ("_parent_id");
  CREATE INDEX "home_page_config_video_gallery_thumbnail_idx" ON "home_page_config_video_gallery" USING btree ("thumbnail_id");
  CREATE INDEX "home_page_config_hero_hero_background_image_idx" ON "home_page_config" USING btree ("hero_background_image_id");
  CREATE INDEX "home_page_config_rels_order_idx" ON "home_page_config_rels" USING btree ("order");
  CREATE INDEX "home_page_config_rels_parent_idx" ON "home_page_config_rels" USING btree ("parent_id");
  CREATE INDEX "home_page_config_rels_path_idx" ON "home_page_config_rels" USING btree ("path");
  CREATE INDEX "home_page_config_rels_destinations_id_idx" ON "home_page_config_rels" USING btree ("destinations_id");
  CREATE INDEX "home_page_config_rels_packages_id_idx" ON "home_page_config_rels" USING btree ("packages_id");
  CREATE INDEX "about_page_config_philosophy_characteristics_order_idx" ON "about_page_config_philosophy_characteristics" USING btree ("_order");
  CREATE INDEX "about_page_config_philosophy_characteristics_parent_id_idx" ON "about_page_config_philosophy_characteristics" USING btree ("_parent_id");
  CREATE INDEX "about_page_config_services_order_idx" ON "about_page_config_services" USING btree ("_order");
  CREATE INDEX "about_page_config_services_parent_id_idx" ON "about_page_config_services" USING btree ("_parent_id");
  CREATE INDEX "about_page_config_management_order_idx" ON "about_page_config_management" USING btree ("_order");
  CREATE INDEX "about_page_config_management_parent_id_idx" ON "about_page_config_management" USING btree ("_parent_id");
  CREATE INDEX "about_page_config_management_image_idx" ON "about_page_config_management" USING btree ("image_id");
  CREATE INDEX "about_page_config_accreditations_order_idx" ON "about_page_config_accreditations" USING btree ("_order");
  CREATE INDEX "about_page_config_accreditations_parent_id_idx" ON "about_page_config_accreditations" USING btree ("_parent_id");
  CREATE INDEX "about_page_config_accreditations_logo_idx" ON "about_page_config_accreditations" USING btree ("logo_id");
  CREATE INDEX "about_page_config_hero_hero_image_idx" ON "about_page_config" USING btree ("hero_image_id");
  CREATE INDEX "about_page_config_history_history_image_idx" ON "about_page_config" USING btree ("history_image_id");
  CREATE INDEX "about_page_config_specialized_programs_cultural_speciali_idx" ON "about_page_config" USING btree ("specialized_programs_cultural_image_id");
  CREATE INDEX "about_page_config_specialized_programs_incentive_special_idx" ON "about_page_config" USING btree ("specialized_programs_incentive_image_id");
  CREATE INDEX "about_page_config_specialized_programs_adventure_special_idx" ON "about_page_config" USING btree ("specialized_programs_adventure_image_id");
  CREATE INDEX "about_page_config_transport_transport_image_idx" ON "about_page_config" USING btree ("transport_image_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "users_sessions" CASCADE;
  DROP TABLE "users" CASCADE;
  DROP TABLE "media" CASCADE;
  DROP TABLE "packages_dates" CASCADE;
  DROP TABLE "packages" CASCADE;
  DROP TABLE "packages_rels" CASCADE;
  DROP TABLE "bookings_travelers_list" CASCADE;
  DROP TABLE "bookings" CASCADE;
  DROP TABLE "bookings_rels" CASCADE;
  DROP TABLE "blog_posts_categories" CASCADE;
  DROP TABLE "blog_posts" CASCADE;
  DROP TABLE "excursions_itinerary" CASCADE;
  DROP TABLE "excursions" CASCADE;
  DROP TABLE "excursions_rels" CASCADE;
  DROP TABLE "loyalty_points" CASCADE;
  DROP TABLE "emails" CASCADE;
  DROP TABLE "destinations" CASCADE;
  DROP TABLE "hotels_images" CASCADE;
  DROP TABLE "hotels_amenities" CASCADE;
  DROP TABLE "hotels" CASCADE;
  DROP TABLE "contact_inquiries" CASCADE;
  DROP TABLE "reviews_photos" CASCADE;
  DROP TABLE "reviews" CASCADE;
  DROP TABLE "cities" CASCADE;
  DROP TABLE "payload_kv" CASCADE;
  DROP TABLE "payload_locked_documents" CASCADE;
  DROP TABLE "payload_locked_documents_rels" CASCADE;
  DROP TABLE "payload_preferences" CASCADE;
  DROP TABLE "payload_preferences_rels" CASCADE;
  DROP TABLE "payload_migrations" CASCADE;
  DROP TABLE "company_settings" CASCADE;
  DROP TABLE "home_page_config_video_gallery" CASCADE;
  DROP TABLE "home_page_config" CASCADE;
  DROP TABLE "home_page_config_rels" CASCADE;
  DROP TABLE "about_page_config_philosophy_characteristics" CASCADE;
  DROP TABLE "about_page_config_services" CASCADE;
  DROP TABLE "about_page_config_management" CASCADE;
  DROP TABLE "about_page_config_accreditations" CASCADE;
  DROP TABLE "about_page_config" CASCADE;
  DROP TYPE "public"."enum_users_role";
  DROP TYPE "public"."enum_users_loyalty_tier";
  DROP TYPE "public"."enum_packages_type";
  DROP TYPE "public"."enum_bookings_travelers_list_type";
  DROP TYPE "public"."enum_bookings_status";
  DROP TYPE "public"."enum_blog_posts_categories";
  DROP TYPE "public"."enum_blog_posts_status";
  DROP TYPE "public"."enum_excursions_category";
  DROP TYPE "public"."enum_loyalty_points_type";
  DROP TYPE "public"."enum_emails_type";
  DROP TYPE "public"."enum_emails_status";
  DROP TYPE "public"."enum_destinations_region";
  DROP TYPE "public"."enum_hotels_amenities";
  DROP TYPE "public"."enum_contact_inquiries_subject";
  DROP TYPE "public"."enum_contact_inquiries_status";
  DROP TYPE "public"."enum_reviews_status";
  DROP TYPE "public"."enum_home_page_config_video_gallery_category";`)
}
