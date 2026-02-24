-- =============================================================================
-- NeoSaaS Full Database Reset
-- Generated from db/schema.ts (drizzle/0000_oval_iron_man.sql)
-- Run this in Neon Console or via psql to completely reset the database
-- =============================================================================

-- 1. DROP everything (order matters: child tables first)
DROP TABLE IF EXISTS llm_usage_logs CASCADE;
DROP TABLE IF EXISTS llm_api_keys CASCADE;
DROP TABLE IF EXISTS chat_settings CASCADE;
DROP TABLE IF EXISTS chat_quick_responses CASCADE;
DROP TABLE IF EXISTS chat_messages CASCADE;
DROP TABLE IF EXISTS chat_conversations CASCADE;
DROP TABLE IF EXISTS calendar_connections CASCADE;
DROP TABLE IF EXISTS outlook_integrations CASCADE;
DROP TABLE IF EXISTS product_leads CASCADE;
DROP TABLE IF EXISTS cart_items CASCADE;
DROP TABLE IF EXISTS carts CASCADE;
DROP TABLE IF EXISTS coupon_usage CASCADE;
DROP TABLE IF EXISTS coupons CASCADE;
DROP TABLE IF EXISTS shipments CASCADE;
DROP TABLE IF EXISTS order_items CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS vat_rates CASCADE;
DROP TABLE IF EXISTS user_tos_acceptance CASCADE;
DROP TABLE IF EXISTS terms_of_service CASCADE;
DROP TABLE IF EXISTS cookie_consents CASCADE;
DROP TABLE IF EXISTS page_permissions CASCADE;
DROP TABLE IF EXISTS platform_config CASCADE;
DROP TABLE IF EXISTS system_logs CASCADE;
DROP TABLE IF EXISTS user_api_key_usage CASCADE;
DROP TABLE IF EXISTS user_api_keys CASCADE;
DROP TABLE IF EXISTS service_api_usage CASCADE;
DROP TABLE IF EXISTS service_api_configs CASCADE;
DROP TABLE IF EXISTS email_events CASCADE;
DROP TABLE IF EXISTS email_statistics CASCADE;
DROP TABLE IF EXISTS email_history CASCADE;
DROP TABLE IF EXISTS email_templates CASCADE;
DROP TABLE IF EXISTS email_provider_configs CASCADE;
DROP TABLE IF EXISTS verification_tokens CASCADE;
DROP TABLE IF EXISTS oauth_connections CASCADE;
DROP TABLE IF EXISTS user_invitations CASCADE;
DROP TABLE IF EXISTS role_permissions CASCADE;
DROP TABLE IF EXISTS user_roles CASCADE;
DROP TABLE IF EXISTS permissions CASCADE;
DROP TABLE IF EXISTS roles CASCADE;
DROP TABLE IF EXISTS stripe_sync_logs CASCADE;
DROP TABLE IF EXISTS subscriptions CASCADE;
DROP TABLE IF EXISTS payment_methods CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS companies CASCADE;
DROP TYPE IF EXISTS notification_category CASCADE;

-- 2. CREATE ENUM
CREATE TYPE "public"."notification_category" AS ENUM('info', 'action', 'urgent');

-- 3. CREATE TABLES (from drizzle/0000_oval_iron_man.sql)

CREATE TABLE "companies" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" text NOT NULL,
  "email" text NOT NULL,
  "city" text,
  "address" text,
  "zip_code" text,
  "siret" text,
  "vat_number" text,
  "phone" text,
  "stripe_customer_id" text,
  "stripe_setup_intent_client_secret" text,
  "stripe_default_payment_method" text,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "companies_email_unique" UNIQUE("email"),
  CONSTRAINT "companies_stripe_customer_id_unique" UNIQUE("stripe_customer_id")
);

