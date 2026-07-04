ALTER TABLE "service_api_configs" ADD COLUMN "secret_backend" text DEFAULT 'database' NOT NULL;--> statement-breakpoint
ALTER TABLE "service_api_configs" ADD COLUMN "vault_path" text;