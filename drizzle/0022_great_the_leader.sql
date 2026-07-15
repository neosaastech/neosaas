ALTER TABLE "page_seo" ADD COLUMN "payload_page_id" integer;--> statement-breakpoint
CREATE INDEX "page_seo_payload_page_id_idx" ON "page_seo" USING btree ("payload_page_id");