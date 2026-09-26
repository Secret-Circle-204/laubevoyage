import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_users_role" AS ENUM('admin', 'super_admin');
  CREATE TYPE "public"."enum_customers_status" AS ENUM('active', 'inactive', 'suspended', 'pending_verification', 'pending_deletion', 'deleted');
  CREATE TYPE "public"."enum_customers_preferences_measurement_system" AS ENUM('metric', 'imperial');
  CREATE TYPE "public"."enum_countries_measurement_system" AS ENUM('metric', 'imperial');
  CREATE TYPE "public"."enum_accommodations_type" AS ENUM('hotel', 'resort', 'cruise', 'lodge', 'camp');
  CREATE TYPE "public"."enum_experiences_accommodations_options_room_rates_occupancy" AS ENUM('single', 'double', 'triple', 'quad');
  CREATE TYPE "public"."enum_experiences_accommodations_options_board_basis" AS ENUM('bed_and_breakfast', 'half_board', 'full_board', 'all_inclusive');
  CREATE TYPE "public"."enum_experiences_accommodations_options_pricing_unit" AS ENUM('per_stay', 'per_night');
  CREATE TYPE "public"."enum_experiences_type" AS ENUM('package', 'daily_tour');
  CREATE TYPE "public"."enum_experiences_package_mode" AS ENUM('fixed_date', 'flexible_date');
  CREATE TYPE "public"."enum_experiences_availability" AS ENUM('available', 'sold_out', 'coming_soon', 'unavailable');
  CREATE TYPE "public"."enum_bookings_travelers_type" AS ENUM('adult', 'child', 'infant');
  CREATE TYPE "public"."enum_bookings_status" AS ENUM('draft', 'pending_payment', 'pending_admin_review', 'paid', 'confirmed', 'completed', 'cancelled', 'refunded', 'expired', 'payment_received_after_expiry');
  CREATE TYPE "public"."enum_bookings_pickup_location_source" AS ENUM('map', 'search', 'current_location', 'fixed_meeting_point');
  CREATE TYPE "public"."enum_bookings_source" AS ENUM('website', 'admin', 'api', 'partner', 'affiliate');
  CREATE TYPE "public"."enum_bookings_payment_status" AS ENUM('unpaid', 'partially_paid', 'paid', 'refunded', 'partially_refunded', 'written_off');
  CREATE TYPE "public"."enum_point_ledger_reference_type" AS ENUM('booking', 'admin_ticket', 'system_welcome', 'expiration_scan');
  CREATE TYPE "public"."enum_point_ledger_type" AS ENUM('earn', 'earned', 'redeem', 'redeemed', 'refund', 'refunded', 'reverse', 'reversed', 'welcome_bonus', 'tier_bonus', 'manual_adjustment', 'expiration', 'expired');
  CREATE TYPE "public"."enum_exchange_rates_source" AS ENUM('OpenExchange', 'ExchangeRate-API', 'FawazAhmed-CDN', 'Manual');
  CREATE TYPE "public"."enum_exchange_rates_sync_status" AS ENUM('synced', 'failed', 'stale');
  CREATE TYPE "public"."enum_admin_audit_logs_target_domain" AS ENUM('booking', 'payment', 'loyalty', 'experience', 'customer', 'maintenance');
  CREATE TYPE "public"."enum_customer_travelers_relationship" AS ENUM('spouse', 'child', 'parent', 'friend', 'other');
  CREATE TYPE "public"."enum_faqs_category" AS ENUM('booking', 'cancellation', 'payment', 'loyalty');
  CREATE TYPE "public"."enum_maintenance_logs_priority" AS ENUM('critical', 'high', 'medium', 'low');
  CREATE TYPE "public"."enum_maintenance_logs_started_by" AS ENUM('scheduler', 'manual_admin', 'api');
  CREATE TYPE "public"."enum_maintenance_logs_status" AS ENUM('running', 'success', 'failed', 'partial_success');
  CREATE TYPE "public"."enum_notification_logs_channel" AS ENUM('email', 'sms', 'push', 'whatsapp');
  CREATE TYPE "public"."enum_notification_logs_category" AS ENUM('marketing', 'booking', 'payment', 'loyalty', 'security');
  CREATE TYPE "public"."enum_notification_logs_priority" AS ENUM('critical', 'high', 'normal', 'low');
  CREATE TYPE "public"."enum_notification_logs_status" AS ENUM('queued', 'processing', 'sent', 'delivered', 'failed', 'dlq');
  CREATE TYPE "public"."enum_pages_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum_payment_transactions_provider" AS ENUM('stripe', 'bnpl', 'manual');
  CREATE TYPE "public"."enum_payment_transactions_status" AS ENUM('initiated', 'processing', 'successful', 'failed', 'refunded', 'partially_refunded');
  CREATE TYPE "public"."enum_posts_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum_redirects_status_code" AS ENUM('301', '302');
  CREATE TYPE "public"."enum_reviews_status" AS ENUM('pending_approval', 'approved', 'rejected');
  CREATE TYPE "public"."enum_coupons_discount_type" AS ENUM('percentage', 'fixed_egp');
  CREATE TYPE "public"."enum_coupons_status" AS ENUM('active', 'inactive', 'expired');
  CREATE TYPE "public"."enum_departure_slots_status" AS ENUM('available', 'sold_out', 'blacked_out', 'cancelled');
  CREATE TYPE "public"."enum_event_outbox_status" AS ENUM('pending', 'processing', 'published', 'failed', 'dead_letter');
  CREATE TABLE "users_sessions" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"created_at" timestamp(3) with time zone,
  	"expires_at" timestamp(3) with time zone NOT NULL
  );
  
  CREATE TABLE "users" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"first_name" varchar NOT NULL,
  	"last_name" varchar NOT NULL,
  	"role" "enum_users_role" DEFAULT 'admin' NOT NULL,
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
  
  CREATE TABLE "customers_sessions" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"created_at" timestamp(3) with time zone,
  	"expires_at" timestamp(3) with time zone NOT NULL
  );
  
  CREATE TABLE "customers" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"first_name" varchar NOT NULL,
  	"last_name" varchar NOT NULL,
  	"phone" varchar,
  	"passport_number" varchar,
  	"nationality" varchar,
  	"status" "enum_customers_status" DEFAULT 'pending_verification' NOT NULL,
  	"failed_login_attempts" numeric DEFAULT 0,
  	"locked_until" timestamp(3) with time zone,
  	"last_login_at" timestamp(3) with time zone,
  	"email_verified_at" timestamp(3) with time zone,
  	"verification_expires_at" timestamp(3) with time zone,
  	"phone_verified_at" timestamp(3) with time zone,
  	"deleted_at" timestamp(3) with time zone,
  	"loyalty_tier" varchar,
  	"loyalty_points" numeric DEFAULT 0,
  	"loyalty_total_spent" numeric DEFAULT 0,
  	"loyalty_tier_achieved_at" timestamp(3) with time zone,
  	"preferences_preferred_locale" varchar DEFAULT 'en-US',
  	"preferences_preferred_language" varchar DEFAULT 'en',
  	"preferences_preferred_currency" varchar DEFAULT 'EGP',
  	"preferences_preferred_timezone" varchar DEFAULT 'Africa/Cairo',
  	"preferences_measurement_system" "enum_customers_preferences_measurement_system" DEFAULT 'metric',
  	"preferences_notifications_email" boolean DEFAULT true,
  	"preferences_notifications_sms" boolean DEFAULT false,
  	"preferences_notifications_push" boolean DEFAULT true,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"email" varchar NOT NULL,
  	"reset_password_token" varchar,
  	"reset_password_expiration" timestamp(3) with time zone,
  	"salt" varchar,
  	"hash" varchar,
  	"_verified" boolean,
  	"_verificationtoken" varchar,
  	"login_attempts" numeric DEFAULT 0,
  	"lock_until" timestamp(3) with time zone
  );
  
  CREATE TABLE "media" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"alt" varchar NOT NULL,
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
  	"focal_y" numeric
  );
  
  CREATE TABLE "countries_gallery" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"image_id" integer NOT NULL
  );
  
  CREATE TABLE "countries" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"slug" varchar NOT NULL,
  	"code" varchar NOT NULL,
  	"description" jsonb,
  	"hero_id" integer,
  	"currency_id" integer,
  	"default_language_id" integer,
  	"timezone" varchar,
  	"measurement_system" "enum_countries_measurement_system" DEFAULT 'metric',
  	"week_start" numeric DEFAULT 1,
  	"is_active" boolean DEFAULT true,
  	"seo_title" varchar,
  	"seo_description" varchar,
  	"seo_keywords" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "cities_gallery" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"image_id" integer NOT NULL
  );
  
  CREATE TABLE "cities" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"slug" varchar NOT NULL,
  	"country_id" integer NOT NULL,
  	"description" jsonb,
  	"hero_id" integer,
  	"is_active" boolean DEFAULT true,
  	"seo_title" varchar,
  	"seo_description" varchar,
  	"seo_keywords" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
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
  
  CREATE TABLE "experiences_gallery" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"image_id" integer NOT NULL
  );
  
  CREATE TABLE "experiences_included" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"item" varchar NOT NULL
  );
  
  CREATE TABLE "experiences_excluded" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"item" varchar NOT NULL
  );
  
  CREATE TABLE "experiences_itinerary" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"day_number" numeric NOT NULL,
  	"title" varchar NOT NULL,
  	"city_id" integer,
  	"description" varchar NOT NULL
  );
  
  CREATE TABLE "experiences_accommodations_options_room_rates" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"occupancy" "enum_experiences_accommodations_options_room_rates_occupancy",
  	"rate_e_g_p" numeric,
  	"enabled" boolean DEFAULT true
  );
  
  CREATE TABLE "experiences_accommodations_options" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"property_id" integer,
  	"is_default" boolean DEFAULT false,
  	"room_category" varchar,
  	"board_basis" "enum_experiences_accommodations_options_board_basis",
  	"pricing_unit" "enum_experiences_accommodations_options_pricing_unit" DEFAULT 'per_stay'
  );
  
  CREATE TABLE "experiences_accommodations" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"order" numeric,
  	"nights" numeric
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
  
  CREATE TABLE "experiences" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"slug" varchar NOT NULL,
  	"type" "enum_experiences_type" NOT NULL,
  	"package_mode" "enum_experiences_package_mode" DEFAULT 'fixed_date',
  	"city_id" integer NOT NULL,
  	"description" jsonb,
  	"hero_id" integer,
  	"duration_days" numeric,
  	"duration_nights" numeric,
  	"duration_duration_minutes" numeric,
  	"price" numeric,
  	"availability" "enum_experiences_availability" DEFAULT 'available' NOT NULL,
  	"child_policy_children_allowed" boolean DEFAULT true,
  	"child_policy_child_sharing_bed_percentage" numeric DEFAULT 50,
  	"child_policy_child_extra_bed_percentage" numeric DEFAULT 75,
  	"policies" jsonb,
  	"is_active" boolean DEFAULT true,
  	"seo_title" varchar,
  	"seo_description" varchar,
  	"seo_keywords" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "experiences_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"cities_id" integer
  );
  
  CREATE TABLE "bookings_travelers" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"first_name" varchar NOT NULL,
  	"last_name" varchar NOT NULL,
  	"email" varchar,
  	"phone" varchar,
  	"date_of_birth" timestamp(3) with time zone,
  	"passport_number" varchar,
  	"nationality" varchar,
  	"type" "enum_bookings_travelers_type" DEFAULT 'adult'
  );
  
  CREATE TABLE "bookings" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"booking_number" varchar NOT NULL,
  	"idempotency_key" varchar,
  	"user_id" integer NOT NULL,
  	"experience_id" integer NOT NULL,
  	"departure_slot_id" integer,
  	"status" "enum_bookings_status" DEFAULT 'draft' NOT NULL,
  	"start_date" timestamp(3) with time zone NOT NULL,
  	"end_date" timestamp(3) with time zone NOT NULL,
  	"completion_at" timestamp(3) with time zone,
  	"destination_timezone" varchar,
  	"payment_window_expires_at" timestamp(3) with time zone NOT NULL,
  	"pricing_snapshot_version" numeric DEFAULT 1,
  	"pricing_snapshot_base_price_e_g_p" numeric NOT NULL,
  	"pricing_snapshot_promotion_discount_e_g_p" numeric DEFAULT 0,
  	"pricing_snapshot_coupon_discount_e_g_p" numeric DEFAULT 0,
  	"pricing_snapshot_loyalty_discount_e_g_p" numeric DEFAULT 0,
  	"pricing_snapshot_subtotal_e_g_p" numeric NOT NULL,
  	"pricing_snapshot_taxes" numeric DEFAULT 0,
  	"pricing_snapshot_fees" numeric DEFAULT 0,
  	"pricing_snapshot_total_amount_e_g_p" numeric NOT NULL,
  	"pricing_snapshot_display_currency" varchar NOT NULL,
  	"pricing_snapshot_display_amount" numeric NOT NULL,
  	"pricing_snapshot_exchange_rate" numeric NOT NULL,
  	"pricing_snapshot_exchange_provider" varchar,
  	"pricing_snapshot_exchange_rate_timestamp" timestamp(3) with time zone,
  	"pricing_snapshot_rounding_strategy" varchar,
  	"pricing_snapshot_currency_decimals" numeric,
  	"pricing_snapshot_commercial_breakdown" jsonb,
  	"points_earned" numeric DEFAULT 0,
  	"payment_id" varchar,
  	"pickup_location_label" varchar,
  	"pickup_location_address" varchar,
  	"pickup_location_latitude" numeric,
  	"pickup_location_longitude" numeric,
  	"pickup_location_source" "enum_bookings_pickup_location_source",
  	"pickup_location_instructions" varchar,
  	"notes" varchar,
  	"source" "enum_bookings_source" DEFAULT 'website',
  	"version" numeric DEFAULT 1,
  	"payment_status" "enum_bookings_payment_status" DEFAULT 'unpaid' NOT NULL,
  	"amount_paid" numeric DEFAULT 0 NOT NULL,
  	"outstanding_balance" numeric DEFAULT 0 NOT NULL,
  	"capacity_hold" jsonb,
  	"point_hold" jsonb,
  	"payment_attempts" jsonb,
  	"timeline" jsonb,
  	"audit_trail" jsonb,
  	"documents" jsonb,
  	"metadata" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "point_ledger" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"user_id" integer NOT NULL,
  	"ledger_version" numeric DEFAULT 1 NOT NULL,
  	"reference_type" "enum_point_ledger_reference_type",
  	"reference_id" varchar,
  	"type" "enum_point_ledger_type" NOT NULL,
  	"amount" numeric NOT NULL,
  	"balance" numeric NOT NULL,
  	"reason" varchar NOT NULL,
  	"booking_id" integer,
  	"expires_at" timestamp(3) with time zone,
  	"metadata" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "exchange_rates" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"from_currency" varchar DEFAULT 'EGP' NOT NULL,
  	"to_currency" varchar NOT NULL,
  	"rate" numeric NOT NULL,
  	"source" "enum_exchange_rates_source" DEFAULT 'OpenExchange' NOT NULL,
  	"last_update" timestamp(3) with time zone,
  	"last_success" timestamp(3) with time zone,
  	"last_attempt" timestamp(3) with time zone,
  	"last_error" varchar,
  	"sync_status" "enum_exchange_rates_sync_status" DEFAULT 'synced',
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "currencies" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"iso_code" varchar NOT NULL,
  	"numeric_code" numeric NOT NULL,
  	"name" varchar NOT NULL,
  	"symbol" varchar NOT NULL,
  	"native_symbol" varchar,
  	"decimals" numeric DEFAULT 2 NOT NULL,
  	"flag_code" varchar,
  	"is_active" boolean DEFAULT true,
  	"display_order" numeric DEFAULT 0,
  	"is_default" boolean DEFAULT false,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "translation_cache" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"original_hash" varchar NOT NULL,
  	"source_text" varchar NOT NULL,
  	"language" varchar NOT NULL,
  	"translated_text" varchar NOT NULL,
  	"provider" varchar NOT NULL,
  	"version" numeric DEFAULT 1 NOT NULL,
  	"last_verified_at" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "admin_audit_logs" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"audit_id" varchar NOT NULL,
  	"admin_user_id" integer NOT NULL,
  	"admin_email" varchar NOT NULL,
  	"action" varchar NOT NULL,
  	"target_domain" "enum_admin_audit_logs_target_domain" NOT NULL,
  	"target_id" varchar NOT NULL,
  	"reason" varchar NOT NULL,
  	"metadata" jsonb,
  	"executed_at" timestamp(3) with time zone NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "customer_notification_preferences" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"customer_id" integer NOT NULL,
  	"marketing_email" boolean DEFAULT true,
  	"marketing_s_m_s" boolean DEFAULT false,
  	"marketing_push" boolean DEFAULT true,
  	"booking_email" boolean DEFAULT true,
  	"booking_s_m_s" boolean DEFAULT true,
  	"booking_push" boolean DEFAULT true,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "customer_travelers" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"customer_id" integer NOT NULL,
  	"first_name" varchar NOT NULL,
  	"last_name" varchar NOT NULL,
  	"date_of_birth" timestamp(3) with time zone,
  	"passport_number" varchar,
  	"relationship" "enum_customer_travelers_relationship" DEFAULT 'other' NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "dashboard_projections" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"projection_id" varchar NOT NULL,
  	"customer_id" integer NOT NULL,
  	"projection_json" jsonb NOT NULL,
  	"version" numeric DEFAULT 1,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "faqs" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"faq_id" varchar NOT NULL,
  	"category" "enum_faqs_category" DEFAULT 'booking' NOT NULL,
  	"question" varchar NOT NULL,
  	"answer" varchar NOT NULL,
  	"order" numeric DEFAULT 0,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "maintenance_logs" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"execution_id" varchar NOT NULL,
  	"correlation_id" varchar NOT NULL,
  	"job_name" varchar NOT NULL,
  	"priority" "enum_maintenance_logs_priority" DEFAULT 'medium' NOT NULL,
  	"started_by" "enum_maintenance_logs_started_by" DEFAULT 'scheduler' NOT NULL,
  	"status" "enum_maintenance_logs_status" DEFAULT 'running' NOT NULL,
  	"items_processed" numeric DEFAULT 0,
  	"items_failed" numeric DEFAULT 0,
  	"duration_ms" numeric DEFAULT 0,
  	"job_version" varchar DEFAULT '1.0.0',
  	"engine_version" varchar DEFAULT '1.0.0',
  	"error_details" varchar,
  	"executed_at" timestamp(3) with time zone NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "media_gallery" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"media_id" varchar NOT NULL,
  	"alt_text" varchar NOT NULL,
  	"file_url" varchar NOT NULL,
  	"mime_type" varchar NOT NULL,
  	"format" varchar DEFAULT 'webp',
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "notification_logs" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"notification_id" varchar NOT NULL,
  	"reference_type" varchar NOT NULL,
  	"reference_id" varchar NOT NULL,
  	"customer_id" integer,
  	"recipient" varchar NOT NULL,
  	"channel" "enum_notification_logs_channel" NOT NULL,
  	"category" "enum_notification_logs_category" NOT NULL,
  	"priority" "enum_notification_logs_priority" DEFAULT 'normal' NOT NULL,
  	"template_id" varchar NOT NULL,
  	"template_data" jsonb,
  	"status" "enum_notification_logs_status" DEFAULT 'queued' NOT NULL,
  	"attempts" numeric DEFAULT 0,
  	"last_error" varchar,
  	"sent_at" timestamp(3) with time zone,
  	"next_attempt_at" timestamp(3) with time zone,
  	"last_attempt_at" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "pages" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"page_id" varchar NOT NULL,
  	"slug" varchar NOT NULL,
  	"title" varchar NOT NULL,
  	"status" "enum_pages_status" DEFAULT 'draft' NOT NULL,
  	"blocks_json" jsonb,
  	"seo_title" varchar,
  	"seo_description" varchar,
  	"og_image" varchar,
  	"published_at" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payment_transactions" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"transaction_id" varchar NOT NULL,
  	"booking_id" numeric NOT NULL,
  	"customer_id" numeric NOT NULL,
  	"version" numeric DEFAULT 1,
  	"provider" "enum_payment_transactions_provider" NOT NULL,
  	"status" "enum_payment_transactions_status" DEFAULT 'initiated' NOT NULL,
  	"session" jsonb,
  	"attempts" jsonb,
  	"webhook_ledger" jsonb,
  	"audit_trail" jsonb,
  	"gateway_reference" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "posts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"post_id" varchar NOT NULL,
  	"slug" varchar NOT NULL,
  	"title" varchar NOT NULL,
  	"excerpt" varchar,
  	"body_html" varchar,
  	"category" varchar,
  	"author_name" varchar,
  	"read_time_minutes" numeric DEFAULT 3,
  	"status" "enum_posts_status" DEFAULT 'draft' NOT NULL,
  	"published_at" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "redirects" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"redirect_id" varchar NOT NULL,
  	"old_slug" varchar NOT NULL,
  	"new_slug" varchar NOT NULL,
  	"status_code" "enum_redirects_status_code" DEFAULT '301' NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "reviews" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"review_id" varchar NOT NULL,
  	"experience_id" integer NOT NULL,
  	"customer_id" integer NOT NULL,
  	"booking_id" integer NOT NULL,
  	"rating" numeric NOT NULL,
  	"comment" varchar NOT NULL,
  	"status" "enum_reviews_status" DEFAULT 'pending_approval' NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "coupons" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"coupon_id" varchar NOT NULL,
  	"code" varchar NOT NULL,
  	"discount_type" "enum_coupons_discount_type" DEFAULT 'percentage' NOT NULL,
  	"discount_value" numeric NOT NULL,
  	"max_discount_e_g_p" numeric,
  	"min_spend_e_g_p" numeric DEFAULT 0,
  	"usage_limit" numeric DEFAULT 100,
  	"usage_count" numeric DEFAULT 0,
  	"status" "enum_coupons_status" DEFAULT 'active' NOT NULL,
  	"valid_from" timestamp(3) with time zone,
  	"valid_until" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "contact_requests" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"email" varchar NOT NULL,
  	"subject" varchar NOT NULL,
  	"message" varchar NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "languages" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"native_name" varchar NOT NULL,
  	"code" varchar NOT NULL,
  	"is_r_t_l" boolean DEFAULT false,
  	"is_active" boolean DEFAULT true,
  	"is_default" boolean DEFAULT false,
  	"display_order" numeric DEFAULT 0,
  	"preferred_display_currency_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "departure_slots" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"departure_id" varchar NOT NULL,
  	"experience_id" integer NOT NULL,
  	"date" timestamp(3) with time zone NOT NULL,
  	"start_time" varchar DEFAULT '09:00',
  	"price_override_e_g_p" numeric,
  	"capacity_total" numeric DEFAULT 20 NOT NULL,
  	"capacity_reserved" numeric DEFAULT 0 NOT NULL,
  	"capacity_sold" numeric DEFAULT 0 NOT NULL,
  	"capacity_available" numeric DEFAULT 20 NOT NULL,
  	"version" numeric DEFAULT 1 NOT NULL,
  	"status" "enum_departure_slots_status" DEFAULT 'available' NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "event_outbox" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"event_id" varchar NOT NULL,
  	"correlation_id" varchar NOT NULL,
  	"causation_id" varchar,
  	"event_type" varchar NOT NULL,
  	"event_version" numeric DEFAULT 1 NOT NULL,
  	"aggregate_type" varchar NOT NULL,
  	"aggregate_id" varchar NOT NULL,
  	"payload" jsonb NOT NULL,
  	"status" "enum_event_outbox_status" DEFAULT 'pending' NOT NULL,
  	"retry_count" numeric DEFAULT 0 NOT NULL,
  	"next_retry_at" timestamp(3) with time zone,
  	"error_message" varchar,
  	"published_at" timestamp(3) with time zone,
  	"occurred_at" timestamp(3) with time zone NOT NULL,
  	"worker_id" varchar,
  	"lock_expires_at" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "event_inbox" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"idempotency_key" varchar NOT NULL,
  	"processed_event_id" varchar NOT NULL,
  	"subscriber_name" varchar NOT NULL,
  	"processed_at" timestamp(3) with time zone NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "maintenance_leases" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"job_name" varchar NOT NULL,
  	"worker_id" varchar NOT NULL,
  	"lease_expires_at" timestamp(3) with time zone NOT NULL,
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
  	"customers_id" integer,
  	"media_id" integer,
  	"countries_id" integer,
  	"cities_id" integer,
  	"accommodations_id" integer,
  	"experiences_id" integer,
  	"bookings_id" integer,
  	"point_ledger_id" integer,
  	"exchange_rates_id" integer,
  	"currencies_id" integer,
  	"translation_cache_id" integer,
  	"admin_audit_logs_id" integer,
  	"customer_notification_preferences_id" integer,
  	"customer_travelers_id" integer,
  	"dashboard_projections_id" integer,
  	"faqs_id" integer,
  	"maintenance_logs_id" integer,
  	"media_gallery_id" integer,
  	"notification_logs_id" integer,
  	"pages_id" integer,
  	"payment_transactions_id" integer,
  	"posts_id" integer,
  	"redirects_id" integer,
  	"reviews_id" integer,
  	"coupons_id" integer,
  	"contact_requests_id" integer,
  	"languages_id" integer,
  	"departure_slots_id" integer,
  	"event_outbox_id" integer,
  	"event_inbox_id" integer,
  	"maintenance_leases_id" integer
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
  	"users_id" integer,
  	"customers_id" integer
  );
  
  CREATE TABLE "payload_migrations" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"batch" numeric,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "system_settings_booking_notification_emails" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"email" varchar NOT NULL
  );
  
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
  	"email_sender_settings_reservation_identity_from_name" varchar NOT NULL,
  	"email_sender_settings_reservation_identity_from_email" varchar NOT NULL,
  	"email_sender_settings_reservation_identity_reply_to" varchar NOT NULL,
  	"email_sender_settings_loyalty_identity_from_name" varchar NOT NULL,
  	"email_sender_settings_loyalty_identity_from_email" varchar NOT NULL,
  	"email_sender_settings_loyalty_identity_reply_to" varchar NOT NULL,
  	"email_sender_settings_security_identity_from_name" varchar,
  	"email_sender_settings_security_identity_from_email" varchar,
  	"email_sender_settings_security_identity_reply_to" varchar,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "loyalty_settings_tiers" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"tier" varchar NOT NULL,
  	"label" varchar NOT NULL,
  	"min_spent_e_g_p" numeric NOT NULL,
  	"earn_multiplier" numeric NOT NULL,
  	"upgrade_bonus" numeric NOT NULL
  );
  
  CREATE TABLE "loyalty_settings" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"version" numeric DEFAULT 1 NOT NULL,
  	"program_code" varchar DEFAULT 'LAUBE_LOYALTY' NOT NULL,
  	"name" varchar DEFAULT 'L''Aube Voyage Loyalty Program' NOT NULL,
  	"base_earn_rate" numeric DEFAULT 1 NOT NULL,
  	"redemption_points_unit" numeric DEFAULT 100 NOT NULL,
  	"redemption_value_e_g_p" numeric DEFAULT 10 NOT NULL,
  	"min_redemption_points" numeric DEFAULT 50 NOT NULL,
  	"redemption_step_unit" numeric DEFAULT 50,
  	"max_redemption_percent" numeric DEFAULT 80 NOT NULL,
  	"max_redemption_fixed_e_g_p" numeric DEFAULT 5000,
  	"allow_partial_redemption" boolean DEFAULT true,
  	"welcome_bonus" numeric DEFAULT 100 NOT NULL,
  	"expiration_months" numeric DEFAULT 12 NOT NULL,
  	"bonus_never_expires" boolean DEFAULT true,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  ALTER TABLE "users_sessions" ADD CONSTRAINT "users_sessions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "customers_sessions" ADD CONSTRAINT "customers_sessions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "countries_gallery" ADD CONSTRAINT "countries_gallery_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "countries_gallery" ADD CONSTRAINT "countries_gallery_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."countries"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "countries" ADD CONSTRAINT "countries_hero_id_media_id_fk" FOREIGN KEY ("hero_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "countries" ADD CONSTRAINT "countries_currency_id_currencies_id_fk" FOREIGN KEY ("currency_id") REFERENCES "public"."currencies"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "countries" ADD CONSTRAINT "countries_default_language_id_languages_id_fk" FOREIGN KEY ("default_language_id") REFERENCES "public"."languages"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cities_gallery" ADD CONSTRAINT "cities_gallery_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cities_gallery" ADD CONSTRAINT "cities_gallery_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."cities"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cities" ADD CONSTRAINT "cities_country_id_countries_id_fk" FOREIGN KEY ("country_id") REFERENCES "public"."countries"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cities" ADD CONSTRAINT "cities_hero_id_media_id_fk" FOREIGN KEY ("hero_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "accommodations_gallery" ADD CONSTRAINT "accommodations_gallery_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "accommodations_gallery" ADD CONSTRAINT "accommodations_gallery_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."accommodations"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "accommodations" ADD CONSTRAINT "accommodations_city_id_cities_id_fk" FOREIGN KEY ("city_id") REFERENCES "public"."cities"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "accommodations" ADD CONSTRAINT "accommodations_hero_image_id_media_id_fk" FOREIGN KEY ("hero_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "experiences_gallery" ADD CONSTRAINT "experiences_gallery_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "experiences_gallery" ADD CONSTRAINT "experiences_gallery_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."experiences"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "experiences_included" ADD CONSTRAINT "experiences_included_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."experiences"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "experiences_excluded" ADD CONSTRAINT "experiences_excluded_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."experiences"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "experiences_itinerary" ADD CONSTRAINT "experiences_itinerary_city_id_cities_id_fk" FOREIGN KEY ("city_id") REFERENCES "public"."cities"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "experiences_itinerary" ADD CONSTRAINT "experiences_itinerary_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."experiences"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "experiences_accommodations_options_room_rates" ADD CONSTRAINT "experiences_accommodations_options_room_rates_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."experiences_accommodations_options"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "experiences_accommodations_options" ADD CONSTRAINT "experiences_accommodations_options_property_id_accommodations_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."accommodations"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "experiences_accommodations_options" ADD CONSTRAINT "experiences_accommodations_options_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."experiences_accommodations"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "experiences_accommodations" ADD CONSTRAINT "experiences_accommodations_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."experiences"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "experiences_schedules" ADD CONSTRAINT "experiences_schedules_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."experiences"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "experiences_blackouts" ADD CONSTRAINT "experiences_blackouts_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."experiences"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "experiences_price_overrides" ADD CONSTRAINT "experiences_price_overrides_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."experiences"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "experiences" ADD CONSTRAINT "experiences_city_id_cities_id_fk" FOREIGN KEY ("city_id") REFERENCES "public"."cities"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "experiences" ADD CONSTRAINT "experiences_hero_id_media_id_fk" FOREIGN KEY ("hero_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "experiences_rels" ADD CONSTRAINT "experiences_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."experiences"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "experiences_rels" ADD CONSTRAINT "experiences_rels_cities_fk" FOREIGN KEY ("cities_id") REFERENCES "public"."cities"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "bookings_travelers" ADD CONSTRAINT "bookings_travelers_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "bookings" ADD CONSTRAINT "bookings_user_id_customers_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "bookings" ADD CONSTRAINT "bookings_experience_id_experiences_id_fk" FOREIGN KEY ("experience_id") REFERENCES "public"."experiences"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "bookings" ADD CONSTRAINT "bookings_departure_slot_id_departure_slots_id_fk" FOREIGN KEY ("departure_slot_id") REFERENCES "public"."departure_slots"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "point_ledger" ADD CONSTRAINT "point_ledger_user_id_customers_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "point_ledger" ADD CONSTRAINT "point_ledger_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "admin_audit_logs" ADD CONSTRAINT "admin_audit_logs_admin_user_id_users_id_fk" FOREIGN KEY ("admin_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "customer_notification_preferences" ADD CONSTRAINT "customer_notification_preferences_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "customer_travelers" ADD CONSTRAINT "customer_travelers_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "dashboard_projections" ADD CONSTRAINT "dashboard_projections_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "notification_logs" ADD CONSTRAINT "notification_logs_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "reviews" ADD CONSTRAINT "reviews_experience_id_experiences_id_fk" FOREIGN KEY ("experience_id") REFERENCES "public"."experiences"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "reviews" ADD CONSTRAINT "reviews_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "reviews" ADD CONSTRAINT "reviews_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "languages" ADD CONSTRAINT "languages_preferred_display_currency_id_currencies_id_fk" FOREIGN KEY ("preferred_display_currency_id") REFERENCES "public"."currencies"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "departure_slots" ADD CONSTRAINT "departure_slots_experience_id_experiences_id_fk" FOREIGN KEY ("experience_id") REFERENCES "public"."experiences"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_locked_documents"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_customers_fk" FOREIGN KEY ("customers_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_countries_fk" FOREIGN KEY ("countries_id") REFERENCES "public"."countries"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_cities_fk" FOREIGN KEY ("cities_id") REFERENCES "public"."cities"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_accommodations_fk" FOREIGN KEY ("accommodations_id") REFERENCES "public"."accommodations"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_experiences_fk" FOREIGN KEY ("experiences_id") REFERENCES "public"."experiences"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_bookings_fk" FOREIGN KEY ("bookings_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_point_ledger_fk" FOREIGN KEY ("point_ledger_id") REFERENCES "public"."point_ledger"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_exchange_rates_fk" FOREIGN KEY ("exchange_rates_id") REFERENCES "public"."exchange_rates"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_currencies_fk" FOREIGN KEY ("currencies_id") REFERENCES "public"."currencies"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_translation_cache_fk" FOREIGN KEY ("translation_cache_id") REFERENCES "public"."translation_cache"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_admin_audit_logs_fk" FOREIGN KEY ("admin_audit_logs_id") REFERENCES "public"."admin_audit_logs"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_customer_notification_prefe_fk" FOREIGN KEY ("customer_notification_preferences_id") REFERENCES "public"."customer_notification_preferences"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_customer_travelers_fk" FOREIGN KEY ("customer_travelers_id") REFERENCES "public"."customer_travelers"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_dashboard_projections_fk" FOREIGN KEY ("dashboard_projections_id") REFERENCES "public"."dashboard_projections"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_faqs_fk" FOREIGN KEY ("faqs_id") REFERENCES "public"."faqs"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_maintenance_logs_fk" FOREIGN KEY ("maintenance_logs_id") REFERENCES "public"."maintenance_logs"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_media_gallery_fk" FOREIGN KEY ("media_gallery_id") REFERENCES "public"."media_gallery"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_notification_logs_fk" FOREIGN KEY ("notification_logs_id") REFERENCES "public"."notification_logs"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_pages_fk" FOREIGN KEY ("pages_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_payment_transactions_fk" FOREIGN KEY ("payment_transactions_id") REFERENCES "public"."payment_transactions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_posts_fk" FOREIGN KEY ("posts_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_redirects_fk" FOREIGN KEY ("redirects_id") REFERENCES "public"."redirects"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_reviews_fk" FOREIGN KEY ("reviews_id") REFERENCES "public"."reviews"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_coupons_fk" FOREIGN KEY ("coupons_id") REFERENCES "public"."coupons"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_contact_requests_fk" FOREIGN KEY ("contact_requests_id") REFERENCES "public"."contact_requests"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_languages_fk" FOREIGN KEY ("languages_id") REFERENCES "public"."languages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_departure_slots_fk" FOREIGN KEY ("departure_slots_id") REFERENCES "public"."departure_slots"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_event_outbox_fk" FOREIGN KEY ("event_outbox_id") REFERENCES "public"."event_outbox"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_event_inbox_fk" FOREIGN KEY ("event_inbox_id") REFERENCES "public"."event_inbox"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_maintenance_leases_fk" FOREIGN KEY ("maintenance_leases_id") REFERENCES "public"."maintenance_leases"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_preferences"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_customers_fk" FOREIGN KEY ("customers_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "system_settings_booking_notification_emails" ADD CONSTRAINT "system_settings_booking_notification_emails_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."system_settings"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "system_settings" ADD CONSTRAINT "system_settings_base_currency_id_currencies_id_fk" FOREIGN KEY ("base_currency_id") REFERENCES "public"."currencies"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "system_settings" ADD CONSTRAINT "system_settings_default_display_currency_id_currencies_id_fk" FOREIGN KEY ("default_display_currency_id") REFERENCES "public"."currencies"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "loyalty_settings_tiers" ADD CONSTRAINT "loyalty_settings_tiers_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."loyalty_settings"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "users_sessions_order_idx" ON "users_sessions" USING btree ("_order");
  CREATE INDEX "users_sessions_parent_id_idx" ON "users_sessions" USING btree ("_parent_id");
  CREATE INDEX "users_updated_at_idx" ON "users" USING btree ("updated_at");
  CREATE INDEX "users_created_at_idx" ON "users" USING btree ("created_at");
  CREATE UNIQUE INDEX "users_email_idx" ON "users" USING btree ("email");
  CREATE INDEX "customers_sessions_order_idx" ON "customers_sessions" USING btree ("_order");
  CREATE INDEX "customers_sessions_parent_id_idx" ON "customers_sessions" USING btree ("_parent_id");
  CREATE INDEX "customers_updated_at_idx" ON "customers" USING btree ("updated_at");
  CREATE INDEX "customers_created_at_idx" ON "customers" USING btree ("created_at");
  CREATE UNIQUE INDEX "customers_email_idx" ON "customers" USING btree ("email");
  CREATE INDEX "media_updated_at_idx" ON "media" USING btree ("updated_at");
  CREATE INDEX "media_created_at_idx" ON "media" USING btree ("created_at");
  CREATE UNIQUE INDEX "media_filename_idx" ON "media" USING btree ("filename");
  CREATE INDEX "countries_gallery_order_idx" ON "countries_gallery" USING btree ("_order");
  CREATE INDEX "countries_gallery_parent_id_idx" ON "countries_gallery" USING btree ("_parent_id");
  CREATE INDEX "countries_gallery_image_idx" ON "countries_gallery" USING btree ("image_id");
  CREATE UNIQUE INDEX "countries_slug_idx" ON "countries" USING btree ("slug");
  CREATE UNIQUE INDEX "countries_code_idx" ON "countries" USING btree ("code");
  CREATE INDEX "countries_hero_idx" ON "countries" USING btree ("hero_id");
  CREATE INDEX "countries_currency_idx" ON "countries" USING btree ("currency_id");
  CREATE INDEX "countries_default_language_idx" ON "countries" USING btree ("default_language_id");
  CREATE INDEX "countries_updated_at_idx" ON "countries" USING btree ("updated_at");
  CREATE INDEX "countries_created_at_idx" ON "countries" USING btree ("created_at");
  CREATE INDEX "cities_gallery_order_idx" ON "cities_gallery" USING btree ("_order");
  CREATE INDEX "cities_gallery_parent_id_idx" ON "cities_gallery" USING btree ("_parent_id");
  CREATE INDEX "cities_gallery_image_idx" ON "cities_gallery" USING btree ("image_id");
  CREATE UNIQUE INDEX "cities_slug_idx" ON "cities" USING btree ("slug");
  CREATE INDEX "cities_country_idx" ON "cities" USING btree ("country_id");
  CREATE INDEX "cities_hero_idx" ON "cities" USING btree ("hero_id");
  CREATE INDEX "cities_updated_at_idx" ON "cities" USING btree ("updated_at");
  CREATE INDEX "cities_created_at_idx" ON "cities" USING btree ("created_at");
  CREATE INDEX "accommodations_gallery_order_idx" ON "accommodations_gallery" USING btree ("_order");
  CREATE INDEX "accommodations_gallery_parent_id_idx" ON "accommodations_gallery" USING btree ("_parent_id");
  CREATE INDEX "accommodations_gallery_image_idx" ON "accommodations_gallery" USING btree ("image_id");
  CREATE INDEX "accommodations_name_idx" ON "accommodations" USING btree ("name");
  CREATE UNIQUE INDEX "accommodations_slug_idx" ON "accommodations" USING btree ("slug");
  CREATE INDEX "accommodations_city_idx" ON "accommodations" USING btree ("city_id");
  CREATE INDEX "accommodations_hero_image_idx" ON "accommodations" USING btree ("hero_image_id");
  CREATE INDEX "accommodations_updated_at_idx" ON "accommodations" USING btree ("updated_at");
  CREATE INDEX "accommodations_created_at_idx" ON "accommodations" USING btree ("created_at");
  CREATE INDEX "experiences_gallery_order_idx" ON "experiences_gallery" USING btree ("_order");
  CREATE INDEX "experiences_gallery_parent_id_idx" ON "experiences_gallery" USING btree ("_parent_id");
  CREATE INDEX "experiences_gallery_image_idx" ON "experiences_gallery" USING btree ("image_id");
  CREATE INDEX "experiences_included_order_idx" ON "experiences_included" USING btree ("_order");
  CREATE INDEX "experiences_included_parent_id_idx" ON "experiences_included" USING btree ("_parent_id");
  CREATE INDEX "experiences_excluded_order_idx" ON "experiences_excluded" USING btree ("_order");
  CREATE INDEX "experiences_excluded_parent_id_idx" ON "experiences_excluded" USING btree ("_parent_id");
  CREATE INDEX "experiences_itinerary_order_idx" ON "experiences_itinerary" USING btree ("_order");
  CREATE INDEX "experiences_itinerary_parent_id_idx" ON "experiences_itinerary" USING btree ("_parent_id");
  CREATE INDEX "experiences_itinerary_city_idx" ON "experiences_itinerary" USING btree ("city_id");
  CREATE INDEX "experiences_accommodations_options_room_rates_order_idx" ON "experiences_accommodations_options_room_rates" USING btree ("_order");
  CREATE INDEX "experiences_accommodations_options_room_rates_parent_id_idx" ON "experiences_accommodations_options_room_rates" USING btree ("_parent_id");
  CREATE INDEX "experiences_accommodations_options_order_idx" ON "experiences_accommodations_options" USING btree ("_order");
  CREATE INDEX "experiences_accommodations_options_parent_id_idx" ON "experiences_accommodations_options" USING btree ("_parent_id");
  CREATE INDEX "experiences_accommodations_options_property_idx" ON "experiences_accommodations_options" USING btree ("property_id");
  CREATE INDEX "experiences_accommodations_order_idx" ON "experiences_accommodations" USING btree ("_order");
  CREATE INDEX "experiences_accommodations_parent_id_idx" ON "experiences_accommodations" USING btree ("_parent_id");
  CREATE INDEX "experiences_schedules_order_idx" ON "experiences_schedules" USING btree ("_order");
  CREATE INDEX "experiences_schedules_parent_id_idx" ON "experiences_schedules" USING btree ("_parent_id");
  CREATE INDEX "experiences_blackouts_order_idx" ON "experiences_blackouts" USING btree ("_order");
  CREATE INDEX "experiences_blackouts_parent_id_idx" ON "experiences_blackouts" USING btree ("_parent_id");
  CREATE INDEX "experiences_price_overrides_order_idx" ON "experiences_price_overrides" USING btree ("_order");
  CREATE INDEX "experiences_price_overrides_parent_id_idx" ON "experiences_price_overrides" USING btree ("_parent_id");
  CREATE INDEX "experiences_title_idx" ON "experiences" USING btree ("title");
  CREATE UNIQUE INDEX "experiences_slug_idx" ON "experiences" USING btree ("slug");
  CREATE INDEX "experiences_type_idx" ON "experiences" USING btree ("type");
  CREATE INDEX "experiences_city_idx" ON "experiences" USING btree ("city_id");
  CREATE INDEX "experiences_hero_idx" ON "experiences" USING btree ("hero_id");
  CREATE INDEX "experiences_price_idx" ON "experiences" USING btree ("price");
  CREATE INDEX "experiences_availability_idx" ON "experiences" USING btree ("availability");
  CREATE INDEX "experiences_updated_at_idx" ON "experiences" USING btree ("updated_at");
  CREATE INDEX "experiences_created_at_idx" ON "experiences" USING btree ("created_at");
  CREATE INDEX "city_updatedAt_idx" ON "experiences" USING btree ("city_id","updated_at");
  CREATE INDEX "experiences_rels_order_idx" ON "experiences_rels" USING btree ("order");
  CREATE INDEX "experiences_rels_parent_idx" ON "experiences_rels" USING btree ("parent_id");
  CREATE INDEX "experiences_rels_path_idx" ON "experiences_rels" USING btree ("path");
  CREATE INDEX "experiences_rels_cities_id_idx" ON "experiences_rels" USING btree ("cities_id");
  CREATE INDEX "bookings_travelers_order_idx" ON "bookings_travelers" USING btree ("_order");
  CREATE INDEX "bookings_travelers_parent_id_idx" ON "bookings_travelers" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "bookings_booking_number_idx" ON "bookings" USING btree ("booking_number");
  CREATE UNIQUE INDEX "bookings_idempotency_key_idx" ON "bookings" USING btree ("idempotency_key");
  CREATE INDEX "bookings_user_idx" ON "bookings" USING btree ("user_id");
  CREATE INDEX "bookings_experience_idx" ON "bookings" USING btree ("experience_id");
  CREATE INDEX "bookings_departure_slot_idx" ON "bookings" USING btree ("departure_slot_id");
  CREATE INDEX "bookings_status_idx" ON "bookings" USING btree ("status");
  CREATE INDEX "bookings_start_date_idx" ON "bookings" USING btree ("start_date");
  CREATE INDEX "bookings_end_date_idx" ON "bookings" USING btree ("end_date");
  CREATE INDEX "bookings_completion_at_idx" ON "bookings" USING btree ("completion_at");
  CREATE INDEX "bookings_payment_window_expires_at_idx" ON "bookings" USING btree ("payment_window_expires_at");
  CREATE INDEX "bookings_updated_at_idx" ON "bookings" USING btree ("updated_at");
  CREATE INDEX "bookings_created_at_idx" ON "bookings" USING btree ("created_at");
  CREATE INDEX "point_ledger_user_idx" ON "point_ledger" USING btree ("user_id");
  CREATE INDEX "point_ledger_reference_type_idx" ON "point_ledger" USING btree ("reference_type");
  CREATE INDEX "point_ledger_reference_id_idx" ON "point_ledger" USING btree ("reference_id");
  CREATE INDEX "point_ledger_booking_idx" ON "point_ledger" USING btree ("booking_id");
  CREATE INDEX "point_ledger_updated_at_idx" ON "point_ledger" USING btree ("updated_at");
  CREATE INDEX "point_ledger_created_at_idx" ON "point_ledger" USING btree ("created_at");
  CREATE INDEX "exchange_rates_from_currency_idx" ON "exchange_rates" USING btree ("from_currency");
  CREATE INDEX "exchange_rates_to_currency_idx" ON "exchange_rates" USING btree ("to_currency");
  CREATE INDEX "exchange_rates_updated_at_idx" ON "exchange_rates" USING btree ("updated_at");
  CREATE INDEX "exchange_rates_created_at_idx" ON "exchange_rates" USING btree ("created_at");
  CREATE UNIQUE INDEX "currencies_iso_code_idx" ON "currencies" USING btree ("iso_code");
  CREATE INDEX "currencies_is_active_idx" ON "currencies" USING btree ("is_active");
  CREATE INDEX "currencies_updated_at_idx" ON "currencies" USING btree ("updated_at");
  CREATE INDEX "currencies_created_at_idx" ON "currencies" USING btree ("created_at");
  CREATE INDEX "translation_cache_original_hash_idx" ON "translation_cache" USING btree ("original_hash");
  CREATE INDEX "translation_cache_language_idx" ON "translation_cache" USING btree ("language");
  CREATE INDEX "translation_cache_updated_at_idx" ON "translation_cache" USING btree ("updated_at");
  CREATE INDEX "translation_cache_created_at_idx" ON "translation_cache" USING btree ("created_at");
  CREATE UNIQUE INDEX "originalHash_language_idx" ON "translation_cache" USING btree ("original_hash","language");
  CREATE UNIQUE INDEX "admin_audit_logs_audit_id_idx" ON "admin_audit_logs" USING btree ("audit_id");
  CREATE INDEX "admin_audit_logs_admin_user_idx" ON "admin_audit_logs" USING btree ("admin_user_id");
  CREATE INDEX "admin_audit_logs_action_idx" ON "admin_audit_logs" USING btree ("action");
  CREATE INDEX "admin_audit_logs_target_id_idx" ON "admin_audit_logs" USING btree ("target_id");
  CREATE INDEX "admin_audit_logs_updated_at_idx" ON "admin_audit_logs" USING btree ("updated_at");
  CREATE INDEX "admin_audit_logs_created_at_idx" ON "admin_audit_logs" USING btree ("created_at");
  CREATE UNIQUE INDEX "customer_notification_preferences_customer_idx" ON "customer_notification_preferences" USING btree ("customer_id");
  CREATE INDEX "customer_notification_preferences_updated_at_idx" ON "customer_notification_preferences" USING btree ("updated_at");
  CREATE INDEX "customer_notification_preferences_created_at_idx" ON "customer_notification_preferences" USING btree ("created_at");
  CREATE INDEX "customer_travelers_customer_idx" ON "customer_travelers" USING btree ("customer_id");
  CREATE INDEX "customer_travelers_updated_at_idx" ON "customer_travelers" USING btree ("updated_at");
  CREATE INDEX "customer_travelers_created_at_idx" ON "customer_travelers" USING btree ("created_at");
  CREATE UNIQUE INDEX "dashboard_projections_projection_id_idx" ON "dashboard_projections" USING btree ("projection_id");
  CREATE UNIQUE INDEX "dashboard_projections_customer_idx" ON "dashboard_projections" USING btree ("customer_id");
  CREATE INDEX "dashboard_projections_updated_at_idx" ON "dashboard_projections" USING btree ("updated_at");
  CREATE INDEX "dashboard_projections_created_at_idx" ON "dashboard_projections" USING btree ("created_at");
  CREATE UNIQUE INDEX "faqs_faq_id_idx" ON "faqs" USING btree ("faq_id");
  CREATE INDEX "faqs_updated_at_idx" ON "faqs" USING btree ("updated_at");
  CREATE INDEX "faqs_created_at_idx" ON "faqs" USING btree ("created_at");
  CREATE UNIQUE INDEX "maintenance_logs_execution_id_idx" ON "maintenance_logs" USING btree ("execution_id");
  CREATE INDEX "maintenance_logs_correlation_id_idx" ON "maintenance_logs" USING btree ("correlation_id");
  CREATE INDEX "maintenance_logs_job_name_idx" ON "maintenance_logs" USING btree ("job_name");
  CREATE INDEX "maintenance_logs_updated_at_idx" ON "maintenance_logs" USING btree ("updated_at");
  CREATE INDEX "maintenance_logs_created_at_idx" ON "maintenance_logs" USING btree ("created_at");
  CREATE UNIQUE INDEX "media_gallery_media_id_idx" ON "media_gallery" USING btree ("media_id");
  CREATE INDEX "media_gallery_updated_at_idx" ON "media_gallery" USING btree ("updated_at");
  CREATE INDEX "media_gallery_created_at_idx" ON "media_gallery" USING btree ("created_at");
  CREATE UNIQUE INDEX "notification_logs_notification_id_idx" ON "notification_logs" USING btree ("notification_id");
  CREATE INDEX "notification_logs_reference_type_idx" ON "notification_logs" USING btree ("reference_type");
  CREATE INDEX "notification_logs_reference_id_idx" ON "notification_logs" USING btree ("reference_id");
  CREATE INDEX "notification_logs_customer_idx" ON "notification_logs" USING btree ("customer_id");
  CREATE INDEX "notification_logs_recipient_idx" ON "notification_logs" USING btree ("recipient");
  CREATE INDEX "notification_logs_updated_at_idx" ON "notification_logs" USING btree ("updated_at");
  CREATE INDEX "notification_logs_created_at_idx" ON "notification_logs" USING btree ("created_at");
  CREATE UNIQUE INDEX "pages_page_id_idx" ON "pages" USING btree ("page_id");
  CREATE UNIQUE INDEX "pages_slug_idx" ON "pages" USING btree ("slug");
  CREATE INDEX "pages_updated_at_idx" ON "pages" USING btree ("updated_at");
  CREATE INDEX "pages_created_at_idx" ON "pages" USING btree ("created_at");
  CREATE UNIQUE INDEX "payment_transactions_transaction_id_idx" ON "payment_transactions" USING btree ("transaction_id");
  CREATE INDEX "payment_transactions_booking_id_idx" ON "payment_transactions" USING btree ("booking_id");
  CREATE INDEX "payment_transactions_customer_id_idx" ON "payment_transactions" USING btree ("customer_id");
  CREATE INDEX "payment_transactions_updated_at_idx" ON "payment_transactions" USING btree ("updated_at");
  CREATE INDEX "payment_transactions_created_at_idx" ON "payment_transactions" USING btree ("created_at");
  CREATE UNIQUE INDEX "posts_post_id_idx" ON "posts" USING btree ("post_id");
  CREATE UNIQUE INDEX "posts_slug_idx" ON "posts" USING btree ("slug");
  CREATE INDEX "posts_category_idx" ON "posts" USING btree ("category");
  CREATE INDEX "posts_updated_at_idx" ON "posts" USING btree ("updated_at");
  CREATE INDEX "posts_created_at_idx" ON "posts" USING btree ("created_at");
  CREATE UNIQUE INDEX "redirects_redirect_id_idx" ON "redirects" USING btree ("redirect_id");
  CREATE INDEX "redirects_old_slug_idx" ON "redirects" USING btree ("old_slug");
  CREATE INDEX "redirects_updated_at_idx" ON "redirects" USING btree ("updated_at");
  CREATE INDEX "redirects_created_at_idx" ON "redirects" USING btree ("created_at");
  CREATE UNIQUE INDEX "reviews_review_id_idx" ON "reviews" USING btree ("review_id");
  CREATE INDEX "reviews_experience_idx" ON "reviews" USING btree ("experience_id");
  CREATE INDEX "reviews_customer_idx" ON "reviews" USING btree ("customer_id");
  CREATE UNIQUE INDEX "reviews_booking_idx" ON "reviews" USING btree ("booking_id");
  CREATE INDEX "reviews_updated_at_idx" ON "reviews" USING btree ("updated_at");
  CREATE INDEX "reviews_created_at_idx" ON "reviews" USING btree ("created_at");
  CREATE UNIQUE INDEX "coupons_coupon_id_idx" ON "coupons" USING btree ("coupon_id");
  CREATE UNIQUE INDEX "coupons_code_idx" ON "coupons" USING btree ("code");
  CREATE INDEX "coupons_updated_at_idx" ON "coupons" USING btree ("updated_at");
  CREATE INDEX "coupons_created_at_idx" ON "coupons" USING btree ("created_at");
  CREATE INDEX "contact_requests_updated_at_idx" ON "contact_requests" USING btree ("updated_at");
  CREATE INDEX "contact_requests_created_at_idx" ON "contact_requests" USING btree ("created_at");
  CREATE UNIQUE INDEX "languages_code_idx" ON "languages" USING btree ("code");
  CREATE INDEX "languages_is_active_idx" ON "languages" USING btree ("is_active");
  CREATE INDEX "languages_preferred_display_currency_idx" ON "languages" USING btree ("preferred_display_currency_id");
  CREATE INDEX "languages_updated_at_idx" ON "languages" USING btree ("updated_at");
  CREATE INDEX "languages_created_at_idx" ON "languages" USING btree ("created_at");
  CREATE UNIQUE INDEX "departure_slots_departure_id_idx" ON "departure_slots" USING btree ("departure_id");
  CREATE INDEX "departure_slots_experience_idx" ON "departure_slots" USING btree ("experience_id");
  CREATE INDEX "departure_slots_updated_at_idx" ON "departure_slots" USING btree ("updated_at");
  CREATE INDEX "departure_slots_created_at_idx" ON "departure_slots" USING btree ("created_at");
  CREATE UNIQUE INDEX "event_outbox_event_id_idx" ON "event_outbox" USING btree ("event_id");
  CREATE INDEX "event_outbox_correlation_id_idx" ON "event_outbox" USING btree ("correlation_id");
  CREATE INDEX "event_outbox_causation_id_idx" ON "event_outbox" USING btree ("causation_id");
  CREATE INDEX "event_outbox_event_type_idx" ON "event_outbox" USING btree ("event_type");
  CREATE INDEX "event_outbox_aggregate_type_idx" ON "event_outbox" USING btree ("aggregate_type");
  CREATE INDEX "event_outbox_aggregate_id_idx" ON "event_outbox" USING btree ("aggregate_id");
  CREATE INDEX "event_outbox_status_idx" ON "event_outbox" USING btree ("status");
  CREATE INDEX "event_outbox_worker_id_idx" ON "event_outbox" USING btree ("worker_id");
  CREATE INDEX "event_outbox_lock_expires_at_idx" ON "event_outbox" USING btree ("lock_expires_at");
  CREATE INDEX "event_outbox_updated_at_idx" ON "event_outbox" USING btree ("updated_at");
  CREATE INDEX "event_outbox_created_at_idx" ON "event_outbox" USING btree ("created_at");
  CREATE UNIQUE INDEX "event_inbox_idempotency_key_idx" ON "event_inbox" USING btree ("idempotency_key");
  CREATE INDEX "event_inbox_processed_event_id_idx" ON "event_inbox" USING btree ("processed_event_id");
  CREATE INDEX "event_inbox_subscriber_name_idx" ON "event_inbox" USING btree ("subscriber_name");
  CREATE INDEX "event_inbox_updated_at_idx" ON "event_inbox" USING btree ("updated_at");
  CREATE INDEX "event_inbox_created_at_idx" ON "event_inbox" USING btree ("created_at");
  CREATE UNIQUE INDEX "maintenance_leases_job_name_idx" ON "maintenance_leases" USING btree ("job_name");
  CREATE INDEX "maintenance_leases_updated_at_idx" ON "maintenance_leases" USING btree ("updated_at");
  CREATE INDEX "maintenance_leases_created_at_idx" ON "maintenance_leases" USING btree ("created_at");
  CREATE UNIQUE INDEX "payload_kv_key_idx" ON "payload_kv" USING btree ("key");
  CREATE INDEX "payload_locked_documents_global_slug_idx" ON "payload_locked_documents" USING btree ("global_slug");
  CREATE INDEX "payload_locked_documents_updated_at_idx" ON "payload_locked_documents" USING btree ("updated_at");
  CREATE INDEX "payload_locked_documents_created_at_idx" ON "payload_locked_documents" USING btree ("created_at");
  CREATE INDEX "payload_locked_documents_rels_order_idx" ON "payload_locked_documents_rels" USING btree ("order");
  CREATE INDEX "payload_locked_documents_rels_parent_idx" ON "payload_locked_documents_rels" USING btree ("parent_id");
  CREATE INDEX "payload_locked_documents_rels_path_idx" ON "payload_locked_documents_rels" USING btree ("path");
  CREATE INDEX "payload_locked_documents_rels_users_id_idx" ON "payload_locked_documents_rels" USING btree ("users_id");
  CREATE INDEX "payload_locked_documents_rels_customers_id_idx" ON "payload_locked_documents_rels" USING btree ("customers_id");
  CREATE INDEX "payload_locked_documents_rels_media_id_idx" ON "payload_locked_documents_rels" USING btree ("media_id");
  CREATE INDEX "payload_locked_documents_rels_countries_id_idx" ON "payload_locked_documents_rels" USING btree ("countries_id");
  CREATE INDEX "payload_locked_documents_rels_cities_id_idx" ON "payload_locked_documents_rels" USING btree ("cities_id");
  CREATE INDEX "payload_locked_documents_rels_accommodations_id_idx" ON "payload_locked_documents_rels" USING btree ("accommodations_id");
  CREATE INDEX "payload_locked_documents_rels_experiences_id_idx" ON "payload_locked_documents_rels" USING btree ("experiences_id");
  CREATE INDEX "payload_locked_documents_rels_bookings_id_idx" ON "payload_locked_documents_rels" USING btree ("bookings_id");
  CREATE INDEX "payload_locked_documents_rels_point_ledger_id_idx" ON "payload_locked_documents_rels" USING btree ("point_ledger_id");
  CREATE INDEX "payload_locked_documents_rels_exchange_rates_id_idx" ON "payload_locked_documents_rels" USING btree ("exchange_rates_id");
  CREATE INDEX "payload_locked_documents_rels_currencies_id_idx" ON "payload_locked_documents_rels" USING btree ("currencies_id");
  CREATE INDEX "payload_locked_documents_rels_translation_cache_id_idx" ON "payload_locked_documents_rels" USING btree ("translation_cache_id");
  CREATE INDEX "payload_locked_documents_rels_admin_audit_logs_id_idx" ON "payload_locked_documents_rels" USING btree ("admin_audit_logs_id");
  CREATE INDEX "payload_locked_documents_rels_customer_notification_pref_idx" ON "payload_locked_documents_rels" USING btree ("customer_notification_preferences_id");
  CREATE INDEX "payload_locked_documents_rels_customer_travelers_id_idx" ON "payload_locked_documents_rels" USING btree ("customer_travelers_id");
  CREATE INDEX "payload_locked_documents_rels_dashboard_projections_id_idx" ON "payload_locked_documents_rels" USING btree ("dashboard_projections_id");
  CREATE INDEX "payload_locked_documents_rels_faqs_id_idx" ON "payload_locked_documents_rels" USING btree ("faqs_id");
  CREATE INDEX "payload_locked_documents_rels_maintenance_logs_id_idx" ON "payload_locked_documents_rels" USING btree ("maintenance_logs_id");
  CREATE INDEX "payload_locked_documents_rels_media_gallery_id_idx" ON "payload_locked_documents_rels" USING btree ("media_gallery_id");
  CREATE INDEX "payload_locked_documents_rels_notification_logs_id_idx" ON "payload_locked_documents_rels" USING btree ("notification_logs_id");
  CREATE INDEX "payload_locked_documents_rels_pages_id_idx" ON "payload_locked_documents_rels" USING btree ("pages_id");
  CREATE INDEX "payload_locked_documents_rels_payment_transactions_id_idx" ON "payload_locked_documents_rels" USING btree ("payment_transactions_id");
  CREATE INDEX "payload_locked_documents_rels_posts_id_idx" ON "payload_locked_documents_rels" USING btree ("posts_id");
  CREATE INDEX "payload_locked_documents_rels_redirects_id_idx" ON "payload_locked_documents_rels" USING btree ("redirects_id");
  CREATE INDEX "payload_locked_documents_rels_reviews_id_idx" ON "payload_locked_documents_rels" USING btree ("reviews_id");
  CREATE INDEX "payload_locked_documents_rels_coupons_id_idx" ON "payload_locked_documents_rels" USING btree ("coupons_id");
  CREATE INDEX "payload_locked_documents_rels_contact_requests_id_idx" ON "payload_locked_documents_rels" USING btree ("contact_requests_id");
  CREATE INDEX "payload_locked_documents_rels_languages_id_idx" ON "payload_locked_documents_rels" USING btree ("languages_id");
  CREATE INDEX "payload_locked_documents_rels_departure_slots_id_idx" ON "payload_locked_documents_rels" USING btree ("departure_slots_id");
  CREATE INDEX "payload_locked_documents_rels_event_outbox_id_idx" ON "payload_locked_documents_rels" USING btree ("event_outbox_id");
  CREATE INDEX "payload_locked_documents_rels_event_inbox_id_idx" ON "payload_locked_documents_rels" USING btree ("event_inbox_id");
  CREATE INDEX "payload_locked_documents_rels_maintenance_leases_id_idx" ON "payload_locked_documents_rels" USING btree ("maintenance_leases_id");
  CREATE INDEX "payload_preferences_key_idx" ON "payload_preferences" USING btree ("key");
  CREATE INDEX "payload_preferences_updated_at_idx" ON "payload_preferences" USING btree ("updated_at");
  CREATE INDEX "payload_preferences_created_at_idx" ON "payload_preferences" USING btree ("created_at");
  CREATE INDEX "payload_preferences_rels_order_idx" ON "payload_preferences_rels" USING btree ("order");
  CREATE INDEX "payload_preferences_rels_parent_idx" ON "payload_preferences_rels" USING btree ("parent_id");
  CREATE INDEX "payload_preferences_rels_path_idx" ON "payload_preferences_rels" USING btree ("path");
  CREATE INDEX "payload_preferences_rels_users_id_idx" ON "payload_preferences_rels" USING btree ("users_id");
  CREATE INDEX "payload_preferences_rels_customers_id_idx" ON "payload_preferences_rels" USING btree ("customers_id");
  CREATE INDEX "payload_migrations_updated_at_idx" ON "payload_migrations" USING btree ("updated_at");
  CREATE INDEX "payload_migrations_created_at_idx" ON "payload_migrations" USING btree ("created_at");
  CREATE INDEX "system_settings_booking_notification_emails_order_idx" ON "system_settings_booking_notification_emails" USING btree ("_order");
  CREATE INDEX "system_settings_booking_notification_emails_parent_id_idx" ON "system_settings_booking_notification_emails" USING btree ("_parent_id");
  CREATE INDEX "system_settings_base_currency_idx" ON "system_settings" USING btree ("base_currency_id");
  CREATE INDEX "system_settings_default_display_currency_idx" ON "system_settings" USING btree ("default_display_currency_id");
  CREATE INDEX "loyalty_settings_tiers_order_idx" ON "loyalty_settings_tiers" USING btree ("_order");
  CREATE INDEX "loyalty_settings_tiers_parent_id_idx" ON "loyalty_settings_tiers" USING btree ("_parent_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "users_sessions" CASCADE;
  DROP TABLE "users" CASCADE;
  DROP TABLE "customers_sessions" CASCADE;
  DROP TABLE "customers" CASCADE;
  DROP TABLE "media" CASCADE;
  DROP TABLE "countries_gallery" CASCADE;
  DROP TABLE "countries" CASCADE;
  DROP TABLE "cities_gallery" CASCADE;
  DROP TABLE "cities" CASCADE;
  DROP TABLE "accommodations_gallery" CASCADE;
  DROP TABLE "accommodations" CASCADE;
  DROP TABLE "experiences_gallery" CASCADE;
  DROP TABLE "experiences_included" CASCADE;
  DROP TABLE "experiences_excluded" CASCADE;
  DROP TABLE "experiences_itinerary" CASCADE;
  DROP TABLE "experiences_accommodations_options_room_rates" CASCADE;
  DROP TABLE "experiences_accommodations_options" CASCADE;
  DROP TABLE "experiences_accommodations" CASCADE;
  DROP TABLE "experiences_schedules" CASCADE;
  DROP TABLE "experiences_blackouts" CASCADE;
  DROP TABLE "experiences_price_overrides" CASCADE;
  DROP TABLE "experiences" CASCADE;
  DROP TABLE "experiences_rels" CASCADE;
  DROP TABLE "bookings_travelers" CASCADE;
  DROP TABLE "bookings" CASCADE;
  DROP TABLE "point_ledger" CASCADE;
  DROP TABLE "exchange_rates" CASCADE;
  DROP TABLE "currencies" CASCADE;
  DROP TABLE "translation_cache" CASCADE;
  DROP TABLE "admin_audit_logs" CASCADE;
  DROP TABLE "customer_notification_preferences" CASCADE;
  DROP TABLE "customer_travelers" CASCADE;
  DROP TABLE "dashboard_projections" CASCADE;
  DROP TABLE "faqs" CASCADE;
  DROP TABLE "maintenance_logs" CASCADE;
  DROP TABLE "media_gallery" CASCADE;
  DROP TABLE "notification_logs" CASCADE;
  DROP TABLE "pages" CASCADE;
  DROP TABLE "payment_transactions" CASCADE;
  DROP TABLE "posts" CASCADE;
  DROP TABLE "redirects" CASCADE;
  DROP TABLE "reviews" CASCADE;
  DROP TABLE "coupons" CASCADE;
  DROP TABLE "contact_requests" CASCADE;
  DROP TABLE "languages" CASCADE;
  DROP TABLE "departure_slots" CASCADE;
  DROP TABLE "event_outbox" CASCADE;
  DROP TABLE "event_inbox" CASCADE;
  DROP TABLE "maintenance_leases" CASCADE;
  DROP TABLE "payload_kv" CASCADE;
  DROP TABLE "payload_locked_documents" CASCADE;
  DROP TABLE "payload_locked_documents_rels" CASCADE;
  DROP TABLE "payload_preferences" CASCADE;
  DROP TABLE "payload_preferences_rels" CASCADE;
  DROP TABLE "payload_migrations" CASCADE;
  DROP TABLE "system_settings_booking_notification_emails" CASCADE;
  DROP TABLE "system_settings" CASCADE;
  DROP TABLE "loyalty_settings_tiers" CASCADE;
  DROP TABLE "loyalty_settings" CASCADE;
  DROP TYPE "public"."enum_users_role";
  DROP TYPE "public"."enum_customers_status";
  DROP TYPE "public"."enum_customers_preferences_measurement_system";
  DROP TYPE "public"."enum_countries_measurement_system";
  DROP TYPE "public"."enum_accommodations_type";
  DROP TYPE "public"."enum_experiences_accommodations_options_room_rates_occupancy";
  DROP TYPE "public"."enum_experiences_accommodations_options_board_basis";
  DROP TYPE "public"."enum_experiences_accommodations_options_pricing_unit";
  DROP TYPE "public"."enum_experiences_type";
  DROP TYPE "public"."enum_experiences_package_mode";
  DROP TYPE "public"."enum_experiences_availability";
  DROP TYPE "public"."enum_bookings_travelers_type";
  DROP TYPE "public"."enum_bookings_status";
  DROP TYPE "public"."enum_bookings_pickup_location_source";
  DROP TYPE "public"."enum_bookings_source";
  DROP TYPE "public"."enum_bookings_payment_status";
  DROP TYPE "public"."enum_point_ledger_reference_type";
  DROP TYPE "public"."enum_point_ledger_type";
  DROP TYPE "public"."enum_exchange_rates_source";
  DROP TYPE "public"."enum_exchange_rates_sync_status";
  DROP TYPE "public"."enum_admin_audit_logs_target_domain";
  DROP TYPE "public"."enum_customer_travelers_relationship";
  DROP TYPE "public"."enum_faqs_category";
  DROP TYPE "public"."enum_maintenance_logs_priority";
  DROP TYPE "public"."enum_maintenance_logs_started_by";
  DROP TYPE "public"."enum_maintenance_logs_status";
  DROP TYPE "public"."enum_notification_logs_channel";
  DROP TYPE "public"."enum_notification_logs_category";
  DROP TYPE "public"."enum_notification_logs_priority";
  DROP TYPE "public"."enum_notification_logs_status";
  DROP TYPE "public"."enum_pages_status";
  DROP TYPE "public"."enum_payment_transactions_provider";
  DROP TYPE "public"."enum_payment_transactions_status";
  DROP TYPE "public"."enum_posts_status";
  DROP TYPE "public"."enum_redirects_status_code";
  DROP TYPE "public"."enum_reviews_status";
  DROP TYPE "public"."enum_coupons_discount_type";
  DROP TYPE "public"."enum_coupons_status";
  DROP TYPE "public"."enum_departure_slots_status";
  DROP TYPE "public"."enum_event_outbox_status";`)
}
