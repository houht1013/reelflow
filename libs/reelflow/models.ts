// Model management service — admin-managed AI models + access points, the source
// of truth for provider config at runtime (env is the fallback). One row per
// model (aiModel); pricing lives on the model (per_call / per_token / per_time).
import { and, asc, desc, eq } from 'drizzle-orm';
import { db } from '@libs/database';
import { aiModel } from '@libs/database/schema';

export type AiModelCategory = 'text' | 'image' | 'video' | 'audio';
export type PricingMode = 'per_call' | 'per_token' | 'per_time';

export type AiModelInput = {
  category: AiModelCategory;
  code: string;
  displayName: string;
  provider: string;
  protocol: string;
  baseUrl?: string | null;
  apiKey?: string | null;
  modelId?: string | null;
  enabled?: boolean;
  isDefault?: boolean;
  priority?: number;
  config?: Record<string, unknown> | null;
  pricingMode?: PricingMode;
  creditUnitPrice?: number;
  pricingUnit?: string | null;
  minCreditCost?: number | null;
  metadata?: Record<string, unknown> | null;
};

export type ResolvedAiModel = {
  id: string;
  category: AiModelCategory;
  code: string;
  displayName: string;
  provider: string;
  protocol: string;
  baseUrl: string | null;
  apiKey: string | null;
  modelId: string | null;
  config: Record<string, unknown> | null;
  pricingMode: PricingMode;
  creditUnitPrice: number;
  pricingUnit: string | null;
  minCreditCost: number | null;
};

function toResolved(row: typeof aiModel.$inferSelect): ResolvedAiModel {
  return {
    id: row.id,
    category: row.category as AiModelCategory,
    code: row.code,
    displayName: row.displayName,
    provider: row.provider,
    protocol: row.protocol,
    baseUrl: row.baseUrl,
    apiKey: row.apiKey,
    modelId: row.modelId,
    config: (row.config as Record<string, unknown> | null) ?? null,
    pricingMode: row.pricingMode as PricingMode,
    creditUnitPrice: Number(row.creditUnitPrice ?? 0),
    pricingUnit: row.pricingUnit,
    minCreditCost: row.minCreditCost != null ? Number(row.minCreditCost) : null,
  };
}

/** Active model for a category: enabled, default first, then priority. null if none. */
export async function resolveActiveModel(category: AiModelCategory): Promise<ResolvedAiModel | null> {
  const [row] = await db
    .select()
    .from(aiModel)
    .where(and(eq(aiModel.category, category), eq(aiModel.enabled, true)))
    .orderBy(desc(aiModel.isDefault), desc(aiModel.priority), asc(aiModel.createdAt))
    .limit(1);
  return row ? toResolved(row) : null;
}

/** Admin-facing row with the secret masked (never return the raw key to clients). */
export function maskModel(row: typeof aiModel.$inferSelect) {
  const { apiKey, ...rest } = row;
  return { ...rest, hasApiKey: Boolean(apiKey), apiKeyMasked: apiKey ? `${apiKey.slice(0, 3)}…${apiKey.slice(-4)}` : null };
}

export async function listModels(category?: AiModelCategory) {
  const rows = category
    ? await db.select().from(aiModel).where(eq(aiModel.category, category)).orderBy(asc(aiModel.category), desc(aiModel.priority))
    : await db.select().from(aiModel).orderBy(asc(aiModel.category), desc(aiModel.priority));
  return rows.map(maskModel);
}

export async function getModel(id: string) {
  const [row] = await db.select().from(aiModel).where(eq(aiModel.id, id)).limit(1);
  return row ? maskModel(row) : null;
}

async function clearDefaults(category: string, exceptId?: string) {
  const rows = await db.select({ id: aiModel.id }).from(aiModel).where(and(eq(aiModel.category, category), eq(aiModel.isDefault, true)));
  for (const r of rows) {
    if (r.id === exceptId) continue;
    await db.update(aiModel).set({ isDefault: false, updatedAt: new Date() }).where(eq(aiModel.id, r.id));
  }
}

export async function createModel(input: AiModelInput) {
  const id = crypto.randomUUID();
  if (input.isDefault) await clearDefaults(input.category);
  await db.insert(aiModel).values({
    id,
    category: input.category,
    code: input.code,
    displayName: input.displayName,
    provider: input.provider,
    protocol: input.protocol,
    baseUrl: input.baseUrl ?? null,
    apiKey: input.apiKey ?? null,
    modelId: input.modelId ?? null,
    enabled: input.enabled ?? true,
    isDefault: input.isDefault ?? false,
    priority: input.priority ?? 100,
    config: input.config ?? null,
    pricingMode: input.pricingMode ?? 'per_call',
    creditUnitPrice: String(input.creditUnitPrice ?? 0),
    pricingUnit: input.pricingUnit ?? null,
    minCreditCost: input.minCreditCost != null ? String(input.minCreditCost) : null,
    metadata: input.metadata ?? null,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  return getModel(id);
}

export async function updateModel(id: string, patch: Partial<AiModelInput>) {
  const [existing] = await db.select().from(aiModel).where(eq(aiModel.id, id)).limit(1);
  if (!existing) return null;
  const category = patch.category ?? existing.category;
  if (patch.isDefault) await clearDefaults(category, id);
  const set: Record<string, unknown> = { updatedAt: new Date() };
  if (patch.category !== undefined) set.category = patch.category;
  if (patch.code !== undefined) set.code = patch.code;
  if (patch.displayName !== undefined) set.displayName = patch.displayName;
  if (patch.provider !== undefined) set.provider = patch.provider;
  if (patch.protocol !== undefined) set.protocol = patch.protocol;
  if (patch.baseUrl !== undefined) set.baseUrl = patch.baseUrl;
  // Only overwrite the key when a non-empty value is supplied (keep existing otherwise).
  if (patch.apiKey) set.apiKey = patch.apiKey;
  if (patch.modelId !== undefined) set.modelId = patch.modelId;
  if (patch.enabled !== undefined) set.enabled = patch.enabled;
  if (patch.isDefault !== undefined) set.isDefault = patch.isDefault;
  if (patch.priority !== undefined) set.priority = patch.priority;
  if (patch.config !== undefined) set.config = patch.config;
  if (patch.pricingMode !== undefined) set.pricingMode = patch.pricingMode;
  if (patch.creditUnitPrice !== undefined) set.creditUnitPrice = String(patch.creditUnitPrice);
  if (patch.pricingUnit !== undefined) set.pricingUnit = patch.pricingUnit;
  if (patch.minCreditCost !== undefined) set.minCreditCost = patch.minCreditCost != null ? String(patch.minCreditCost) : null;
  if (patch.metadata !== undefined) set.metadata = patch.metadata;
  await db.update(aiModel).set(set).where(eq(aiModel.id, id));
  return getModel(id);
}

export async function deleteModel(id: string) {
  await db.delete(aiModel).where(eq(aiModel.id, id));
}

export async function setDefaultModel(id: string) {
  const [row] = await db.select().from(aiModel).where(eq(aiModel.id, id)).limit(1);
  if (!row) return null;
  await clearDefaults(row.category, id);
  await db.update(aiModel).set({ isDefault: true, enabled: true, updatedAt: new Date() }).where(eq(aiModel.id, id));
  return getModel(id);
}
