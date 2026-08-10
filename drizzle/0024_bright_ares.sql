ALTER TABLE "blog_posts" ADD COLUMN "payload_post_id" integer;--> statement-breakpoint
ALTER TABLE "categories" ADD COLUMN "payload_category_id" integer;--> statement-breakpoint
CREATE UNIQUE INDEX "blog_posts_payload_post_id_unique" ON "blog_posts" USING btree ("payload_post_id") WHERE payload_post_id IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "categories_payload_category_id_locale_unique" ON "categories" USING btree ("payload_category_id","locale") WHERE payload_category_id IS NOT NULL;