CREATE TABLE "categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"path" text NOT NULL,
	"locale" text DEFAULT 'fr' NOT NULL,
	"name" text NOT NULL,
	"header_image_url" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "page_seo" ADD COLUMN "header_image_url" text;--> statement-breakpoint
CREATE UNIQUE INDEX "categories_path_locale_unique" ON "categories" USING btree ("path","locale");