CREATE TABLE "users" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "username" text,
  "email" text NOT NULL,
  "password" text NOT NULL,
  "first_name" text NOT NULL,
  "last_name" text NOT NULL,
  "phone" text,
  "address" text,
  "city" text,
  "postal_code" text,
  "country" text,
  "position" text,
  "profile_image" text,
  "company_id" uuid,
  "email_verified" timestamp,
  "is_active" boolean DEFAULT true NOT NULL,
  "is_site_manager" boolean DEFAULT false NOT NULL,
  "is_dpo" boolean DEFAULT false NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "users_username_unique" UNIQUE("username"),
  CONSTRAINT "users_email_unique" UNIQUE("email")
);

CREATE TABLE "payment_methods" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "company_id" uuid NOT NULL,
  "stripe_payment_method_id" text NOT NULL,
  "stripe_customer_id" text NOT NULL,
  "type" text DEFAULT 'card' NOT NULL,
  "card_brand" text,
  "card_last4" text,
  "card_exp_month" integer,
  "card_exp_year" integer,
  "card_country" text,
  "card_fingerprint" text,
  "is_default" boolean DEFAULT false NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "holder_name" text,
  "billing_address" jsonb,
  "metadata" jsonb,
  "added_by" uuid,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  "last_synced_at" timestamp,
  "expires_at" timestamp,
  CONSTRAINT "payment_methods_stripe_payment_method_id_unique" UNIQUE("stripe_payment_method_id")
);

CREATE TABLE "subscriptions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "stripe_subscription_id" text NOT NULL,
  "customer_id" uuid NOT NULL,
  "stripe_price_id" text NOT NULL,
  "status" text NOT NULL,
  "current_period_start" timestamp,
  "current_period_end" timestamp,
  "cancel_at_period_end" boolean DEFAULT false,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "subscriptions_stripe_subscription_id_unique" UNIQUE("stripe_subscription_id")
);

CREATE TABLE "stripe_sync_logs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "company_id" uuid,
  "sync_type" text NOT NULL,
  "status" text NOT NULL,
  "cards_added" integer DEFAULT 0,
  "cards_updated" integer DEFAULT 0,
  "cards_removed" integer DEFAULT 0,
  "error_message" text,
  "metadata" jsonb,
  "duration" integer,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "verification_tokens" (
  "identifier" text NOT NULL,
  "token" text NOT NULL,
  "expires" timestamp NOT NULL,
  CONSTRAINT "verification_tokens_identifier_token_pk" PRIMARY KEY("identifier","token")
);

CREATE TABLE "oauth_connections" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "provider" text NOT NULL,
  "provider_user_id" text NOT NULL,
  "email" text NOT NULL,
  "access_token" text,
  "refresh_token" text,
  "expires_at" timestamp,
  "scope" text,
  "metadata" jsonb,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "roles" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" text NOT NULL,
  "scope" text NOT NULL,
  "description" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "roles_name_unique" UNIQUE("name")
);

CREATE TABLE "permissions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" text NOT NULL,
  "scope" text NOT NULL,
  "description" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "permissions_name_unique" UNIQUE("name")
);

CREATE TABLE "user_roles" (
  "user_id" uuid NOT NULL,
  "role_id" uuid NOT NULL,
  "assigned_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "user_roles_user_id_role_id_pk" PRIMARY KEY("user_id","role_id")
);

CREATE TABLE "role_permissions" (
  "role_id" uuid NOT NULL,
  "permission_id" uuid NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "role_permissions_role_id_permission_id_pk" PRIMARY KEY("role_id","permission_id")
);

CREATE TABLE "user_invitations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "email" text NOT NULL,
  "company_id" uuid NOT NULL,
  "role_id" uuid NOT NULL,
  "invited_by" uuid,
  "token" text NOT NULL,
  "status" text DEFAULT 'pending' NOT NULL,
  "expires_at" timestamp NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "accepted_at" timestamp,
  CONSTRAINT "user_invitations_token_unique" UNIQUE("token")
);

CREATE TABLE "email_provider_configs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "provider" text NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "is_default" boolean DEFAULT false NOT NULL,
  "config" jsonb NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "email_provider_configs_provider_unique" UNIQUE("provider")
);

