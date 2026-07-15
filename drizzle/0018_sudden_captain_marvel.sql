CREATE TABLE "footer_overrides" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"scope_type" text NOT NULL,
	"scope_value" text NOT NULL,
	"config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "header_overrides" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"scope_type" text NOT NULL,
	"scope_value" text NOT NULL,
	"config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "page_seo" ADD COLUMN "category_path" text;--> statement-breakpoint
CREATE UNIQUE INDEX "footer_overrides_scope_unique" ON "footer_overrides" USING btree ("scope_type","scope_value");--> statement-breakpoint
CREATE UNIQUE INDEX "header_overrides_scope_unique" ON "header_overrides" USING btree ("scope_type","scope_value");