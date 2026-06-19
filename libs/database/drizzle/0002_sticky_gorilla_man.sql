CREATE TABLE "asset" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"created_by_user_id" text,
	"job_id" text,
	"stage_id" text,
	"template_id" text,
	"asset_type" text NOT NULL,
	"source_type" text NOT NULL,
	"storage_provider" text,
	"storage_key" text,
	"url" text,
	"mime_type" text,
	"file_size" numeric,
	"checksum" text,
	"duration_ms" integer,
	"width" integer,
	"height" integer,
	"status" text DEFAULT 'available' NOT NULL,
	"visibility" text DEFAULT 'private' NOT NULL,
	"metadata" jsonb,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "asset_usage" (
	"id" text PRIMARY KEY NOT NULL,
	"asset_id" text NOT NULL,
	"job_id" text,
	"template_id" text,
	"usage_type" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "credit_account" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"balance" numeric DEFAULT '0' NOT NULL,
	"frozen_balance" numeric DEFAULT '0' NOT NULL,
	"debt_balance" numeric DEFAULT '0' NOT NULL,
	"total_granted" numeric DEFAULT '0' NOT NULL,
	"total_consumed" numeric DEFAULT '0' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "credit_ledger" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"user_id" text,
	"job_id" text,
	"order_id" text,
	"type" text NOT NULL,
	"amount" numeric NOT NULL,
	"balance_after" numeric NOT NULL,
	"frozen_after" numeric NOT NULL,
	"debt_after" numeric NOT NULL,
	"description" text,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invite_code" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"workspace_id" text NOT NULL,
	"code" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invite_record" (
	"id" text PRIMARY KEY NOT NULL,
	"invite_code_id" text NOT NULL,
	"referrer_user_id" text NOT NULL,
	"referred_user_id" text NOT NULL,
	"referred_workspace_id" text NOT NULL,
	"status" text DEFAULT 'registered' NOT NULL,
	"referrer_bonus_credits" numeric DEFAULT '0' NOT NULL,
	"referred_bonus_credits" numeric DEFAULT '0' NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"rewarded_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "job" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"created_by_user_id" text NOT NULL,
	"template_id" text NOT NULL,
	"status" text DEFAULT 'queued' NOT NULL,
	"quality_status" text DEFAULT 'unchecked' NOT NULL,
	"priority" integer DEFAULT 0 NOT NULL,
	"input_params" jsonb NOT NULL,
	"normalized_params" jsonb,
	"estimated_credits" numeric DEFAULT '0' NOT NULL,
	"frozen_credits" numeric DEFAULT '0' NOT NULL,
	"actual_credits" numeric DEFAULT '0' NOT NULL,
	"debt_credits" numeric DEFAULT '0' NOT NULL,
	"settlement_status" text DEFAULT 'estimated' NOT NULL,
	"artifact_status" text DEFAULT 'generating' NOT NULL,
	"render_mp4_requested" boolean DEFAULT false NOT NULL,
	"locked_by" text,
	"locked_at" timestamp with time zone,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"last_error_code" text,
	"last_error_message" text,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "job_attempt" (
	"id" text PRIMARY KEY NOT NULL,
	"job_id" text NOT NULL,
	"attempt_no" integer NOT NULL,
	"trigger_type" text NOT NULL,
	"triggered_by_user_id" text,
	"worker_id" text,
	"status" text DEFAULT 'running' NOT NULL,
	"metadata" jsonb,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ended_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "job_event" (
	"id" text PRIMARY KEY NOT NULL,
	"job_id" text NOT NULL,
	"stage_id" text,
	"level" text DEFAULT 'info' NOT NULL,
	"event_type" text NOT NULL,
	"message" text NOT NULL,
	"data" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "job_quality_issue" (
	"id" text PRIMARY KEY NOT NULL,
	"job_id" text NOT NULL,
	"stage_id" text,
	"asset_id" text,
	"issue_type" text NOT NULL,
	"severity" text DEFAULT 'medium' NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "job_stage" (
	"id" text PRIMARY KEY NOT NULL,
	"job_id" text NOT NULL,
	"stage_code" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"input_snapshot" jsonb,
	"output_snapshot" jsonb,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"error_code" text,
	"error_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notification" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"user_id" text NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"body" text,
	"data" jsonb,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notification_delivery" (
	"id" text PRIMARY KEY NOT NULL,
	"notification_id" text NOT NULL,
	"channel" text NOT NULL,
	"recipient" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"provider" text,
	"error_message" text,
	"sent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pricing_change_log" (
	"id" text PRIMARY KEY NOT NULL,
	"pricing_item_id" text NOT NULL,
	"changed_by_user_id" text,
	"before" jsonb,
	"after" jsonb,
	"notice_status" text DEFAULT 'none' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pricing_item" (
	"id" text PRIMARY KEY NOT NULL,
	"resource_type" text NOT NULL,
	"provider" text NOT NULL,
	"model" text,
	"usage_unit" text NOT NULL,
	"provider_cost_unit_price" numeric DEFAULT '0' NOT NULL,
	"provider_cost_currency" text DEFAULT 'USD' NOT NULL,
	"credit_unit_price" numeric DEFAULT '0' NOT NULL,
	"min_credit_cost" numeric,
	"enabled" boolean DEFAULT true NOT NULL,
	"metadata" jsonb,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "provider_health_check" (
	"id" text PRIMARY KEY NOT NULL,
	"provider_profile_id" text NOT NULL,
	"status" text NOT NULL,
	"latency_ms" integer,
	"error_code" text,
	"error_message" text,
	"checked_by" text DEFAULT 'system' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "provider_profile" (
	"id" text PRIMARY KEY NOT NULL,
	"provider_type" text NOT NULL,
	"provider" text NOT NULL,
	"display_name" text NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"priority" integer DEFAULT 0 NOT NULL,
	"config" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "retention_policy" (
	"id" text PRIMARY KEY NOT NULL,
	"target_type" text NOT NULL,
	"scope" text DEFAULT 'default' NOT NULL,
	"retention_days" integer NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "safety_check" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"job_id" text,
	"stage_id" text,
	"target_type" text NOT NULL,
	"status" text NOT NULL,
	"matched_rules" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "safety_rule" (
	"id" text PRIMARY KEY NOT NULL,
	"rule_type" text NOT NULL,
	"category" text NOT NULL,
	"pattern" text NOT NULL,
	"severity" text NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "template" (
	"id" text PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"category" text,
	"cover_asset_id" text,
	"visibility" text DEFAULT 'public' NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"recommended" boolean DEFAULT false NOT NULL,
	"featured_order" integer,
	"landing_position" text,
	"builder_version" text,
	"input_schema" jsonb,
	"capability_requirements" jsonb,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "template_sample" (
	"id" text PRIMARY KEY NOT NULL,
	"template_id" text NOT NULL,
	"asset_id" text NOT NULL,
	"sample_type" text NOT NULL,
	"title" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "template_workspace_grant" (
	"id" text PRIMARY KEY NOT NULL,
	"template_id" text NOT NULL,
	"workspace_id" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"granted_by_user_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "usage_record" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"job_id" text,
	"stage_id" text,
	"asset_id" text,
	"resource_type" text NOT NULL,
	"provider" text NOT NULL,
	"model" text,
	"usage_amount" numeric NOT NULL,
	"usage_unit" text NOT NULL,
	"provider_cost_amount" numeric DEFAULT '0' NOT NULL,
	"provider_cost_currency" text DEFAULT 'USD' NOT NULL,
	"credit_cost" numeric DEFAULT '0' NOT NULL,
	"pricing_snapshot" jsonb,
	"raw_usage" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workspace" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"owner_user_id" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"settings" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workspace_member" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"user_id" text NOT NULL,
	"role" text DEFAULT 'member' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "asset" ADD CONSTRAINT "asset_workspace_id_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset" ADD CONSTRAINT "asset_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset" ADD CONSTRAINT "asset_template_id_template_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."template"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset_usage" ADD CONSTRAINT "asset_usage_asset_id_asset_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."asset"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset_usage" ADD CONSTRAINT "asset_usage_job_id_job_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."job"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset_usage" ADD CONSTRAINT "asset_usage_template_id_template_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."template"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_account" ADD CONSTRAINT "credit_account_workspace_id_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_ledger" ADD CONSTRAINT "credit_ledger_workspace_id_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_ledger" ADD CONSTRAINT "credit_ledger_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_ledger" ADD CONSTRAINT "credit_ledger_job_id_job_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."job"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_ledger" ADD CONSTRAINT "credit_ledger_order_id_order_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."order"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invite_code" ADD CONSTRAINT "invite_code_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invite_code" ADD CONSTRAINT "invite_code_workspace_id_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invite_record" ADD CONSTRAINT "invite_record_invite_code_id_invite_code_id_fk" FOREIGN KEY ("invite_code_id") REFERENCES "public"."invite_code"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invite_record" ADD CONSTRAINT "invite_record_referrer_user_id_user_id_fk" FOREIGN KEY ("referrer_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invite_record" ADD CONSTRAINT "invite_record_referred_user_id_user_id_fk" FOREIGN KEY ("referred_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invite_record" ADD CONSTRAINT "invite_record_referred_workspace_id_workspace_id_fk" FOREIGN KEY ("referred_workspace_id") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job" ADD CONSTRAINT "job_workspace_id_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job" ADD CONSTRAINT "job_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job" ADD CONSTRAINT "job_template_id_template_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."template"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_attempt" ADD CONSTRAINT "job_attempt_job_id_job_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."job"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_attempt" ADD CONSTRAINT "job_attempt_triggered_by_user_id_user_id_fk" FOREIGN KEY ("triggered_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_event" ADD CONSTRAINT "job_event_job_id_job_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."job"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_event" ADD CONSTRAINT "job_event_stage_id_job_stage_id_fk" FOREIGN KEY ("stage_id") REFERENCES "public"."job_stage"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_quality_issue" ADD CONSTRAINT "job_quality_issue_job_id_job_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."job"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_quality_issue" ADD CONSTRAINT "job_quality_issue_stage_id_job_stage_id_fk" FOREIGN KEY ("stage_id") REFERENCES "public"."job_stage"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_quality_issue" ADD CONSTRAINT "job_quality_issue_asset_id_asset_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."asset"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_stage" ADD CONSTRAINT "job_stage_job_id_job_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."job"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification" ADD CONSTRAINT "notification_workspace_id_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification" ADD CONSTRAINT "notification_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_delivery" ADD CONSTRAINT "notification_delivery_notification_id_notification_id_fk" FOREIGN KEY ("notification_id") REFERENCES "public"."notification"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pricing_change_log" ADD CONSTRAINT "pricing_change_log_pricing_item_id_pricing_item_id_fk" FOREIGN KEY ("pricing_item_id") REFERENCES "public"."pricing_item"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pricing_change_log" ADD CONSTRAINT "pricing_change_log_changed_by_user_id_user_id_fk" FOREIGN KEY ("changed_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_health_check" ADD CONSTRAINT "provider_health_check_provider_profile_id_provider_profile_id_fk" FOREIGN KEY ("provider_profile_id") REFERENCES "public"."provider_profile"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "safety_check" ADD CONSTRAINT "safety_check_workspace_id_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "safety_check" ADD CONSTRAINT "safety_check_job_id_job_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."job"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "safety_check" ADD CONSTRAINT "safety_check_stage_id_job_stage_id_fk" FOREIGN KEY ("stage_id") REFERENCES "public"."job_stage"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "template_sample" ADD CONSTRAINT "template_sample_template_id_template_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."template"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "template_sample" ADD CONSTRAINT "template_sample_asset_id_asset_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."asset"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "template_workspace_grant" ADD CONSTRAINT "template_workspace_grant_template_id_template_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."template"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "template_workspace_grant" ADD CONSTRAINT "template_workspace_grant_workspace_id_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "template_workspace_grant" ADD CONSTRAINT "template_workspace_grant_granted_by_user_id_user_id_fk" FOREIGN KEY ("granted_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usage_record" ADD CONSTRAINT "usage_record_workspace_id_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usage_record" ADD CONSTRAINT "usage_record_job_id_job_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."job"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usage_record" ADD CONSTRAINT "usage_record_stage_id_job_stage_id_fk" FOREIGN KEY ("stage_id") REFERENCES "public"."job_stage"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usage_record" ADD CONSTRAINT "usage_record_asset_id_asset_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."asset"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace" ADD CONSTRAINT "workspace_owner_user_id_user_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_member" ADD CONSTRAINT "workspace_member_workspace_id_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_member" ADD CONSTRAINT "workspace_member_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "asset_workspace_idx" ON "asset" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "asset_job_idx" ON "asset" USING btree ("job_id");--> statement-breakpoint
CREATE INDEX "asset_type_status_idx" ON "asset" USING btree ("asset_type","status");--> statement-breakpoint
CREATE INDEX "asset_usage_asset_idx" ON "asset_usage" USING btree ("asset_id");--> statement-breakpoint
CREATE UNIQUE INDEX "credit_account_workspace_idx" ON "credit_account" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "credit_ledger_workspace_created_idx" ON "credit_ledger" USING btree ("workspace_id","created_at");--> statement-breakpoint
CREATE INDEX "credit_ledger_job_idx" ON "credit_ledger" USING btree ("job_id");--> statement-breakpoint
CREATE INDEX "credit_ledger_order_idx" ON "credit_ledger" USING btree ("order_id");--> statement-breakpoint
CREATE UNIQUE INDEX "invite_code_code_idx" ON "invite_code" USING btree ("code");--> statement-breakpoint
CREATE INDEX "invite_code_user_idx" ON "invite_code" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "invite_record_referred_user_idx" ON "invite_record" USING btree ("referred_user_id");--> statement-breakpoint
CREATE INDEX "invite_record_referrer_idx" ON "invite_record" USING btree ("referrer_user_id");--> statement-breakpoint
CREATE INDEX "job_workspace_status_idx" ON "job" USING btree ("workspace_id","status");--> statement-breakpoint
CREATE INDEX "job_queue_idx" ON "job" USING btree ("status","priority","created_at");--> statement-breakpoint
CREATE INDEX "job_template_idx" ON "job" USING btree ("template_id");--> statement-breakpoint
CREATE UNIQUE INDEX "job_attempt_job_attempt_no_idx" ON "job_attempt" USING btree ("job_id","attempt_no");--> statement-breakpoint
CREATE INDEX "job_event_job_created_idx" ON "job_event" USING btree ("job_id","created_at");--> statement-breakpoint
CREATE INDEX "job_quality_issue_job_idx" ON "job_quality_issue" USING btree ("job_id");--> statement-breakpoint
CREATE UNIQUE INDEX "job_stage_job_stage_code_idx" ON "job_stage" USING btree ("job_id","stage_code");--> statement-breakpoint
CREATE INDEX "job_stage_job_sort_idx" ON "job_stage" USING btree ("job_id","sort_order");--> statement-breakpoint
CREATE INDEX "notification_user_created_idx" ON "notification" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "notification_workspace_created_idx" ON "notification" USING btree ("workspace_id","created_at");--> statement-breakpoint
CREATE INDEX "notification_delivery_notification_idx" ON "notification_delivery" USING btree ("notification_id");--> statement-breakpoint
CREATE INDEX "pricing_change_log_item_created_idx" ON "pricing_change_log" USING btree ("pricing_item_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "pricing_item_resource_provider_model_unit_idx" ON "pricing_item" USING btree ("resource_type","provider","model","usage_unit");--> statement-breakpoint
CREATE INDEX "provider_health_check_profile_created_idx" ON "provider_health_check" USING btree ("provider_profile_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "provider_profile_type_provider_idx" ON "provider_profile" USING btree ("provider_type","provider");--> statement-breakpoint
CREATE UNIQUE INDEX "retention_policy_target_scope_idx" ON "retention_policy" USING btree ("target_type","scope");--> statement-breakpoint
CREATE INDEX "safety_check_workspace_created_idx" ON "safety_check" USING btree ("workspace_id","created_at");--> statement-breakpoint
CREATE INDEX "safety_check_job_idx" ON "safety_check" USING btree ("job_id");--> statement-breakpoint
CREATE INDEX "safety_rule_enabled_category_idx" ON "safety_rule" USING btree ("enabled","category");--> statement-breakpoint
CREATE UNIQUE INDEX "template_code_idx" ON "template" USING btree ("code");--> statement-breakpoint
CREATE INDEX "template_status_visibility_idx" ON "template" USING btree ("status","visibility");--> statement-breakpoint
CREATE INDEX "template_sample_template_idx" ON "template_sample" USING btree ("template_id");--> statement-breakpoint
CREATE UNIQUE INDEX "template_workspace_grant_unique_idx" ON "template_workspace_grant" USING btree ("template_id","workspace_id");--> statement-breakpoint
CREATE INDEX "usage_record_workspace_created_idx" ON "usage_record" USING btree ("workspace_id","created_at");--> statement-breakpoint
CREATE INDEX "usage_record_job_idx" ON "usage_record" USING btree ("job_id");--> statement-breakpoint
CREATE INDEX "workspace_owner_user_idx" ON "workspace" USING btree ("owner_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "workspace_member_workspace_user_idx" ON "workspace_member" USING btree ("workspace_id","user_id");--> statement-breakpoint
CREATE INDEX "workspace_member_user_idx" ON "workspace_member" USING btree ("user_id");