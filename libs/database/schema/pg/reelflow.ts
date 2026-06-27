import { InferInsertModel, InferSelectModel } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { user } from "./user";
import { order } from "./order";

export const workspace = pgTable("workspace", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  ownerUserId: text("owner_user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  status: text("status").notNull().default("active"),
  settings: jsonb("settings"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("workspace_owner_user_idx").on(table.ownerUserId),
]);

export const workspaceMember = pgTable("workspace_member", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull().references(() => workspace.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  role: text("role").notNull().default("member"),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex("workspace_member_workspace_user_idx").on(table.workspaceId, table.userId),
  index("workspace_member_user_idx").on(table.userId),
]);

export const creditAccount = pgTable("credit_account", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull().references(() => workspace.id, { onDelete: "cascade" }),
  balance: numeric("balance").notNull().default("0"),
  frozenBalance: numeric("frozen_balance").notNull().default("0"),
  debtBalance: numeric("debt_balance").notNull().default("0"),
  totalGranted: numeric("total_granted").notNull().default("0"),
  totalConsumed: numeric("total_consumed").notNull().default("0"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex("credit_account_workspace_idx").on(table.workspaceId),
]);

export const template = pgTable("template", {
  id: text("id").primaryKey(),
  code: text("code").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  category: text("category"),
  coverAssetId: text("cover_asset_id"),
  visibility: text("visibility").notNull().default("public"),
  status: text("status").notNull().default("draft"),
  recommended: boolean("recommended").notNull().default(false),
  featuredOrder: integer("featured_order"),
  landingPosition: text("landing_position"),
  builderVersion: text("builder_version"),
  inputSchema: jsonb("input_schema"),
  outputSchema: jsonb("output_schema"),
  capabilityRequirements: jsonb("capability_requirements"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex("template_code_idx").on(table.code),
  index("template_status_visibility_idx").on(table.status, table.visibility),
]);

export const asset = pgTable("asset", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull().references(() => workspace.id, { onDelete: "cascade" }),
  createdByUserId: text("created_by_user_id").references(() => user.id, { onDelete: "set null" }),
  jobId: text("job_id"),
  stageId: text("stage_id"),
  templateId: text("template_id").references(() => template.id, { onDelete: "set null" }),
  assetType: text("asset_type").notNull(),
  sourceType: text("source_type").notNull(),
  storageProvider: text("storage_provider"),
  storageKey: text("storage_key"),
  url: text("url"),
  mimeType: text("mime_type"),
  fileSize: numeric("file_size"),
  checksum: text("checksum"),
  durationMs: integer("duration_ms"),
  width: integer("width"),
  height: integer("height"),
  status: text("status").notNull().default("available"),
  visibility: text("visibility").notNull().default("private"),
  metadata: jsonb("metadata"),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("asset_workspace_idx").on(table.workspaceId),
  index("asset_job_idx").on(table.jobId),
  index("asset_type_status_idx").on(table.assetType, table.status),
]);

// Versioned recipe snapshots for a template. Agents publish recipes here; the
// template's builderVersion points at the current published version. Jobs lock
// the version they ran with; rollback flips which version is published.
export const templateVersion = pgTable("template_version", {
  id: text("id").primaryKey(),
  templateCode: text("template_code").notNull(),
  version: text("version").notNull(),
  structureId: text("structure_id").notNull(),
  // Full VideoRecipe JSON (the portable, executable source of truth).
  recipe: jsonb("recipe").notNull(),
  status: text("status").notNull().default("draft"), // draft | published | archived
  changelog: text("changelog"),
  createdByUserId: text("created_by_user_id").references(() => user.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  publishedAt: timestamp("published_at", { withTimezone: true }),
}, (table) => [
  uniqueIndex("template_version_code_version_idx").on(table.templateCode, table.version),
  index("template_version_code_status_idx").on(table.templateCode, table.status),
]);

export const templateWorkspaceGrant = pgTable("template_workspace_grant", {
  id: text("id").primaryKey(),
  templateId: text("template_id").notNull().references(() => template.id, { onDelete: "cascade" }),
  workspaceId: text("workspace_id").notNull().references(() => workspace.id, { onDelete: "cascade" }),
  status: text("status").notNull().default("active"),
  grantedByUserId: text("granted_by_user_id").references(() => user.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex("template_workspace_grant_unique_idx").on(table.templateId, table.workspaceId),
]);

export const templateSample = pgTable("template_sample", {
  id: text("id").primaryKey(),
  templateId: text("template_id").notNull().references(() => template.id, { onDelete: "cascade" }),
  assetId: text("asset_id").notNull().references(() => asset.id, { onDelete: "cascade" }),
  sampleType: text("sample_type").notNull(),
  title: text("title"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("template_sample_template_idx").on(table.templateId),
]);

export const job = pgTable("job", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull().references(() => workspace.id, { onDelete: "cascade" }),
  createdByUserId: text("created_by_user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  templateId: text("template_id").notNull().references(() => template.id, { onDelete: "restrict" }),
  status: text("status").notNull().default("queued"),
  qualityStatus: text("quality_status").notNull().default("unchecked"),
  priority: integer("priority").notNull().default(0),
  inputParams: jsonb("input_params").notNull(),
  normalizedParams: jsonb("normalized_params"),
  estimatedCredits: numeric("estimated_credits").notNull().default("0"),
  frozenCredits: numeric("frozen_credits").notNull().default("0"),
  actualCredits: numeric("actual_credits").notNull().default("0"),
  debtCredits: numeric("debt_credits").notNull().default("0"),
  settlementStatus: text("settlement_status").notNull().default("estimated"),
  artifactStatus: text("artifact_status").notNull().default("generating"),
  renderMp4Requested: boolean("render_mp4_requested").notNull().default(false),
  lockedBy: text("locked_by"),
  lockedAt: timestamp("locked_at", { withTimezone: true }),
  attemptCount: integer("attempt_count").notNull().default(0),
  lastErrorCode: text("last_error_code"),
  lastErrorMessage: text("last_error_message"),
  startedAt: timestamp("started_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("job_workspace_status_idx").on(table.workspaceId, table.status),
  index("job_queue_idx").on(table.status, table.priority, table.createdAt),
  index("job_template_idx").on(table.templateId),
]);

export const jobStage = pgTable("job_stage", {
  id: text("id").primaryKey(),
  jobId: text("job_id").notNull().references(() => job.id, { onDelete: "cascade" }),
  stageCode: text("stage_code").notNull(),
  status: text("status").notNull().default("pending"),
  sortOrder: integer("sort_order").notNull().default(0),
  attemptCount: integer("attempt_count").notNull().default(0),
  inputSnapshot: jsonb("input_snapshot"),
  outputSnapshot: jsonb("output_snapshot"),
  startedAt: timestamp("started_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  errorCode: text("error_code"),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex("job_stage_job_stage_code_idx").on(table.jobId, table.stageCode),
  index("job_stage_job_sort_idx").on(table.jobId, table.sortOrder),
]);

export const jobAttempt = pgTable("job_attempt", {
  id: text("id").primaryKey(),
  jobId: text("job_id").notNull().references(() => job.id, { onDelete: "cascade" }),
  attemptNo: integer("attempt_no").notNull(),
  triggerType: text("trigger_type").notNull(),
  triggeredByUserId: text("triggered_by_user_id").references(() => user.id, { onDelete: "set null" }),
  workerId: text("worker_id"),
  status: text("status").notNull().default("running"),
  metadata: jsonb("metadata"),
  startedAt: timestamp("started_at", { withTimezone: true }).defaultNow().notNull(),
  endedAt: timestamp("ended_at", { withTimezone: true }),
}, (table) => [
  uniqueIndex("job_attempt_job_attempt_no_idx").on(table.jobId, table.attemptNo),
]);

export const jobEvent = pgTable("job_event", {
  id: text("id").primaryKey(),
  jobId: text("job_id").notNull().references(() => job.id, { onDelete: "cascade" }),
  stageId: text("stage_id").references(() => jobStage.id, { onDelete: "set null" }),
  level: text("level").notNull().default("info"),
  eventType: text("event_type").notNull(),
  message: text("message").notNull(),
  data: jsonb("data"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("job_event_job_created_idx").on(table.jobId, table.createdAt),
]);

export const jobQualityIssue = pgTable("job_quality_issue", {
  id: text("id").primaryKey(),
  jobId: text("job_id").notNull().references(() => job.id, { onDelete: "cascade" }),
  stageId: text("stage_id").references(() => jobStage.id, { onDelete: "set null" }),
  assetId: text("asset_id").references(() => asset.id, { onDelete: "set null" }),
  issueType: text("issue_type").notNull(),
  severity: text("severity").notNull().default("medium"),
  status: text("status").notNull().default("open"),
  message: text("message"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("job_quality_issue_job_idx").on(table.jobId),
]);

export const usageRecord = pgTable("usage_record", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull().references(() => workspace.id, { onDelete: "cascade" }),
  jobId: text("job_id").references(() => job.id, { onDelete: "set null" }),
  stageId: text("stage_id").references(() => jobStage.id, { onDelete: "set null" }),
  assetId: text("asset_id").references(() => asset.id, { onDelete: "set null" }),
  resourceType: text("resource_type").notNull(),
  provider: text("provider").notNull(),
  model: text("model"),
  usageAmount: numeric("usage_amount").notNull(),
  usageUnit: text("usage_unit").notNull(),
  providerCostAmount: numeric("provider_cost_amount").notNull().default("0"),
  providerCostCurrency: text("provider_cost_currency").notNull().default("USD"),
  creditCost: numeric("credit_cost").notNull().default("0"),
  pricingSnapshot: jsonb("pricing_snapshot"),
  rawUsage: jsonb("raw_usage"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("usage_record_workspace_created_idx").on(table.workspaceId, table.createdAt),
  index("usage_record_job_idx").on(table.jobId),
]);

export const creditLedger = pgTable("credit_ledger", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull().references(() => workspace.id, { onDelete: "cascade" }),
  userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
  jobId: text("job_id").references(() => job.id, { onDelete: "set null" }),
  orderId: text("order_id").references(() => order.id, { onDelete: "set null" }),
  type: text("type").notNull(),
  amount: numeric("amount").notNull(),
  balanceAfter: numeric("balance_after").notNull(),
  frozenAfter: numeric("frozen_after").notNull(),
  debtAfter: numeric("debt_after").notNull(),
  description: text("description"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("credit_ledger_workspace_created_idx").on(table.workspaceId, table.createdAt),
  index("credit_ledger_job_idx").on(table.jobId),
  index("credit_ledger_order_idx").on(table.orderId),
]);

// Per-grant credit lots: each grant is a bucket with a source and an optional
// expiry. Spend consumes lots FIFO by expiry; expired lots have their unspent
// `remaining` swept out of the account balance. `creditAccount.balance` stays
// the cached spendable total = sum of active (non-expired) lot remaining.
export const creditLot = pgTable("credit_lot", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull().references(() => workspace.id, { onDelete: "cascade" }),
  userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
  orderId: text("order_id").references(() => order.id, { onDelete: "set null" }),
  // 'subscription' | 'purchase' | 'invite' | 'bonus' | 'adjustment' | 'trial'
  source: text("source").notNull(),
  originalAmount: numeric("original_amount").notNull(),
  remaining: numeric("remaining").notNull(),
  // null = never expires
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  // 'active' | 'consumed' | 'expired'
  status: text("status").notNull().default("active"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("credit_lot_workspace_active_idx").on(table.workspaceId, table.status, table.expiresAt),
  index("credit_lot_order_idx").on(table.orderId),
]);

export const assetUsage = pgTable("asset_usage", {
  id: text("id").primaryKey(),
  assetId: text("asset_id").notNull().references(() => asset.id, { onDelete: "cascade" }),
  jobId: text("job_id").references(() => job.id, { onDelete: "set null" }),
  templateId: text("template_id").references(() => template.id, { onDelete: "set null" }),
  usageType: text("usage_type").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("asset_usage_asset_idx").on(table.assetId),
]);

export const pricingItem = pgTable("pricing_item", {
  id: text("id").primaryKey(),
  resourceType: text("resource_type").notNull(),
  provider: text("provider").notNull(),
  model: text("model"),
  usageUnit: text("usage_unit").notNull(),
  providerCostUnitPrice: numeric("provider_cost_unit_price").notNull().default("0"),
  providerCostCurrency: text("provider_cost_currency").notNull().default("USD"),
  creditUnitPrice: numeric("credit_unit_price").notNull().default("0"),
  minCreditCost: numeric("min_credit_cost"),
  enabled: boolean("enabled").notNull().default(true),
  metadata: jsonb("metadata"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex("pricing_item_resource_provider_model_unit_idx").on(
    table.resourceType,
    table.provider,
    table.model,
    table.usageUnit,
  ),
]);

export const pricingChangeLog = pgTable("pricing_change_log", {
  id: text("id").primaryKey(),
  pricingItemId: text("pricing_item_id").notNull().references(() => pricingItem.id, { onDelete: "cascade" }),
  changedByUserId: text("changed_by_user_id").references(() => user.id, { onDelete: "set null" }),
  before: jsonb("before"),
  after: jsonb("after"),
  noticeStatus: text("notice_status").notNull().default("none"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("pricing_change_log_item_created_idx").on(table.pricingItemId, table.createdAt),
]);

export const providerProfile = pgTable("provider_profile", {
  id: text("id").primaryKey(),
  providerType: text("provider_type").notNull(),
  provider: text("provider").notNull(),
  displayName: text("display_name").notNull(),
  enabled: boolean("enabled").notNull().default(true),
  priority: integer("priority").notNull().default(0),
  config: jsonb("config"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex("provider_profile_type_provider_idx").on(table.providerType, table.provider),
]);

export const providerHealthCheck = pgTable("provider_health_check", {
  id: text("id").primaryKey(),
  providerProfileId: text("provider_profile_id").notNull().references(() => providerProfile.id, { onDelete: "cascade" }),
  status: text("status").notNull(),
  latencyMs: integer("latency_ms"),
  errorCode: text("error_code"),
  errorMessage: text("error_message"),
  checkedBy: text("checked_by").notNull().default("system"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("provider_health_check_profile_created_idx").on(table.providerProfileId, table.createdAt),
]);

export const notification = pgTable("notification", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull().references(() => workspace.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  title: text("title").notNull(),
  body: text("body"),
  data: jsonb("data"),
  readAt: timestamp("read_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("notification_user_created_idx").on(table.userId, table.createdAt),
  index("notification_workspace_created_idx").on(table.workspaceId, table.createdAt),
]);

export const notificationDelivery = pgTable("notification_delivery", {
  id: text("id").primaryKey(),
  notificationId: text("notification_id").notNull().references(() => notification.id, { onDelete: "cascade" }),
  channel: text("channel").notNull(),
  recipient: text("recipient").notNull(),
  status: text("status").notNull().default("pending"),
  provider: text("provider"),
  errorMessage: text("error_message"),
  sentAt: timestamp("sent_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("notification_delivery_notification_idx").on(table.notificationId),
]);

export const inviteCode = pgTable("invite_code", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  workspaceId: text("workspace_id").notNull().references(() => workspace.id, { onDelete: "cascade" }),
  code: text("code").notNull(),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex("invite_code_code_idx").on(table.code),
  index("invite_code_user_idx").on(table.userId),
]);

export const inviteRecord = pgTable("invite_record", {
  id: text("id").primaryKey(),
  inviteCodeId: text("invite_code_id").notNull().references(() => inviteCode.id, { onDelete: "cascade" }),
  referrerUserId: text("referrer_user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  referredUserId: text("referred_user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  referredWorkspaceId: text("referred_workspace_id").notNull().references(() => workspace.id, { onDelete: "cascade" }),
  status: text("status").notNull().default("registered"),
  referrerBonusCredits: numeric("referrer_bonus_credits").notNull().default("0"),
  referredBonusCredits: numeric("referred_bonus_credits").notNull().default("0"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  rewardedAt: timestamp("rewarded_at", { withTimezone: true }),
}, (table) => [
  uniqueIndex("invite_record_referred_user_idx").on(table.referredUserId),
  index("invite_record_referrer_idx").on(table.referrerUserId),
]);

export const safetyRule = pgTable("safety_rule", {
  id: text("id").primaryKey(),
  ruleType: text("rule_type").notNull(),
  category: text("category").notNull(),
  pattern: text("pattern").notNull(),
  severity: text("severity").notNull(),
  enabled: boolean("enabled").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("safety_rule_enabled_category_idx").on(table.enabled, table.category),
]);

export const safetyCheck = pgTable("safety_check", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull().references(() => workspace.id, { onDelete: "cascade" }),
  jobId: text("job_id").references(() => job.id, { onDelete: "set null" }),
  stageId: text("stage_id").references(() => jobStage.id, { onDelete: "set null" }),
  targetType: text("target_type").notNull(),
  status: text("status").notNull(),
  matchedRules: jsonb("matched_rules"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("safety_check_workspace_created_idx").on(table.workspaceId, table.createdAt),
  index("safety_check_job_idx").on(table.jobId),
]);

export const retentionPolicy = pgTable("retention_policy", {
  id: text("id").primaryKey(),
  targetType: text("target_type").notNull(),
  scope: text("scope").notNull().default("default"),
  retentionDays: integer("retention_days").notNull(),
  enabled: boolean("enabled").notNull().default(true),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex("retention_policy_target_scope_idx").on(table.targetType, table.scope),
]);

export type Workspace = InferSelectModel<typeof workspace>;
export type NewWorkspace = InferInsertModel<typeof workspace>;
export type WorkspaceMember = InferSelectModel<typeof workspaceMember>;
export type NewWorkspaceMember = InferInsertModel<typeof workspaceMember>;
export type CreditAccount = InferSelectModel<typeof creditAccount>;
export type NewCreditAccount = InferInsertModel<typeof creditAccount>;
export type CreditLedger = InferSelectModel<typeof creditLedger>;
export type NewCreditLedger = InferInsertModel<typeof creditLedger>;
export type Template = InferSelectModel<typeof template>;
export type NewTemplate = InferInsertModel<typeof template>;
export type Asset = InferSelectModel<typeof asset>;
export type NewAsset = InferInsertModel<typeof asset>;
export type Job = InferSelectModel<typeof job>;
export type NewJob = InferInsertModel<typeof job>;
export type JobStage = InferSelectModel<typeof jobStage>;
export type NewJobStage = InferInsertModel<typeof jobStage>;
export type UsageRecord = InferSelectModel<typeof usageRecord>;
export type NewUsageRecord = InferInsertModel<typeof usageRecord>;
