import { reelflowConfig } from '@config';
import { db } from '@libs/database';
import {
  job,
  providerHealthCheck,
  providerProfile,
  safetyCheck,
  safetyRule,
  workspace,
} from '@libs/database/schema';
import { and, desc, eq, inArray, or, sql } from 'drizzle-orm';

export type ReelflowPreflightErrorCode =
  | 'workspace_inactive'
  | 'queue_limit_exceeded'
  | 'provider_unavailable'
  | 'provider_disabled'
  | 'content_blocked';

export type ReelflowPreflightIssue = {
  code: ReelflowPreflightErrorCode;
  message: string;
  target?: string;
  metadata?: Record<string, unknown>;
};

export type ReelflowPreflightResult = {
  ok: boolean;
  errors: ReelflowPreflightIssue[];
  warnings: ReelflowPreflightIssue[];
};

type TemplateForPreflight = {
  id: string;
  code: string;
  capabilityRequirements: unknown;
};

type SafetyMatch = {
  category: string;
  severity: string;
  pattern: string;
  targetKey: string;
};

export class ReelflowPreflightError extends Error {
  result: ReelflowPreflightResult;

  constructor(result: ReelflowPreflightResult) {
    super(result.errors[0]?.message || 'Reelflow preflight failed');
    this.name = 'ReelflowPreflightError';
    this.result = result;
  }
}

