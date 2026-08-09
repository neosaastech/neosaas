CREATE TABLE "content_sync_issues" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source" text NOT NULL,
	"path" text NOT NULL,
	"locale" text DEFAULT 'fr' NOT NULL,
	"title" text,
	"message" text NOT NULL,
	"payload_doc_id" text,
	"resolved_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "content_sync_issues_source_path_locale_unique" ON "content_sync_issues" USING btree ("source","path","locale");