-- Migration 0002 : Unification Stripe — Suppression Lago
-- Date: 2026-02-18
-- Ajoute les colonnes Stripe sur appointments et subscriptions.
-- Supprime les colonnes Lago obsolètes (lago_invoice_id, lago_transaction_id,
-- lago_id, plan_code) qui n'existent plus dans db/schema.ts depuis le 16 fév. 2026.

--> statement-breakpoint
-- ── appointments : remplacer colonnes Lago par Stripe ───────────────────────
ALTER TABLE "appointments" ADD COLUMN IF NOT EXISTS "stripe_payment_intent_id" text;
--> statement-breakpoint
ALTER TABLE "appointments" DROP COLUMN IF EXISTS "lago_invoice_id";
--> statement-breakpoint
ALTER TABLE "appointments" DROP COLUMN IF EXISTS "lago_transaction_id";

--> statement-breakpoint
-- ── subscriptions : remplacer schéma Lago par schéma Stripe ─────────────────
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "stripe_subscription_id" text;
--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "stripe_price_id" text;
--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "current_period_start" timestamp;
--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "current_period_end" timestamp;
--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "cancel_at_period_end" boolean DEFAULT false;
--> statement-breakpoint
ALTER TABLE "subscriptions" DROP COLUMN IF EXISTS "lago_id";
--> statement-breakpoint
ALTER TABLE "subscriptions" DROP COLUMN IF EXISTS "plan_code";

--> statement-breakpoint
-- ── companies : supprimer colonne Lago obsolète ──────────────────────────────
ALTER TABLE "companies" DROP COLUMN IF EXISTS "lago_id";
