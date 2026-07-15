DROP INDEX "footer_overrides_scope_unique";--> statement-breakpoint
DROP INDEX "header_overrides_scope_unique";--> statement-breakpoint
DROP INDEX "module_overrides_scope_anchor_unique";--> statement-breakpoint
ALTER TABLE "footer_overrides" ADD COLUMN "locale" text DEFAULT 'fr' NOT NULL;--> statement-breakpoint
ALTER TABLE "header_overrides" ADD COLUMN "locale" text DEFAULT 'fr' NOT NULL;--> statement-breakpoint
ALTER TABLE "module_overrides" ADD COLUMN "locale" text DEFAULT 'fr' NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "footer_overrides_scope_locale_unique" ON "footer_overrides" USING btree ("scope_type","scope_value","locale");--> statement-breakpoint
CREATE UNIQUE INDEX "header_overrides_scope_locale_unique" ON "header_overrides" USING btree ("scope_type","scope_value","locale");--> statement-breakpoint
CREATE UNIQUE INDEX "module_overrides_scope_anchor_locale_unique" ON "module_overrides" USING btree ("scope_type","scope_value","anchor_key","locale");