export async function runJobPreflight(input: {
  workspaceId: string;
  userId: string;
  template: TemplateForPreflight;
  inputParams: Record<string, unknown>;
  renderMp4Requested?: boolean;
}): Promise<ReelflowPreflightResult> {
  const errors: ReelflowPreflightIssue[] = [];
  const warnings: ReelflowPreflightIssue[] = [];

  const [workspaceRow] = await db
    .select({ id: workspace.id, status: workspace.status, settings: workspace.settings })
    .from(workspace)
    .where(eq(workspace.id, input.workspaceId))
    .limit(1);

  if (!workspaceRow || workspaceRow.status !== 'active') {
    errors.push({
      code: 'workspace_inactive',
      message: 'Workspace is not active. Contact support before creating new tasks.',
      target: 'workspace',
    });
  }

  const queueLimit = resolveWorkspaceLimit(
    workspaceRow?.settings,
    'queueLimit',
    reelflowConfig.worker.workspaceDefaultQueueLimit,
  );
  const [queuedCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(job)
    .where(and(eq(job.workspaceId, input.workspaceId), or(eq(job.status, 'queued'), eq(job.status, 'running'))));

  if ((queuedCount?.count || 0) >= queueLimit) {
    errors.push({
      code: 'queue_limit_exceeded',
      message: `You already have ${queuedCount?.count || 0} active tasks. Please wait for one to finish before starting another.`,
      target: 'workspace.queue',
      metadata: { queueLimit, activeTasks: queuedCount?.count || 0 },
    });
  }

  const providerErrors = await checkProviderRequirements(input.template, Boolean(input.renderMp4Requested));
  errors.push(...providerErrors);

  const safetyResult = await checkInputSafety({
    workspaceId: input.workspaceId,
    inputParams: input.inputParams,
  });
  errors.push(...safetyResult.errors);
  warnings.push(...safetyResult.warnings);

  return { ok: errors.length === 0, errors, warnings };
}

export async function assertJobPreflight(input: Parameters<typeof runJobPreflight>[0]) {
  const result = await runJobPreflight(input);
  if (!result.ok) throw new ReelflowPreflightError(result);
  return result;
}

function resolveWorkspaceLimit(settings: unknown, key: string, fallback: number) {
  if (!settings || typeof settings !== 'object') return fallback;
  const value = (settings as Record<string, unknown>)[key];
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : fallback;
}

function parseCapabilities(template: TemplateForPreflight, renderMp4Requested: boolean) {
  const raw = Array.isArray(template.capabilityRequirements) ? template.capabilityRequirements : [];
  const capabilities = new Set(raw.filter((item): item is string => typeof item === 'string'));
  if (renderMp4Requested) capabilities.add('render');
  return Array.from(capabilities);
}

async function checkProviderRequirements(template: TemplateForPreflight, renderMp4Requested: boolean) {
  const requiredTypes = parseCapabilities(template, renderMp4Requested);
  if (requiredTypes.length === 0) return [];

  const profiles = await db
    .select({
      id: providerProfile.id,
      providerType: providerProfile.providerType,
      provider: providerProfile.provider,
      displayName: providerProfile.displayName,
      enabled: providerProfile.enabled,
    })
    .from(providerProfile)
    .where(inArray(providerProfile.providerType, requiredTypes));

  const profileIds = profiles.map((profile) => profile.id);
  const healthRows = profileIds.length
    ? await db
        .select({
          providerProfileId: providerHealthCheck.providerProfileId,
          status: providerHealthCheck.status,
          errorMessage: providerHealthCheck.errorMessage,
          createdAt: providerHealthCheck.createdAt,
        })
        .from(providerHealthCheck)
        .where(inArray(providerHealthCheck.providerProfileId, profileIds))
        .orderBy(desc(providerHealthCheck.createdAt))
    : [];

  const latestHealth = new Map<string, (typeof healthRows)[number]>();
  for (const row of healthRows) {
    if (!latestHealth.has(row.providerProfileId)) latestHealth.set(row.providerProfileId, row);
  }

  const errors: ReelflowPreflightIssue[] = [];
  for (const requiredType of requiredTypes) {
    const candidates = profiles.filter((profile) => profile.providerType === requiredType);
    if (candidates.length === 0) {
      errors.push({
        code: 'provider_unavailable',
        message: `Required ${requiredType} provider is not configured.`,
        target: `provider.${requiredType}`,
      });
      continue;
    }

    const enabledCandidates = candidates.filter((profile) => profile.enabled);
    if (enabledCandidates.length === 0) {
      errors.push({
        code: 'provider_disabled',
        message: `Required ${requiredType} provider is disabled.`,
        target: `provider.${requiredType}`,
      });
      continue;
    }

    const available = enabledCandidates.some((profile) => latestHealth.get(profile.id)?.status !== 'unavailable');
    if (!available) {
      const latest = latestHealth.get(enabledCandidates[0].id);
      errors.push({
        code: 'provider_unavailable',
        message: latest?.errorMessage || `Required ${requiredType} provider is temporarily unavailable.`,
        target: `provider.${requiredType}`,
      });
    }
  }

  return errors;
}

async function checkInputSafety(input: {
  workspaceId: string;
  inputParams: Record<string, unknown>;
}) {
  const rows = await db
    .select({
      category: safetyRule.category,
      severity: safetyRule.severity,
      pattern: safetyRule.pattern,
      ruleType: safetyRule.ruleType,
    })
    .from(safetyRule)
    .where(eq(safetyRule.enabled, true));

  const rules =
    rows.length > 0
      ? rows
      : reelflowConfig.safety.defaultBlockedKeywords.map((keyword) => ({
          category: 'policy',
          severity: 'block',
          pattern: keyword,
          ruleType: 'keyword',
        }));

  const matches: SafetyMatch[] = [];
  const textFields = Object.entries(flattenInputParams(input.inputParams));
  for (const [targetKey, value] of textFields) {
    for (const rule of rules) {
      if (isRuleMatched(rule.ruleType, rule.pattern, value)) {
        matches.push({
          category: rule.category,
          severity: rule.severity,
          pattern: rule.pattern,
          targetKey,
        });
      }
    }
  }

  if (matches.length > 0) {
    const status = matches.some((match) => match.severity === 'block') ? 'blocked' : 'warned';
    await db.insert(safetyCheck).values({
      id: crypto.randomUUID(),
      workspaceId: input.workspaceId,
      targetType: 'input',
      status,
      matchedRules: matches,
      createdAt: new Date(),
    });
  }

  const errors = matches
    .filter((match) => match.severity === 'block')
    .map((match) => ({
      code: 'content_blocked' as const,
      message: 'Your input contains content that cannot be used for this workflow. Please revise it and try again.',
      target: `input.${match.targetKey}`,
      metadata: { category: match.category },
    }));
  const warnings = matches
    .filter((match) => match.severity !== 'block')
    .map((match) => ({
      code: 'content_blocked' as const,
      message: 'Your input may need review before generation.',
      target: `input.${match.targetKey}`,
      metadata: { category: match.category },
    }));

  return { errors, warnings };
}

function flattenInputParams(inputParams: Record<string, unknown>) {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(inputParams)) {
    if (typeof value === 'string') result[key] = value;
    else if (typeof value === 'number' || typeof value === 'boolean') result[key] = String(value);
  }
  return result;
}

function isRuleMatched(ruleType: string, pattern: string, value: string) {
  if (!value.trim()) return false;

  if (ruleType === 'regex') {
    try {
      return new RegExp(pattern, 'i').test(value);
    } catch {
      return false;
    }
  }

  return value.toLowerCase().includes(pattern.toLowerCase());
}
