ALTER TABLE "blog_posts" ADD COLUMN "translation_group_id" uuid;--> statement-breakpoint
CREATE INDEX "blog_posts_translation_group_id_idx" ON "blog_posts" USING btree ("translation_group_id");