CREATE TABLE "email_templates" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "type" text NOT NULL,
  "name" text NOT NULL,
  "description" text,
  "from_name" text NOT NULL,
  "from_email" text NOT NULL,
  "subject" text NOT NULL,
  "html_content" text,
  "text_content" text,
  "is_active" boolean DEFAULT true NOT NULL,
  "provider" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "email_templates_type_unique" UNIQUE("type")
);

CREATE TABLE "email_history" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "provider" text NOT NULL,
  "template_type" text,
  "message_id" text,
  "from" text NOT NULL,
  "to" jsonb NOT NULL,
  "cc" jsonb,
  "bcc" jsonb,
  "subject" text NOT NULL,
  "html_content" text,
  "text_content" text,
  "status" text DEFAULT 'pending' NOT NULL,
  "error_message" text,
  "tags" jsonb,
  "metadata" jsonb,
  "sent_at" timestamp,
  "delivered_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "email_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "email_history_id" uuid,
  "provider" text NOT NULL,
  "message_id" text,
  "event_type" text NOT NULL,
  "event_data" jsonb,
  "ip_address" text,
  "user_agent" text,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "email_statistics" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "date" timestamp NOT NULL,
  "provider" text NOT NULL,
  "total_sent" integer DEFAULT 0 NOT NULL,
  "total_delivered" integer DEFAULT 0 NOT NULL,
  "total_failed" integer DEFAULT 0 NOT NULL,
  "total_bounced" integer DEFAULT 0 NOT NULL,
  "total_opened" integer DEFAULT 0 NOT NULL,
  "total_clicked" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "service_api_configs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "service_name" text NOT NULL,
  "service_type" text NOT NULL,
  "environment" text DEFAULT 'production' NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "is_default" boolean DEFAULT false NOT NULL,
  "config" jsonb NOT NULL,
  "metadata" jsonb,
  "last_tested_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "service_api_usage" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "config_id" uuid NOT NULL,
  "service_name" text NOT NULL,
  "operation" varchar(255) NOT NULL,
  "status" text NOT NULL,
  "status_code" varchar(10),
  "request_data" jsonb,
  "response_data" jsonb,
  "error_message" text,
  "response_time" integer,
  "cost_estimate" integer,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "user_api_keys" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "name" varchar(255) NOT NULL,
  "key_hash" varchar(255) NOT NULL,
  "key_prefix" varchar(10) NOT NULL,
  "permissions" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "expires_at" timestamp,
  "last_used_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "user_api_keys_key_hash_unique" UNIQUE("key_hash")
);

