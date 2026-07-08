CREATE TABLE "page_seo" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"page_path" text NOT NULL,
	"locale" text DEFAULT 'fr' NOT NULL,
	"meta_title" text,
	"meta_description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "blog_posts" ADD COLUMN "meta_title" text;--> statement-breakpoint
ALTER TABLE "blog_posts" ADD COLUMN "meta_description" text;--> statement-breakpoint
CREATE UNIQUE INDEX "page_seo_path_locale_unique" ON "page_seo" USING btree ("page_path","locale");