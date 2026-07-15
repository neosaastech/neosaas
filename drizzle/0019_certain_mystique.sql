CREATE TABLE "module_overrides" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"scope_type" text NOT NULL,
	"scope_value" text NOT NULL,
	"anchor_key" text NOT NULL,
	"config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "module_overrides_scope_anchor_unique" ON "module_overrides" USING btree ("scope_type","scope_value","anchor_key");