CREATE TABLE "user_api_key_usage" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "api_key_id" uuid NOT NULL,
  "endpoint" varchar(500) NOT NULL,
  "method" varchar(10) NOT NULL,
  "status_code" varchar(3) NOT NULL,
  "ip_address" varchar(45),
  "user_agent" text,
  "response_time" varchar(50),
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "vat_rates" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" text NOT NULL,
  "country" text NOT NULL,
  "rate" integer NOT NULL,
  "description" text,
  "is_default" boolean DEFAULT false NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "products" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "title" text NOT NULL,
  "subtitle" text,
  "description" text,
  "features" json,
  "price" integer DEFAULT 0 NOT NULL,
  "hourly_rate" integer,
  "type" text DEFAULT 'physical' NOT NULL,
  "is_free" boolean DEFAULT false NOT NULL,
  "digital_delivery_type" text DEFAULT 'license',
  "file_url" text,
  "delivery_code" text,
  "download_url" text,
  "license_key" text,
  "license_instructions" text,
  "requires_shipping" boolean DEFAULT false,
  "weight" integer,
  "dimensions" jsonb,
  "stock_quantity" integer,
  "shipping_notes" text,
  "payment_type" text DEFAULT 'one_time',
  "subscription_price_weekly" integer,
  "subscription_price_monthly" integer,
  "subscription_price_yearly" integer,
  "icon" text,
  "image_url" text,
  "vat_rate_id" uuid,
  "currency" text DEFAULT 'EUR' NOT NULL,
  "is_published" boolean DEFAULT false NOT NULL,
  "is_featured" boolean DEFAULT false NOT NULL,
  "upsell_product_id" uuid,
  "stripe_product_id" text,
  "stripe_price_one_time" text,
  "stripe_price_weekly" text,
  "stripe_price_monthly" text,
  "stripe_price_yearly" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "orders" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid,
  "company_id" uuid,
  "order_number" varchar(50) NOT NULL,
  "status" text DEFAULT 'pending' NOT NULL,
  "total_amount" integer NOT NULL,
  "currency" varchar(3) DEFAULT 'EUR' NOT NULL,
  "payment_method" varchar(50),
  "payment_status" text DEFAULT 'pending' NOT NULL,
  "payment_intent_id" varchar(255),
  "paid_at" timestamp,
  "notes" text,
  "requires_shipping" boolean DEFAULT false,
  "shipping_address" jsonb,
  "shipping_status" text,
  "shipping_tracking_number" text,
  "shipping_carrier" text,
  "shipped_at" timestamp,
  "delivered_at" timestamp,
  "shipping_reminder_sent" boolean DEFAULT false,
  -- Stripe Invoice PDF links (populated by invoice.paid webhook)
  "stripe_invoice_id" text,
  "invoice_pdf" text,
  "hosted_invoice_url" text,
  "tax_amount" integer,
  "metadata" jsonb,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "orders_order_number_unique" UNIQUE("order_number")
);

CREATE TABLE "order_items" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "order_id" uuid NOT NULL,
  "item_type" varchar(50) NOT NULL,
  "item_id" varchar(100),
  "product_id" uuid,
  "item_name" varchar(255) NOT NULL,
  "item_description" text,
  "quantity" integer DEFAULT 1 NOT NULL,
  "unit_price" integer NOT NULL,
  "total_price" integer NOT NULL,
  "delivery_time" varchar(100),
  "delivery_status" text DEFAULT 'pending',
  "delivered_at" timestamp,
  "metadata" jsonb,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "shipments" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "order_id" uuid NOT NULL,
  "order_item_id" uuid,
  "product_id" uuid,
  "status" text DEFAULT 'pending' NOT NULL,
  "tracking_number" text,
  "carrier" text,
  "tracking_url" text,
  "shipping_address" jsonb NOT NULL,
  "estimated_delivery_date" timestamp,
  "shipped_at" timestamp,
  "delivered_at" timestamp,
  "notes" text,
  "emails_sent" jsonb DEFAULT '[]',
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "coupons" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "code" text NOT NULL,
  "description" text,
  "discount_type" text NOT NULL,
  "discount_value" integer NOT NULL,
  "currency" text DEFAULT 'EUR',
  "min_purchase_amount" integer,
  "max_discount_amount" integer,
  "usage_limit" integer,
  "usage_count" integer DEFAULT 0 NOT NULL,
  "per_user_limit" integer,
  "start_date" timestamp,
  "end_date" timestamp,
  "applicable_products" json,
  "excluded_products" json,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_by" uuid,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "coupons_code_unique" UNIQUE("code")
);

CREATE TABLE "coupon_usage" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "coupon_id" uuid NOT NULL,
  "user_id" uuid,
  "order_id" uuid,
  "discount_amount" integer NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "carts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid,
  "status" text DEFAULT 'active' NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "cart_items" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "cart_id" uuid NOT NULL,
  "product_id" uuid NOT NULL,
  "quantity" integer DEFAULT 1 NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "outlook_integrations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "access_token" text NOT NULL,
  "refresh_token" text,
  "expires_at" timestamp NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "outlook_integrations_user_id_unique" UNIQUE("user_id")
);

