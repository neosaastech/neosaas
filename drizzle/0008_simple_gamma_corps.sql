CREATE TABLE "blog_posts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"locale" text DEFAULT 'fr' NOT NULL,
	"title" text NOT NULL,
	"excerpt" text,
	"cover_image_url" text,
	"author_name" text,
	"body_html" text DEFAULT '' NOT NULL,
	"category_slug" text,
	"category_path" text,
	"published_at" timestamp,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "blog_posts_slug_unique" UNIQUE("slug")
);
