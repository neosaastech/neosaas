CREATE TABLE "pilot_actions_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_user_id" uuid,
	"actor_type" text DEFAULT 'human' NOT NULL,
	"actions" jsonb NOT NULL,
	"result" text NOT NULL,
	"errors" jsonb,
	"dry_run" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "pilot_actions_log" ADD CONSTRAINT "pilot_actions_log_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;