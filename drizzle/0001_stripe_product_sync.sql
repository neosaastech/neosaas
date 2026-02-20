-- Migration: Add Stripe product sync columns to products table
-- These columns store Stripe Product & Price IDs for each NeoSaaS product
-- Required for the product-Stripe synchronization pipeline (v1.2.0)

ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "stripe_product_id" text;
--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "stripe_price_one_time" text;
--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "stripe_price_weekly" text;
--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "stripe_price_monthly" text;
--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "stripe_price_yearly" text;