CREATE TABLE "product_leads" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "product_id" uuid NOT NULL,
  "user_id" uuid,
  "user_email" text NOT NULL,
  "user_name" text,
  "user_phone" text,
  "status" text DEFAULT 'new' NOT NULL,
  "source" text DEFAULT 'website',
  "notes" text,
  "scheduled_at" timestamp,
  "converted_at" timestamp,
  "metadata" jsonb,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "system_logs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "category" text NOT NULL,
  "level" text DEFAULT 'info' NOT NULL,
  "message" text NOT NULL,
  "metadata" jsonb,
  "user_id" uuid,
  "resource_id" text,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "page_permissions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "path" text NOT NULL,
  "name" text NOT NULL,
  "access" text DEFAULT 'public' NOT NULL,
  "group" text NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "page_permissions_path_unique" UNIQUE("path")
);

CREATE TABLE "platform_config" (
  "key" text PRIMARY KEY NOT NULL,
  "value" text,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "terms_of_service" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "version" text NOT NULL,
  "content" text NOT NULL,
  "is_active" boolean DEFAULT false NOT NULL,
  "published_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "created_by" uuid
);

CREATE TABLE "user_tos_acceptance" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "tos_id" uuid NOT NULL,
  "accepted_at" timestamp DEFAULT now() NOT NULL,
  "ip_address" text,
  "user_agent" text
);

CREATE TABLE "cookie_consents" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "ip_address" text NOT NULL,
  "user_agent" text,
  "consent_status" text NOT NULL,
  "consented_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "calendar_connections" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "provider" text NOT NULL,
  "email" text,
  "access_token" text NOT NULL,
  "refresh_token" text,
  "expires_at" timestamp,
  "calendar_id" text,
  "is_active" boolean DEFAULT true NOT NULL,
  "last_sync_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "chat_conversations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid,
  "guest_email" text,
  "guest_name" text,
  "guest_session_id" text,
  "subject" text NOT NULL,
  "category" "notification_category" DEFAULT 'action' NOT NULL,
  "status" text DEFAULT 'open' NOT NULL,
  "priority" text DEFAULT 'normal',
  "assigned_admin_id" uuid,
  "last_message_at" timestamp DEFAULT now(),
  "closed_at" timestamp,
  "closed_by" uuid,
  "metadata" jsonb,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "chat_messages" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "conversation_id" uuid NOT NULL,
  "sender_id" uuid,
  "sender_type" text NOT NULL,
  "sender_name" text,
  "sender_email" text,
  "content" text NOT NULL,
  "message_type" text DEFAULT 'text',
  "attachment_url" text,
  "attachment_name" text,
  "is_read" boolean DEFAULT false NOT NULL,
  "read_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "chat_quick_responses" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "title" text NOT NULL,
  "content" text NOT NULL,
  "category" text,
  "shortcut" text,
  "usage_count" integer DEFAULT 0 NOT NULL,
  "created_by" uuid,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "chat_settings" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "key" text NOT NULL,
  "value" text,
  "description" text,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "chat_settings_key_unique" UNIQUE("key")
);

CREATE TABLE "llm_api_keys" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "provider" text NOT NULL,
  "name" text NOT NULL,
  "encrypted_key" text NOT NULL,
  "key_prefix" text,
  "is_active" boolean DEFAULT true NOT NULL,
  "is_default" boolean DEFAULT false NOT NULL,
  "last_used_at" timestamp,
  "usage_count" integer DEFAULT 0 NOT NULL,
  "metadata" jsonb,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "llm_usage_logs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "key_id" uuid NOT NULL,
  "user_id" uuid,
  "provider" text NOT NULL,
  "model" text,
  "prompt_tokens" integer,
  "completion_tokens" integer,
  "total_tokens" integer,
  "estimated_cost" integer,
  "latency_ms" integer,
  "status" text NOT NULL,
  "error_message" text,
  "conversation_id" uuid,
  "created_at" timestamp DEFAULT now() NOT NULL
);

