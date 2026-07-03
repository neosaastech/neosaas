CREATE TABLE "page_layers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"page_path" text NOT NULL,
	"position" integer NOT NULL,
	"layer_type" text NOT NULL,
	"props" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "stripe_invoice_id" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "invoice_pdf" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "hosted_invoice_url" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "tax_amount" integer;