CREATE TABLE "template_version" (
	"id" text PRIMARY KEY NOT NULL,
	"template_code" text NOT NULL,
	"version" text NOT NULL,
	"structure_id" text NOT NULL,
	"recipe" jsonb NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"changelog" text,
	"created_by_user_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"published_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "template_version" ADD CONSTRAINT "template_version_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "template_version_code_version_idx" ON "template_version" USING btree ("template_code","version");--> statement-breakpoint
CREATE INDEX "template_version_code_status_idx" ON "template_version" USING btree ("template_code","status");