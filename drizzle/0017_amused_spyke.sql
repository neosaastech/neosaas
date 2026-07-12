ALTER TABLE "blog_posts" ADD COLUMN "no_index" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "blog_posts" ADD COLUMN "no_follow" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "page_seo" ADD COLUMN "no_index" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "page_seo" ADD COLUMN "no_follow" boolean DEFAULT false NOT NULL;