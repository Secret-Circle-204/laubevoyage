import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_accommodations_type" AS ENUM('hotel', 'resort', 'cruise', 'lodge', 'camp');
  CREATE TYPE "public"."enum_experiences_accommodations_room_rates_occupancy" AS ENUM('single', 'double', 'triple', 'quad');
  CREATE TYPE "public"."enum_experiences_accommodations_board_basis" AS ENUM('bed_and_breakfast', 'half_board', 'full_board', 'all_inclusive');
  CREATE TYPE "public"."enum_experiences_accommodations_pricing_unit" AS ENUM('per_stay', 'per_night');
  CREATE TYPE "public"."enum_experiences_package_mode" AS ENUM('fixed_date', 'flexible_date');
  CREATE TYPE "public"."enum_bookings_travelers_type" AS ENUM('adult', 'child', 'infant');
  CREATE TYPE "public"."enum_bookings_pickup_location_source" AS ENUM('map', 'search', 'current_location', 'fixed_meeting_point');
  CREATE TYPE "public"."enum_bookings_payment_status" AS ENUM('unpaid', 'partially_paid', 'paid', 'refunded', 'partially_refunded', 'written_off');
  ALTER TYPE "public"."enum_bookings_status" ADD VALUE 'pending_admin_review' BEFORE 'paid';
  ALTER TYPE "public"."enum_notification_logs_category" ADD VALUE 'security';
  CREATE TABLE "accommodations_gallery" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"image_id" integer NOT NULL
  );
  
  CREATE TABLE "accommodations" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"slug" varchar NOT NULL,
  	"type" "enum_accommodations_type" DEFAULT 'hotel' NOT NULL,
  	"city_id" integer NOT NULL,
  	"rating" numeric,
  	"hero_image_id" integer,
  	"description" jsonb,
  	"is_active" boolean DEFAULT true,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "experiences_accommodations_room_rates" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"occupancy" "enum_experiences_accommodations_room_rates_occupancy",
  	"rate_e_g_p" numeric,
  	"enabled" boolean DEFAULT true
  );
  
  CREATE TABLE "experiences_accommodations" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"order" numeric,
  	"property_id" integer,
  	"nights" numeric,
  	"room_category" varchar,
  	"board_basis" "enum_experiences_accommodations_board_basis",
  	"pricing_unit" "enum_experiences_accommodations_pricing_unit" DEFAULT 'per_stay'
  );
  
  CREATE TABLE "experiences_schedules" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"start_time" varchar DEFAULT '09:00',
  	"default_capacity" numeric,
  	"label" varchar
  );
  
  CREATE TABLE "experiences_blackouts" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"date" timestamp(3) with time zone,
  	"start_time" varchar,
  	"reason" varchar DEFAULT 'Seasonal Closure / Maintenance'
  );
  
  CREATE TABLE "experiences_price_overrides" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"date" timestamp(3) with time zone,
  	"start_time" varchar,
  	"price_e_g_p" numeric,
  	"reason" varchar
  );
  
  CREATE TABLE "experiences_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"cities_id" integer
  );
  
  CREATE TABLE "maintenance_leases" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"job_name" varchar NOT NULL,
  	"worker_id" varchar NOT NULL,
  	"lease_expires_at" timestamp(3) with time zone NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "system_settings_booking_notification_emails" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"email" varchar NOT NULL
  );
  
  ALTER TABLE "customer_addresses" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "customer_device_sessions" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "customer_addresses" CASCADE;
  DROP TABLE "customer_device_sessions" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_customer_addresses_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_customer_device_sessions_fk";
  
  DROP INDEX "payload_locked_documents_rels_customer_addresses_id_idx";
  DROP INDEX "payload_locked_documents_rels_customer_device_sessions_i_idx";
  DROP INDEX "reviews_booking_idx";
  ALTER TABLE "customers" ALTER COLUMN "loyalty_tier" DROP DEFAULT;
  ALTER TABLE "customers" ALTER COLUMN "loyalty_tier" DROP NOT NULL;
  ALTER TABLE "experiences" ALTER COLUMN "duration_days" DROP NOT NULL;
  ALTER TABLE "bookings_travelers" ALTER COLUMN "email" DROP NOT NULL;
  ALTER TABLE "bookings_travelers" ALTER COLUMN "phone" DROP NOT NULL;
  ALTER TABLE "experiences_itinerary" ADD COLUMN "city_id" integer;
  ALTER TABLE "experiences" ADD COLUMN "package_mode" "enum_experiences_package_mode" DEFAULT 'fixed_date';
  ALTER TABLE "experiences" ADD COLUMN "duration_duration_minutes" numeric;
  ALTER TABLE "experiences" ADD COLUMN "child_policy_children_allowed" boolean DEFAULT true;
  ALTER TABLE "experiences" ADD COLUMN "child_policy_child_sharing_bed_percentage" numeric DEFAULT 50;
  ALTER TABLE "experiences" ADD COLUMN "child_policy_child_extra_bed_percentage" numeric DEFAULT 75;
  ALTER TABLE "bookings_travelers" ADD COLUMN "nationality" varchar;
  ALTER TABLE "bookings_travelers" ADD COLUMN "type" "enum_bookings_travelers_type" DEFAULT 'adult';
  ALTER TABLE "bookings" ADD COLUMN "departure_slot_id" integer;
  ALTER TABLE "bookings" ADD COLUMN "completion_at" timestamp(3) with time zone;
  ALTER TABLE "bookings" ADD COLUMN "destination_timezone" varchar;
  ALTER TABLE "bookings" ADD COLUMN "payment_window_expires_at" timestamp(3) with time zone NOT NULL;
  ALTER TABLE "bookings" ADD COLUMN "pickup_location_label" varchar;
  ALTER TABLE "bookings" ADD COLUMN "pickup_location_address" varchar;
  ALTER TABLE "bookings" ADD COLUMN "pickup_location_latitude" numeric;
  ALTER TABLE "bookings" ADD COLUMN "pickup_location_longitude" numeric;
  ALTER TABLE "bookings" ADD COLUMN "pickup_location_source" "enum_bookings_pickup_location_source";
  ALTER TABLE "bookings" ADD COLUMN "pickup_location_instructions" varchar;
  ALTER TABLE "bookings" ADD COLUMN "payment_status" "enum_bookings_payment_status" DEFAULT 'unpaid' NOT NULL;
  ALTER TABLE "bookings" ADD COLUMN "amount_paid" numeric DEFAULT 0 NOT NULL;
  ALTER TABLE "bookings" ADD COLUMN "outstanding_balance" numeric DEFAULT 0 NOT NULL;
  ALTER TABLE "departure_slots" ADD COLUMN "price_override_e_g_p" numeric;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "accommodations_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "maintenance_leases_id" integer;
  ALTER TABLE "system_settings" ADD COLUMN "email_sender_settings_reservation_identity_from_name" varchar NOT NULL;
  ALTER TABLE "system_settings" ADD COLUMN "email_sender_settings_reservation_identity_from_email" varchar NOT NULL;
  ALTER TABLE "system_settings" ADD COLUMN "email_sender_settings_reservation_identity_reply_to" varchar NOT NULL;
  ALTER TABLE "system_settings" ADD COLUMN "email_sender_settings_loyalty_identity_from_name" varchar NOT NULL;
  ALTER TABLE "system_settings" ADD COLUMN "email_sender_settings_loyalty_identity_from_email" varchar NOT NULL;
  ALTER TABLE "system_settings" ADD COLUMN "email_sender_settings_loyalty_identity_reply_to" varchar NOT NULL;
  ALTER TABLE "system_settings" ADD COLUMN "email_sender_settings_security_identity_from_name" varchar;
  ALTER TABLE "system_settings" ADD COLUMN "email_sender_settings_security_identity_from_email" varchar;
  ALTER TABLE "system_settings" ADD COLUMN "email_sender_settings_security_identity_reply_to" varchar;
  ALTER TABLE "accommodations_gallery" ADD CONSTRAINT "accommodations_gallery_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "accommodations_gallery" ADD CONSTRAINT "accommodations_gallery_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."accommodations"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "accommodations" ADD CONSTRAINT "accommodations_city_id_cities_id_fk" FOREIGN KEY ("city_id") REFERENCES "public"."cities"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "accommodations" ADD CONSTRAINT "accommodations_hero_image_id_media_id_fk" FOREIGN KEY ("hero_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "experiences_accommodations_room_rates" ADD CONSTRAINT "experiences_accommodations_room_rates_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."experiences_accommodations"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "experiences_accommodations" ADD CONSTRAINT "experiences_accommodations_property_id_accommodations_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."accommodations"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "experiences_accommodations" ADD CONSTRAINT "experiences_accommodations_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."experiences"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "experiences_schedules" ADD CONSTRAINT "experiences_schedules_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."experiences"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "experiences_blackouts" ADD CONSTRAINT "experiences_blackouts_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."experiences"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "experiences_price_overrides" ADD CONSTRAINT "experiences_price_overrides_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."experiences"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "experiences_rels" ADD CONSTRAINT "experiences_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."experiences"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "experiences_rels" ADD CONSTRAINT "experiences_rels_cities_fk" FOREIGN KEY ("cities_id") REFERENCES "public"."cities"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "system_settings_booking_notification_emails" ADD CONSTRAINT "system_settings_booking_notification_emails_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."system_settings"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "accommodations_gallery_order_idx" ON "accommodations_gallery" USING btree ("_order");
  CREATE INDEX "accommodations_gallery_parent_id_idx" ON "accommodations_gallery" USING btree ("_parent_id");
  CREATE INDEX "accommodations_gallery_image_idx" ON "accommodations_gallery" USING btree ("image_id");
  CREATE INDEX "accommodations_name_idx" ON "accommodations" USING btree ("name");
  CREATE UNIQUE INDEX "accommodations_slug_idx" ON "accommodations" USING btree ("slug");
  CREATE INDEX "accommodations_city_idx" ON "accommodations" USING btree ("city_id");
  CREATE INDEX "accommodations_hero_image_idx" ON "accommodations" USING btree ("hero_image_id");
  CREATE INDEX "accommodations_updated_at_idx" ON "accommodations" USING btree ("updated_at");
  CREATE INDEX "accommodations_created_at_idx" ON "accommodations" USING btree ("created_at");
  CREATE INDEX "experiences_accommodations_room_rates_order_idx" ON "experiences_accommodations_room_rates" USING btree ("_order");
  CREATE INDEX "experiences_accommodations_room_rates_parent_id_idx" ON "experiences_accommodations_room_rates" USING btree ("_parent_id");
  CREATE INDEX "experiences_accommodations_order_idx" ON "experiences_accommodations" USING btree ("_order");
  CREATE INDEX "experiences_accommodations_parent_id_idx" ON "experiences_accommodations" USING btree ("_parent_id");
  CREATE INDEX "experiences_accommodations_property_idx" ON "experiences_accommodations" USING btree ("property_id");
  CREATE INDEX "experiences_schedules_order_idx" ON "experiences_schedules" USING btree ("_order");
  CREATE INDEX "experiences_schedules_parent_id_idx" ON "experiences_schedules" USING btree ("_parent_id");
  CREATE INDEX "experiences_blackouts_order_idx" ON "experiences_blackouts" USING btree ("_order");
  CREATE INDEX "experiences_blackouts_parent_id_idx" ON "experiences_blackouts" USING btree ("_parent_id");
  CREATE INDEX "experiences_price_overrides_order_idx" ON "experiences_price_overrides" USING btree ("_order");
  CREATE INDEX "experiences_price_overrides_parent_id_idx" ON "experiences_price_overrides" USING btree ("_parent_id");
  CREATE INDEX "experiences_rels_order_idx" ON "experiences_rels" USING btree ("order");
  CREATE INDEX "experiences_rels_parent_idx" ON "experiences_rels" USING btree ("parent_id");
  CREATE INDEX "experiences_rels_path_idx" ON "experiences_rels" USING btree ("path");
  CREATE INDEX "experiences_rels_cities_id_idx" ON "experiences_rels" USING btree ("cities_id");
  CREATE UNIQUE INDEX "maintenance_leases_job_name_idx" ON "maintenance_leases" USING btree ("job_name");
  CREATE INDEX "maintenance_leases_updated_at_idx" ON "maintenance_leases" USING btree ("updated_at");
  CREATE INDEX "maintenance_leases_created_at_idx" ON "maintenance_leases" USING btree ("created_at");
  CREATE INDEX "system_settings_booking_notification_emails_order_idx" ON "system_settings_booking_notification_emails" USING btree ("_order");
  CREATE INDEX "system_settings_booking_notification_emails_parent_id_idx" ON "system_settings_booking_notification_emails" USING btree ("_parent_id");
  ALTER TABLE "experiences_itinerary" ADD CONSTRAINT "experiences_itinerary_city_id_cities_id_fk" FOREIGN KEY ("city_id") REFERENCES "public"."cities"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "bookings" ADD CONSTRAINT "bookings_departure_slot_id_departure_slots_id_fk" FOREIGN KEY ("departure_slot_id") REFERENCES "public"."departure_slots"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_accommodations_fk" FOREIGN KEY ("accommodations_id") REFERENCES "public"."accommodations"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_maintenance_leases_fk" FOREIGN KEY ("maintenance_leases_id") REFERENCES "public"."maintenance_leases"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "experiences_itinerary_city_idx" ON "experiences_itinerary" USING btree ("city_id");
  CREATE INDEX "bookings_departure_slot_idx" ON "bookings" USING btree ("departure_slot_id");
  CREATE INDEX "bookings_status_idx" ON "bookings" USING btree ("status");
  CREATE INDEX "bookings_start_date_idx" ON "bookings" USING btree ("start_date");
  CREATE INDEX "bookings_end_date_idx" ON "bookings" USING btree ("end_date");
  CREATE INDEX "bookings_completion_at_idx" ON "bookings" USING btree ("completion_at");
  CREATE INDEX "bookings_payment_window_expires_at_idx" ON "bookings" USING btree ("payment_window_expires_at");
  CREATE INDEX "notification_logs_recipient_idx" ON "notification_logs" USING btree ("recipient");
  CREATE INDEX "payload_locked_documents_rels_accommodations_id_idx" ON "payload_locked_documents_rels" USING btree ("accommodations_id");
  CREATE INDEX "payload_locked_documents_rels_maintenance_leases_id_idx" ON "payload_locked_documents_rels" USING btree ("maintenance_leases_id");
  CREATE UNIQUE INDEX "reviews_booking_idx" ON "reviews" USING btree ("booking_id");
  ALTER TABLE "departure_slots" DROP COLUMN "base_price_e_g_p";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "customer_addresses_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "customer_device_sessions_id";
  DROP TYPE "public"."enum_customer_addresses_type";`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_customer_addresses_type" AS ENUM('billing', 'shipping', 'home');
  CREATE TABLE "customer_addresses" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"customer_id" integer NOT NULL,
  	"type" "enum_customer_addresses_type" DEFAULT 'home' NOT NULL,
  	"street" varchar NOT NULL,
  	"city" varchar NOT NULL,
  	"country" varchar NOT NULL,
  	"postal_code" varchar,
  	"is_default" boolean DEFAULT false,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "customer_device_sessions" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"customer_id" integer NOT NULL,
  	"session_id" varchar NOT NULL,
  	"device_name" varchar NOT NULL,
  	"ip_address" varchar NOT NULL,
  	"last_active_at" timestamp(3) with time zone NOT NULL,
  	"is_revoked" boolean DEFAULT false,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "accommodations_gallery" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "accommodations" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "experiences_accommodations_room_rates" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "experiences_accommodations" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "experiences_schedules" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "experiences_blackouts" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "experiences_price_overrides" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "experiences_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "maintenance_leases" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "system_settings_booking_notification_emails" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "accommodations_gallery" CASCADE;
  DROP TABLE "accommodations" CASCADE;
  DROP TABLE "experiences_accommodations_room_rates" CASCADE;
  DROP TABLE "experiences_accommodations" CASCADE;
  DROP TABLE "experiences_schedules" CASCADE;
  DROP TABLE "experiences_blackouts" CASCADE;
  DROP TABLE "experiences_price_overrides" CASCADE;
  DROP TABLE "experiences_rels" CASCADE;
  DROP TABLE "maintenance_leases" CASCADE;
  DROP TABLE "system_settings_booking_notification_emails" CASCADE;
  ALTER TABLE "experiences_itinerary" DROP CONSTRAINT "experiences_itinerary_city_id_cities_id_fk";
  
  ALTER TABLE "bookings" DROP CONSTRAINT "bookings_departure_slot_id_departure_slots_id_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_accommodations_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_maintenance_leases_fk";
  
  ALTER TABLE "bookings" ALTER COLUMN "status" SET DATA TYPE text;
  ALTER TABLE "bookings" ALTER COLUMN "status" SET DEFAULT 'draft'::text;
  DROP TYPE "public"."enum_bookings_status";
  CREATE TYPE "public"."enum_bookings_status" AS ENUM('draft', 'pending_payment', 'paid', 'confirmed', 'completed', 'cancelled', 'refunded', 'expired', 'payment_received_after_expiry');
  ALTER TABLE "bookings" ALTER COLUMN "status" SET DEFAULT 'draft'::"public"."enum_bookings_status";
  ALTER TABLE "bookings" ALTER COLUMN "status" SET DATA TYPE "public"."enum_bookings_status" USING "status"::"public"."enum_bookings_status";
  ALTER TABLE "notification_logs" ALTER COLUMN "category" SET DATA TYPE text;
  DROP TYPE "public"."enum_notification_logs_category";
  CREATE TYPE "public"."enum_notification_logs_category" AS ENUM('marketing', 'booking', 'payment', 'loyalty');
  ALTER TABLE "notification_logs" ALTER COLUMN "category" SET DATA TYPE "public"."enum_notification_logs_category" USING "category"::"public"."enum_notification_logs_category";
  DROP INDEX "experiences_itinerary_city_idx";
  DROP INDEX "bookings_departure_slot_idx";
  DROP INDEX "bookings_status_idx";
  DROP INDEX "bookings_start_date_idx";
  DROP INDEX "bookings_end_date_idx";
  DROP INDEX "bookings_completion_at_idx";
  DROP INDEX "bookings_payment_window_expires_at_idx";
  DROP INDEX "notification_logs_recipient_idx";
  DROP INDEX "payload_locked_documents_rels_accommodations_id_idx";
  DROP INDEX "payload_locked_documents_rels_maintenance_leases_id_idx";
  DROP INDEX "reviews_booking_idx";
  ALTER TABLE "customers" ALTER COLUMN "loyalty_tier" SET DEFAULT 'explorer';
  ALTER TABLE "customers" ALTER COLUMN "loyalty_tier" SET NOT NULL;
  ALTER TABLE "experiences" ALTER COLUMN "duration_days" SET NOT NULL;
  ALTER TABLE "bookings_travelers" ALTER COLUMN "email" SET NOT NULL;
  ALTER TABLE "bookings_travelers" ALTER COLUMN "phone" SET NOT NULL;
  ALTER TABLE "departure_slots" ADD COLUMN "base_price_e_g_p" numeric;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "customer_addresses_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "customer_device_sessions_id" integer;
  ALTER TABLE "customer_addresses" ADD CONSTRAINT "customer_addresses_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "customer_device_sessions" ADD CONSTRAINT "customer_device_sessions_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "customer_addresses_customer_idx" ON "customer_addresses" USING btree ("customer_id");
  CREATE INDEX "customer_addresses_updated_at_idx" ON "customer_addresses" USING btree ("updated_at");
  CREATE INDEX "customer_addresses_created_at_idx" ON "customer_addresses" USING btree ("created_at");
  CREATE INDEX "customer_device_sessions_customer_idx" ON "customer_device_sessions" USING btree ("customer_id");
  CREATE UNIQUE INDEX "customer_device_sessions_session_id_idx" ON "customer_device_sessions" USING btree ("session_id");
  CREATE INDEX "customer_device_sessions_updated_at_idx" ON "customer_device_sessions" USING btree ("updated_at");
  CREATE INDEX "customer_device_sessions_created_at_idx" ON "customer_device_sessions" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_customer_addresses_fk" FOREIGN KEY ("customer_addresses_id") REFERENCES "public"."customer_addresses"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_customer_device_sessions_fk" FOREIGN KEY ("customer_device_sessions_id") REFERENCES "public"."customer_device_sessions"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_customer_addresses_id_idx" ON "payload_locked_documents_rels" USING btree ("customer_addresses_id");
  CREATE INDEX "payload_locked_documents_rels_customer_device_sessions_i_idx" ON "payload_locked_documents_rels" USING btree ("customer_device_sessions_id");
  CREATE INDEX "reviews_booking_idx" ON "reviews" USING btree ("booking_id");
  ALTER TABLE "experiences_itinerary" DROP COLUMN "city_id";
  ALTER TABLE "experiences" DROP COLUMN "package_mode";
  ALTER TABLE "experiences" DROP COLUMN "duration_duration_minutes";
  ALTER TABLE "experiences" DROP COLUMN "child_policy_children_allowed";
  ALTER TABLE "experiences" DROP COLUMN "child_policy_child_sharing_bed_percentage";
  ALTER TABLE "experiences" DROP COLUMN "child_policy_child_extra_bed_percentage";
  ALTER TABLE "bookings_travelers" DROP COLUMN "nationality";
  ALTER TABLE "bookings_travelers" DROP COLUMN "type";
  ALTER TABLE "bookings" DROP COLUMN "departure_slot_id";
  ALTER TABLE "bookings" DROP COLUMN "completion_at";
  ALTER TABLE "bookings" DROP COLUMN "destination_timezone";
  ALTER TABLE "bookings" DROP COLUMN "payment_window_expires_at";
  ALTER TABLE "bookings" DROP COLUMN "pickup_location_label";
  ALTER TABLE "bookings" DROP COLUMN "pickup_location_address";
  ALTER TABLE "bookings" DROP COLUMN "pickup_location_latitude";
  ALTER TABLE "bookings" DROP COLUMN "pickup_location_longitude";
  ALTER TABLE "bookings" DROP COLUMN "pickup_location_source";
  ALTER TABLE "bookings" DROP COLUMN "pickup_location_instructions";
  ALTER TABLE "bookings" DROP COLUMN "payment_status";
  ALTER TABLE "bookings" DROP COLUMN "amount_paid";
  ALTER TABLE "bookings" DROP COLUMN "outstanding_balance";
  ALTER TABLE "departure_slots" DROP COLUMN "price_override_e_g_p";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "accommodations_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "maintenance_leases_id";
  ALTER TABLE "system_settings" DROP COLUMN "email_sender_settings_reservation_identity_from_name";
  ALTER TABLE "system_settings" DROP COLUMN "email_sender_settings_reservation_identity_from_email";
  ALTER TABLE "system_settings" DROP COLUMN "email_sender_settings_reservation_identity_reply_to";
  ALTER TABLE "system_settings" DROP COLUMN "email_sender_settings_loyalty_identity_from_name";
  ALTER TABLE "system_settings" DROP COLUMN "email_sender_settings_loyalty_identity_from_email";
  ALTER TABLE "system_settings" DROP COLUMN "email_sender_settings_loyalty_identity_reply_to";
  ALTER TABLE "system_settings" DROP COLUMN "email_sender_settings_security_identity_from_name";
  ALTER TABLE "system_settings" DROP COLUMN "email_sender_settings_security_identity_from_email";
  ALTER TABLE "system_settings" DROP COLUMN "email_sender_settings_security_identity_reply_to";
  DROP TYPE "public"."enum_accommodations_type";
  DROP TYPE "public"."enum_experiences_accommodations_room_rates_occupancy";
  DROP TYPE "public"."enum_experiences_accommodations_board_basis";
  DROP TYPE "public"."enum_experiences_accommodations_pricing_unit";
  DROP TYPE "public"."enum_experiences_package_mode";
  DROP TYPE "public"."enum_bookings_travelers_type";
  DROP TYPE "public"."enum_bookings_pickup_location_source";
  DROP TYPE "public"."enum_bookings_payment_status";`)
}
