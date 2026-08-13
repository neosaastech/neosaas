ALTER TABLE "authors" ADD COLUMN "site_user_id" uuid;--> statement-breakpoint
ALTER TABLE "authors" ADD COLUMN "social_links" jsonb;--> statement-breakpoint
ALTER TABLE "authors" ADD COLUMN "show_bio_publicly" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "authors" ADD COLUMN "show_email_publicly" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "authors" ADD COLUMN "show_phone_publicly" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "authors" ADD COLUMN "show_social_links_publicly" boolean DEFAULT true NOT NULL;--> statement-breakpoint
-- Charles's deploy runs this against a per-tenant schema (neowebsite_dev /
-- neowebsite_prod) selected via search_path, not "public" — drizzle-kit's
-- default-generated FK hardcodes "public"."users", which doesn't exist in
-- this multi-tenant-schema-per-tenant setup. Unqualified so it resolves
-- against whatever schema is active in search_path at execution time, same
-- as every other unqualified reference already in this migration.
ALTER TABLE "authors" ADD CONSTRAINT "authors_site_user_id_users_id_fk" FOREIGN KEY ("site_user_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "authors_site_user_id_unique" ON "authors" USING btree ("site_user_id") WHERE site_user_id IS NOT NULL;