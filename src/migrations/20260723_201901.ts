import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."_locales" AS ENUM('en', 'ar', 'fr');
  CREATE TYPE "public"."enum_users_role" AS ENUM('admin', 'super_admin');
  CREATE TYPE "public"."enum_customers_status" AS ENUM('active', 'inactive', 'suspended', 'pending_verification', 'pending_deletion', 'deleted');
  CREATE TYPE "public"."enum_customers_loyalty_tier" AS ENUM('explorer', 'voyager', 'elite');
  CREATE TYPE "public"."enum_customers_preferences_measurement_system" AS ENUM('metric', 'imperial');
  CREATE TYPE "public"."enum_experiences_type" AS ENUM('package', 'daily_tour');
  CREATE TYPE "public"."enum_experiences_availability" AS ENUM('available', 'sold_out', 'coming_soon', 'unavailable');
  CREATE TYPE "public"."enum_bookings_status" AS ENUM('draft', 'pending_payment', 'paid', 'confirmed', 'completed', 'cancelled', 'refunded');
  CREATE TYPE "public"."enum_bookings_source" AS ENUM('website', 'admin', 'api', 'partner', 'affiliate');
  CREATE TYPE "public"."enum_point_ledger_reference_type" AS ENUM('booking', 'admin_ticket', 'system_welcome', 'expiration_scan');
  CREATE TYPE "public"."enum_point_ledger_type" AS ENUM('earn', 'earned', 'redeem', 'redeemed', 'refund', 'refunded', 'reverse', 'reversed', 'welcome_bonus', 'tier_bonus', 'manual_adjustment', 'expiration', 'expired');
  CREATE TYPE "public"."enum_exchange_rates_source" AS ENUM('OpenExchange', 'ECB', 'Fixer', 'Manual');
  CREATE TYPE "public"."enum_exchange_rates_sync_status" AS ENUM('synced', 'failed', 'stale');
  CREATE TYPE "public"."enum_admin_audit_logs_target_domain" AS ENUM('booking', 'payment', 'loyalty', 'experience', 'customer', 'maintenance');
  CREATE TYPE "public"."enum_customer_addresses_type" AS ENUM('billing', 'shipping', 'home');
  CREATE TYPE "public"."enum_customer_travelers_relationship" AS ENUM('spouse', 'child', 'parent', 'friend', 'other');
  CREATE TYPE "public"."enum_faqs_category" AS ENUM('booking', 'cancellation', 'payment', 'loyalty');
  CREATE TYPE "public"."enum_maintenance_logs_priority" AS ENUM('critical', 'high', 'medium', 'low');
  CREATE TYPE "public"."enum_maintenance_logs_started_by" AS ENUM('scheduler', 'manual_admin', 'api');
  CREATE TYPE "public"."enum_maintenance_logs_status" AS ENUM('running', 'success', 'failed', 'partial_success');
  CREATE TYPE "public"."enum_notification_logs_channel" AS ENUM('email', 'sms', 'push', 'whatsapp');
  CREATE TYPE "public"."enum_notification_logs_category" AS ENUM('marketing', 'booking', 'payment', 'loyalty');
  CREATE TYPE "public"."enum_notification_logs_priority" AS ENUM('critical', 'high', 'normal', 'low');
  CREATE TYPE "public"."enum_notification_logs_status" AS ENUM('queued', 'processing', 'sent', 'delivered', 'failed', 'dlq');
  CREATE TYPE "public"."enum_pages_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum_payment_transactions_provider" AS ENUM('stripe', 'bnpl', 'manual');
  CREATE TYPE "public"."enum_payment_transactions_status" AS ENUM('initiated', 'processing', 'successful', 'failed', 'refunded', 'partially_refunded');
  CREATE TYPE "public"."enum_posts_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum_redirects_status_code" AS ENUM('301', '302');
  CREATE TYPE "public"."enum_reviews_status" AS ENUM('pending_approval', 'approved', 'rejected');
  CREATE TYPE "public"."enum_translations_provider" AS ENUM('cache', 'google', 'libre', 'manual');
  CREATE TYPE "public"."enum_coupons_discount_type" AS ENUM('percentage', 'fixed_egp');
  CREATE TYPE "public"."enum_coupons_status" AS ENUM('active', 'inactive', 'expired');
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
  	"status" "enum_customers_status" DEFAULT 'pending_verification' NOT NULL,
  	"failed_login_attempts" numeric DEFAULT 0,
  	"locked_until" timestamp(3) with time zone,
  	"last_login_at" timestamp(3) with time zone,
  	"email_verified_at" timestamp(3) with time zone,
  	"phone_verified_at" timestamp(3) with time zone,
  	"deleted_at" timestamp(3) with time zone,
  	"loyalty_tier" "enum_customers_loyalty_tier" DEFAULT 'explorer' NOT NULL,
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
  	"slug" varchar NOT NULL,
  	"code" varchar NOT NULL,
  	"hero_id" integer,
  	"is_active" boolean DEFAULT true,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "countries_locales" (
  	"name" varchar NOT NULL,
  	"description" jsonb,
  	"seo_title" varchar,
  	"seo_description" varchar,
  	"seo_keywords" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "cities_gallery" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"image_id" integer NOT NULL
  );
  
  CREATE TABLE "cities" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"slug" varchar NOT NULL,
  	"country_id" integer NOT NULL,
  	"hero_id" integer,
  	"is_active" boolean DEFAULT true,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "cities_locales" (
  	"name" varchar NOT NULL,
  	"description" jsonb,
  	"seo_title" varchar,
  	"seo_description" varchar,
  	"seo_keywords" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
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
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"item" varchar NOT NULL
  );
  
  CREATE TABLE "experiences_excluded" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"item" varchar NOT NULL
  );
  
  CREATE TABLE "experiences" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"slug" varchar NOT NULL,
  	"type" "enum_experiences_type" NOT NULL,
  	"city_id" integer NOT NULL,
  	"hero_id" integer,
  	"duration_days" numeric NOT NULL,
  	"duration_nights" numeric,
  	"price" numeric NOT NULL,
  	"availability" "enum_experiences_availability" DEFAULT 'available' NOT NULL,
  	"is_active" boolean DEFAULT true,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "experiences_locales" (
  	"title" varchar NOT NULL,
  	"description" jsonb,
  	"policies" jsonb,
  	"seo_title" varchar,
  	"seo_description" varchar,
  	"seo_keywords" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "bookings_travelers" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"first_name" varchar NOT NULL,
  	"last_name" varchar NOT NULL,
  	"email" varchar NOT NULL,
  	"phone" varchar NOT NULL,
  	"date_of_birth" timestamp(3) with time zone,
  	"passport_number" varchar
  );
  
  CREATE TABLE "bookings" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"booking_number" varchar NOT NULL,
  	"user_id" integer NOT NULL,
  	"experience_id" integer NOT NULL,
  	"status" "enum_bookings_status" DEFAULT 'draft' NOT NULL,
  	"start_date" timestamp(3) with time zone NOT NULL,
  	"end_date" timestamp(3) with time zone NOT NULL,
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
  	"points_earned" numeric DEFAULT 0,
  	"payment_id" varchar,
  	"notes" varchar,
  	"source" "enum_bookings_source" DEFAULT 'website',
  	"version" numeric DEFAULT 1,
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
  
  CREATE TABLE "currencies_country_codes" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"code" varchar NOT NULL
  );
  
  CREATE TABLE "currencies" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"iso_code" varchar NOT NULL,
  	"numeric_code" numeric NOT NULL,
  	"name" varchar NOT NULL,
  	"symbol" varchar NOT NULL,
  	"native_symbol" varchar,
  	"decimals" numeric DEFAULT 2 NOT NULL,
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
  	"status" "enum_notification_logs_status" DEFAULT 'queued' NOT NULL,
  	"attempts" numeric DEFAULT 0,
  	"last_error" varchar,
  	"sent_at" timestamp(3) with time zone,
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
  
  CREATE TABLE "translations" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"translation_key" varchar NOT NULL,
  	"locale" varchar NOT NULL,
  	"translated_text" varchar NOT NULL,
  	"provider" "enum_translations_provider" DEFAULT 'manual' NOT NULL,
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
  	"experiences_id" integer,
  	"bookings_id" integer,
  	"point_ledger_id" integer,
  	"exchange_rates_id" integer,
  	"currencies_id" integer,
  	"translation_cache_id" integer,
  	"admin_audit_logs_id" integer,
  	"customer_addresses_id" integer,
  	"customer_device_sessions_id" integer,
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
  	"translations_id" integer,
  	"coupons_id" integer
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
  
  ALTER TABLE "users_sessions" ADD CONSTRAINT "users_sessions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "customers_sessions" ADD CONSTRAINT "customers_sessions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "countries_gallery" ADD CONSTRAINT "countries_gallery_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "countries_gallery" ADD CONSTRAINT "countries_gallery_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."countries"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "countries" ADD CONSTRAINT "countries_hero_id_media_id_fk" FOREIGN KEY ("hero_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "countries_locales" ADD CONSTRAINT "countries_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."countries"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cities_gallery" ADD CONSTRAINT "cities_gallery_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cities_gallery" ADD CONSTRAINT "cities_gallery_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."cities"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cities" ADD CONSTRAINT "cities_country_id_countries_id_fk" FOREIGN KEY ("country_id") REFERENCES "public"."countries"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cities" ADD CONSTRAINT "cities_hero_id_media_id_fk" FOREIGN KEY ("hero_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cities_locales" ADD CONSTRAINT "cities_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."cities"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "experiences_gallery" ADD CONSTRAINT "experiences_gallery_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "experiences_gallery" ADD CONSTRAINT "experiences_gallery_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."experiences"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "experiences_included" ADD CONSTRAINT "experiences_included_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."experiences"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "experiences_excluded" ADD CONSTRAINT "experiences_excluded_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."experiences"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "experiences" ADD CONSTRAINT "experiences_city_id_cities_id_fk" FOREIGN KEY ("city_id") REFERENCES "public"."cities"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "experiences" ADD CONSTRAINT "experiences_hero_id_media_id_fk" FOREIGN KEY ("hero_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "experiences_locales" ADD CONSTRAINT "experiences_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."experiences"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "bookings_travelers" ADD CONSTRAINT "bookings_travelers_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "bookings" ADD CONSTRAINT "bookings_user_id_customers_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "bookings" ADD CONSTRAINT "bookings_experience_id_experiences_id_fk" FOREIGN KEY ("experience_id") REFERENCES "public"."experiences"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "point_ledger" ADD CONSTRAINT "point_ledger_user_id_customers_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "point_ledger" ADD CONSTRAINT "point_ledger_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "currencies_country_codes" ADD CONSTRAINT "currencies_country_codes_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."currencies"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "admin_audit_logs" ADD CONSTRAINT "admin_audit_logs_admin_user_id_users_id_fk" FOREIGN KEY ("admin_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "customer_addresses" ADD CONSTRAINT "customer_addresses_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "customer_device_sessions" ADD CONSTRAINT "customer_device_sessions_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "customer_notification_preferences" ADD CONSTRAINT "customer_notification_preferences_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "customer_travelers" ADD CONSTRAINT "customer_travelers_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "dashboard_projections" ADD CONSTRAINT "dashboard_projections_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "notification_logs" ADD CONSTRAINT "notification_logs_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "reviews" ADD CONSTRAINT "reviews_experience_id_experiences_id_fk" FOREIGN KEY ("experience_id") REFERENCES "public"."experiences"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "reviews" ADD CONSTRAINT "reviews_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "reviews" ADD CONSTRAINT "reviews_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_locked_documents"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_customers_fk" FOREIGN KEY ("customers_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_countries_fk" FOREIGN KEY ("countries_id") REFERENCES "public"."countries"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_cities_fk" FOREIGN KEY ("cities_id") REFERENCES "public"."cities"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_experiences_fk" FOREIGN KEY ("experiences_id") REFERENCES "public"."experiences"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_bookings_fk" FOREIGN KEY ("bookings_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_point_ledger_fk" FOREIGN KEY ("point_ledger_id") REFERENCES "public"."point_ledger"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_exchange_rates_fk" FOREIGN KEY ("exchange_rates_id") REFERENCES "public"."exchange_rates"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_currencies_fk" FOREIGN KEY ("currencies_id") REFERENCES "public"."currencies"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_translation_cache_fk" FOREIGN KEY ("translation_cache_id") REFERENCES "public"."translation_cache"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_admin_audit_logs_fk" FOREIGN KEY ("admin_audit_logs_id") REFERENCES "public"."admin_audit_logs"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_customer_addresses_fk" FOREIGN KEY ("customer_addresses_id") REFERENCES "public"."customer_addresses"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_customer_device_sessions_fk" FOREIGN KEY ("customer_device_sessions_id") REFERENCES "public"."customer_device_sessions"("id") ON DELETE cascade ON UPDATE no action;
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
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_translations_fk" FOREIGN KEY ("translations_id") REFERENCES "public"."translations"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_coupons_fk" FOREIGN KEY ("coupons_id") REFERENCES "public"."coupons"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_preferences"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_customers_fk" FOREIGN KEY ("customers_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;
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
  CREATE INDEX "countries_updated_at_idx" ON "countries" USING btree ("updated_at");
  CREATE INDEX "countries_created_at_idx" ON "countries" USING btree ("created_at");
  CREATE UNIQUE INDEX "countries_locales_locale_parent_id_unique" ON "countries_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "cities_gallery_order_idx" ON "cities_gallery" USING btree ("_order");
  CREATE INDEX "cities_gallery_parent_id_idx" ON "cities_gallery" USING btree ("_parent_id");
  CREATE INDEX "cities_gallery_image_idx" ON "cities_gallery" USING btree ("image_id");
  CREATE UNIQUE INDEX "cities_slug_idx" ON "cities" USING btree ("slug");
  CREATE INDEX "cities_country_idx" ON "cities" USING btree ("country_id");
  CREATE INDEX "cities_hero_idx" ON "cities" USING btree ("hero_id");
  CREATE INDEX "cities_updated_at_idx" ON "cities" USING btree ("updated_at");
  CREATE INDEX "cities_created_at_idx" ON "cities" USING btree ("created_at");
  CREATE UNIQUE INDEX "cities_locales_locale_parent_id_unique" ON "cities_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "experiences_gallery_order_idx" ON "experiences_gallery" USING btree ("_order");
  CREATE INDEX "experiences_gallery_parent_id_idx" ON "experiences_gallery" USING btree ("_parent_id");
  CREATE INDEX "experiences_gallery_image_idx" ON "experiences_gallery" USING btree ("image_id");
  CREATE INDEX "experiences_included_order_idx" ON "experiences_included" USING btree ("_order");
  CREATE INDEX "experiences_included_parent_id_idx" ON "experiences_included" USING btree ("_parent_id");
  CREATE INDEX "experiences_included_locale_idx" ON "experiences_included" USING btree ("_locale");
  CREATE INDEX "experiences_excluded_order_idx" ON "experiences_excluded" USING btree ("_order");
  CREATE INDEX "experiences_excluded_parent_id_idx" ON "experiences_excluded" USING btree ("_parent_id");
  CREATE INDEX "experiences_excluded_locale_idx" ON "experiences_excluded" USING btree ("_locale");
  CREATE UNIQUE INDEX "experiences_slug_idx" ON "experiences" USING btree ("slug");
  CREATE INDEX "experiences_city_idx" ON "experiences" USING btree ("city_id");
  CREATE INDEX "experiences_hero_idx" ON "experiences" USING btree ("hero_id");
  CREATE INDEX "experiences_updated_at_idx" ON "experiences" USING btree ("updated_at");
  CREATE INDEX "experiences_created_at_idx" ON "experiences" USING btree ("created_at");
  CREATE UNIQUE INDEX "experiences_locales_locale_parent_id_unique" ON "experiences_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "bookings_travelers_order_idx" ON "bookings_travelers" USING btree ("_order");
  CREATE INDEX "bookings_travelers_parent_id_idx" ON "bookings_travelers" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "bookings_booking_number_idx" ON "bookings" USING btree ("booking_number");
  CREATE INDEX "bookings_user_idx" ON "bookings" USING btree ("user_id");
  CREATE INDEX "bookings_experience_idx" ON "bookings" USING btree ("experience_id");
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
  CREATE INDEX "currencies_country_codes_order_idx" ON "currencies_country_codes" USING btree ("_order");
  CREATE INDEX "currencies_country_codes_parent_id_idx" ON "currencies_country_codes" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "currencies_iso_code_idx" ON "currencies" USING btree ("iso_code");
  CREATE INDEX "currencies_is_active_idx" ON "currencies" USING btree ("is_active");
  CREATE INDEX "currencies_updated_at_idx" ON "currencies" USING btree ("updated_at");
  CREATE INDEX "currencies_created_at_idx" ON "currencies" USING btree ("created_at");
  CREATE INDEX "translation_cache_original_hash_idx" ON "translation_cache" USING btree ("original_hash");
  CREATE INDEX "translation_cache_language_idx" ON "translation_cache" USING btree ("language");
  CREATE INDEX "translation_cache_updated_at_idx" ON "translation_cache" USING btree ("updated_at");
  CREATE INDEX "translation_cache_created_at_idx" ON "translation_cache" USING btree ("created_at");
  CREATE UNIQUE INDEX "admin_audit_logs_audit_id_idx" ON "admin_audit_logs" USING btree ("audit_id");
  CREATE INDEX "admin_audit_logs_admin_user_idx" ON "admin_audit_logs" USING btree ("admin_user_id");
  CREATE INDEX "admin_audit_logs_action_idx" ON "admin_audit_logs" USING btree ("action");
  CREATE INDEX "admin_audit_logs_target_id_idx" ON "admin_audit_logs" USING btree ("target_id");
  CREATE INDEX "admin_audit_logs_updated_at_idx" ON "admin_audit_logs" USING btree ("updated_at");
  CREATE INDEX "admin_audit_logs_created_at_idx" ON "admin_audit_logs" USING btree ("created_at");
  CREATE INDEX "customer_addresses_customer_idx" ON "customer_addresses" USING btree ("customer_id");
  CREATE INDEX "customer_addresses_updated_at_idx" ON "customer_addresses" USING btree ("updated_at");
  CREATE INDEX "customer_addresses_created_at_idx" ON "customer_addresses" USING btree ("created_at");
  CREATE INDEX "customer_device_sessions_customer_idx" ON "customer_device_sessions" USING btree ("customer_id");
  CREATE UNIQUE INDEX "customer_device_sessions_session_id_idx" ON "customer_device_sessions" USING btree ("session_id");
  CREATE INDEX "customer_device_sessions_updated_at_idx" ON "customer_device_sessions" USING btree ("updated_at");
  CREATE INDEX "customer_device_sessions_created_at_idx" ON "customer_device_sessions" USING btree ("created_at");
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
  CREATE INDEX "reviews_booking_idx" ON "reviews" USING btree ("booking_id");
  CREATE INDEX "reviews_updated_at_idx" ON "reviews" USING btree ("updated_at");
  CREATE INDEX "reviews_created_at_idx" ON "reviews" USING btree ("created_at");
  CREATE INDEX "translations_translation_key_idx" ON "translations" USING btree ("translation_key");
  CREATE INDEX "translations_locale_idx" ON "translations" USING btree ("locale");
  CREATE INDEX "translations_updated_at_idx" ON "translations" USING btree ("updated_at");
  CREATE INDEX "translations_created_at_idx" ON "translations" USING btree ("created_at");
  CREATE UNIQUE INDEX "coupons_coupon_id_idx" ON "coupons" USING btree ("coupon_id");
  CREATE UNIQUE INDEX "coupons_code_idx" ON "coupons" USING btree ("code");
  CREATE INDEX "coupons_updated_at_idx" ON "coupons" USING btree ("updated_at");
  CREATE INDEX "coupons_created_at_idx" ON "coupons" USING btree ("created_at");
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
  CREATE INDEX "payload_locked_documents_rels_experiences_id_idx" ON "payload_locked_documents_rels" USING btree ("experiences_id");
  CREATE INDEX "payload_locked_documents_rels_bookings_id_idx" ON "payload_locked_documents_rels" USING btree ("bookings_id");
  CREATE INDEX "payload_locked_documents_rels_point_ledger_id_idx" ON "payload_locked_documents_rels" USING btree ("point_ledger_id");
  CREATE INDEX "payload_locked_documents_rels_exchange_rates_id_idx" ON "payload_locked_documents_rels" USING btree ("exchange_rates_id");
  CREATE INDEX "payload_locked_documents_rels_currencies_id_idx" ON "payload_locked_documents_rels" USING btree ("currencies_id");
  CREATE INDEX "payload_locked_documents_rels_translation_cache_id_idx" ON "payload_locked_documents_rels" USING btree ("translation_cache_id");
  CREATE INDEX "payload_locked_documents_rels_admin_audit_logs_id_idx" ON "payload_locked_documents_rels" USING btree ("admin_audit_logs_id");
  CREATE INDEX "payload_locked_documents_rels_customer_addresses_id_idx" ON "payload_locked_documents_rels" USING btree ("customer_addresses_id");
  CREATE INDEX "payload_locked_documents_rels_customer_device_sessions_i_idx" ON "payload_locked_documents_rels" USING btree ("customer_device_sessions_id");
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
  CREATE INDEX "payload_locked_documents_rels_translations_id_idx" ON "payload_locked_documents_rels" USING btree ("translations_id");
  CREATE INDEX "payload_locked_documents_rels_coupons_id_idx" ON "payload_locked_documents_rels" USING btree ("coupons_id");
  CREATE INDEX "payload_preferences_key_idx" ON "payload_preferences" USING btree ("key");
  CREATE INDEX "payload_preferences_updated_at_idx" ON "payload_preferences" USING btree ("updated_at");
  CREATE INDEX "payload_preferences_created_at_idx" ON "payload_preferences" USING btree ("created_at");
  CREATE INDEX "payload_preferences_rels_order_idx" ON "payload_preferences_rels" USING btree ("order");
  CREATE INDEX "payload_preferences_rels_parent_idx" ON "payload_preferences_rels" USING btree ("parent_id");
  CREATE INDEX "payload_preferences_rels_path_idx" ON "payload_preferences_rels" USING btree ("path");
  CREATE INDEX "payload_preferences_rels_users_id_idx" ON "payload_preferences_rels" USING btree ("users_id");
  CREATE INDEX "payload_preferences_rels_customers_id_idx" ON "payload_preferences_rels" USING btree ("customers_id");
  CREATE INDEX "payload_migrations_updated_at_idx" ON "payload_migrations" USING btree ("updated_at");
  CREATE INDEX "payload_migrations_created_at_idx" ON "payload_migrations" USING btree ("created_at");`)
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
  DROP TABLE "countries_locales" CASCADE;
  DROP TABLE "cities_gallery" CASCADE;
  DROP TABLE "cities" CASCADE;
  DROP TABLE "cities_locales" CASCADE;
  DROP TABLE "experiences_gallery" CASCADE;
  DROP TABLE "experiences_included" CASCADE;
  DROP TABLE "experiences_excluded" CASCADE;
  DROP TABLE "experiences" CASCADE;
  DROP TABLE "experiences_locales" CASCADE;
  DROP TABLE "bookings_travelers" CASCADE;
  DROP TABLE "bookings" CASCADE;
  DROP TABLE "point_ledger" CASCADE;
  DROP TABLE "exchange_rates" CASCADE;
  DROP TABLE "currencies_country_codes" CASCADE;
  DROP TABLE "currencies" CASCADE;
  DROP TABLE "translation_cache" CASCADE;
  DROP TABLE "admin_audit_logs" CASCADE;
  DROP TABLE "customer_addresses" CASCADE;
  DROP TABLE "customer_device_sessions" CASCADE;
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
  DROP TABLE "translations" CASCADE;
  DROP TABLE "coupons" CASCADE;
  DROP TABLE "payload_kv" CASCADE;
  DROP TABLE "payload_locked_documents" CASCADE;
  DROP TABLE "payload_locked_documents_rels" CASCADE;
  DROP TABLE "payload_preferences" CASCADE;
  DROP TABLE "payload_preferences_rels" CASCADE;
  DROP TABLE "payload_migrations" CASCADE;
  DROP TYPE "public"."_locales";
  DROP TYPE "public"."enum_users_role";
  DROP TYPE "public"."enum_customers_status";
  DROP TYPE "public"."enum_customers_loyalty_tier";
  DROP TYPE "public"."enum_customers_preferences_measurement_system";
  DROP TYPE "public"."enum_experiences_type";
  DROP TYPE "public"."enum_experiences_availability";
  DROP TYPE "public"."enum_bookings_status";
  DROP TYPE "public"."enum_bookings_source";
  DROP TYPE "public"."enum_point_ledger_reference_type";
  DROP TYPE "public"."enum_point_ledger_type";
  DROP TYPE "public"."enum_exchange_rates_source";
  DROP TYPE "public"."enum_exchange_rates_sync_status";
  DROP TYPE "public"."enum_admin_audit_logs_target_domain";
  DROP TYPE "public"."enum_customer_addresses_type";
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
  DROP TYPE "public"."enum_translations_provider";
  DROP TYPE "public"."enum_coupons_discount_type";
  DROP TYPE "public"."enum_coupons_status";`)
}