-- 4. FOREIGN KEY CONSTRAINTS
ALTER TABLE "users" ADD CONSTRAINT "users_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "payment_methods" ADD CONSTRAINT "payment_methods_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "payment_methods" ADD CONSTRAINT "payment_methods_added_by_users_id_fk" FOREIGN KEY ("added_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_customer_id_companies_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "stripe_sync_logs" ADD CONSTRAINT "stripe_sync_logs_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "oauth_connections" ADD CONSTRAINT "oauth_connections_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_id_permissions_id_fk" FOREIGN KEY ("permission_id") REFERENCES "public"."permissions"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "user_invitations" ADD CONSTRAINT "user_invitations_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "user_invitations" ADD CONSTRAINT "user_invitations_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "user_invitations" ADD CONSTRAINT "user_invitations_invited_by_users_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "email_events" ADD CONSTRAINT "email_events_email_history_id_email_history_id_fk" FOREIGN KEY ("email_history_id") REFERENCES "public"."email_history"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "service_api_usage" ADD CONSTRAINT "service_api_usage_config_id_service_api_configs_id_fk" FOREIGN KEY ("config_id") REFERENCES "public"."service_api_configs"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "user_api_keys" ADD CONSTRAINT "user_api_keys_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "user_api_key_usage" ADD CONSTRAINT "user_api_key_usage_api_key_id_user_api_keys_id_fk" FOREIGN KEY ("api_key_id") REFERENCES "public"."user_api_keys"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "products" ADD CONSTRAINT "products_vat_rate_id_vat_rates_id_fk" FOREIGN KEY ("vat_rate_id") REFERENCES "public"."vat_rates"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "orders" ADD CONSTRAINT "orders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "orders" ADD CONSTRAINT "orders_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_order_item_id_order_items_id_fk" FOREIGN KEY ("order_item_id") REFERENCES "public"."order_items"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "coupons" ADD CONSTRAINT "coupons_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "coupon_usage" ADD CONSTRAINT "coupon_usage_coupon_id_coupons_id_fk" FOREIGN KEY ("coupon_id") REFERENCES "public"."coupons"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "coupon_usage" ADD CONSTRAINT "coupon_usage_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "coupon_usage" ADD CONSTRAINT "coupon_usage_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "carts" ADD CONSTRAINT "carts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_cart_id_carts_id_fk" FOREIGN KEY ("cart_id") REFERENCES "public"."carts"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "outlook_integrations" ADD CONSTRAINT "outlook_integrations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "product_leads" ADD CONSTRAINT "product_leads_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "product_leads" ADD CONSTRAINT "product_leads_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "system_logs" ADD CONSTRAINT "system_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "terms_of_service" ADD CONSTRAINT "terms_of_service_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "user_tos_acceptance" ADD CONSTRAINT "user_tos_acceptance_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "user_tos_acceptance" ADD CONSTRAINT "user_tos_acceptance_tos_id_terms_of_service_id_fk" FOREIGN KEY ("tos_id") REFERENCES "public"."terms_of_service"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "calendar_connections" ADD CONSTRAINT "calendar_connections_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "chat_conversations" ADD CONSTRAINT "chat_conversations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "chat_conversations" ADD CONSTRAINT "chat_conversations_assigned_admin_id_users_id_fk" FOREIGN KEY ("assigned_admin_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "chat_conversations" ADD CONSTRAINT "chat_conversations_closed_by_users_id_fk" FOREIGN KEY ("closed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_conversation_id_chat_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."chat_conversations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "chat_quick_responses" ADD CONSTRAINT "chat_quick_responses_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "llm_api_keys" ADD CONSTRAINT "llm_api_keys_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "llm_usage_logs" ADD CONSTRAINT "llm_usage_logs_key_id_llm_api_keys_id_fk" FOREIGN KEY ("key_id") REFERENCES "public"."llm_api_keys"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "llm_usage_logs" ADD CONSTRAINT "llm_usage_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "llm_usage_logs" ADD CONSTRAINT "llm_usage_logs_conversation_id_chat_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."chat_conversations"("id") ON DELETE set null ON UPDATE no action;

-- 5. INDEXES
CREATE INDEX idx_companies_email ON companies(email);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_company_id ON users(company_id);
CREATE INDEX idx_users_is_active ON users(is_active);
CREATE INDEX idx_roles_name ON roles(name);
CREATE INDEX idx_roles_scope ON roles(scope);
CREATE INDEX idx_permissions_name ON permissions(name);
CREATE INDEX idx_permissions_scope ON permissions(scope);
CREATE INDEX idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX idx_user_roles_role_id ON user_roles(role_id);
CREATE INDEX idx_role_permissions_role_id ON role_permissions(role_id);
CREATE INDEX idx_system_logs_category ON system_logs(category);
CREATE INDEX idx_system_logs_level ON system_logs(level);
CREATE INDEX idx_system_logs_created_at ON system_logs(created_at);
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_order_number ON orders(order_number);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_payment_status ON orders(payment_status);
CREATE INDEX idx_page_permissions_path ON page_permissions(path);
CREATE INDEX idx_page_permissions_access ON page_permissions(access);
CREATE INDEX idx_service_api_configs_service_name ON service_api_configs(service_name);
CREATE INDEX idx_service_api_configs_environment ON service_api_configs(environment);

-- 6. SEED: Roles
INSERT INTO roles (name, scope, description) VALUES
  ('reader',      'company',  'Read-only access to company data'),
  ('writer',      'company',  'Read and write access to company data'),
  ('admin',       'platform', 'Platform administrator'),
  ('super_admin', 'platform', 'Super administrator - full platform access')
ON CONFLICT (name) DO NOTHING;

-- 7. SEED: Permissions
INSERT INTO permissions (name, scope, description) VALUES
  ('read',            'company',  'View company data and analytics'),
  ('write',           'company',  'Create and update company data'),
  ('invite',          'company',  'Invite new users to the company'),
  ('manage_users',    'company',  'Manage users within the company'),
  ('manage_platform', 'platform', 'Manage platform settings and features'),
  ('manage_companies','platform', 'View and manage all companies'),
  ('manage_all_users','platform', 'Manage any user on the platform'),
  ('manage_admins',   'platform', 'Create and manage other administrators'),
  ('manage_emails',   'platform', 'Configure email providers and templates'),
  ('view_analytics',  'platform', 'Access platform-wide analytics and statistics')
ON CONFLICT (name) DO NOTHING;

-- 8. SEED: Role → Permission assignments
-- Reader: read only
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r CROSS JOIN permissions p
WHERE r.name = 'reader' AND p.name = 'read'
ON CONFLICT DO NOTHING;

-- Writer: all company permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r CROSS JOIN permissions p
WHERE r.name = 'writer' AND p.scope = 'company'
ON CONFLICT DO NOTHING;

-- Admin: all platform permissions except manage_admins
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r CROSS JOIN permissions p
WHERE r.name = 'admin' AND p.scope = 'platform' AND p.name != 'manage_admins'
ON CONFLICT DO NOTHING;

-- Super Admin: all platform permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r CROSS JOIN permissions p
WHERE r.name = 'super_admin' AND p.scope = 'platform'
ON CONFLICT DO NOTHING;

-- 9. SEED: Default VAT rate (France 20%)
INSERT INTO vat_rates (name, country, rate, description, is_default, is_active) VALUES
  ('France Standard', 'FR', 2000, 'TVA standard française à 20%', true, true),
  ('France Réduit',   'FR',  550, 'TVA réduite française à 5.5%', false, true),
  ('Exonéré',         'ALL',   0, 'Exonération de TVA', false, true)
ON CONFLICT DO NOTHING;

-- 10. SEED: Platform config defaults
INSERT INTO platform_config (key, value) VALUES
  ('site_name',      'NeoSaaS'),
  ('auth_enabled',   'true'),
  ('maintenance',    'false'),
  ('currency',       'EUR'),
  ('stripe_enabled', 'true')
ON CONFLICT (key) DO NOTHING;
