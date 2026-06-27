import { db } from '@libs/database';
import { asset, job, template } from '@libs/database/schema';
import { and, desc, eq, ilike, ne, or, sql } from 'drizzle-orm';

export const PERSONAL_ASSET_TYPES = new Set(['image', 'logo', 'avatar', 'reference_image']);
const PERSONAL_SOURCE_TYPES = new Set(['uploaded', 'ai_generated']);

export type ListWorkspaceAssetsInput = {
  workspaceId: string;
  source?: 'all' | 'task' | 'personal';
  assetType?: string;
  query?: string;
  limit?: number;
};

export type RegisterUploadedAssetInput = {
  workspaceId: string;
  userId: string;
  assetType?: string;
  storageProvider?: string;
  storageKey?: string;
  url?: string;
  mimeType?: string;
  fileSize?: number | null;
  displayName?: string;
  originalName?: string;
  width?: number | null;
  height?: number | null;
};

export type RegisterGeneratedAssetInput = {
  workspaceId: string;
  userId: string;
  /** Link the asset to the producing job/stage so it shows under the task. */
  jobId?: string;
  stageId?: string;
  assetType: string;
  sourceType: 'ai_generated' | 'generated';
  storageProvider?: string;
  storageKey?: string;
  url?: string;
  mimeType?: string;
  fileSize?: number | null;
  width?: number | null;
  height?: number | null;
  durationMs?: number | null;
  metadata?: Record<string, unknown>;
};

export type ArchiveUploadedAssetInput = {
  workspaceId: string;
  assetId: string;
};

export class AssetValidationError extends Error {
  constructor(
    message: string,
    public readonly code: 'invalid_asset_type' | 'missing_location' | 'not_found' | 'read_only_asset',
  ) {
    super(message);
    this.name = 'AssetValidationError';
  }
}

export async function listWorkspaceAssets(input: ListWorkspaceAssetsInput) {
  const source = input.source || 'all';
  const assetType = normalizeText(input.assetType);
  const query = normalizeText(input.query);
  const limit = Math.min(Math.max(input.limit || 60, 1), 100);

  const conditions = [eq(asset.workspaceId, input.workspaceId), ne(asset.status, 'archived')];
  if (source === 'task') conditions.push(eq(asset.sourceType, 'generated'));
  if (source === 'personal') conditions.push(or(eq(asset.sourceType, 'uploaded'), eq(asset.sourceType, 'ai_generated'))!);
  if (assetType && assetType !== 'all') conditions.push(eq(asset.assetType, assetType));
  if (query) {
    conditions.push(
      or(
        ilike(asset.id, `%${query}%`),
        ilike(job.id, `%${query}%`),
        ilike(asset.storageKey, `%${query}%`),
        ilike(asset.url, `%${query}%`),
        ilike(asset.mimeType, `%${query}%`),
        sql`${asset.metadata}::text ilike ${`%${query}%`}`,
        ilike(template.name, `%${query}%`),
      )!,
    );
  }

  const rows = await db
    .select({
      id: asset.id,
      jobId: asset.jobId,
      stageId: asset.stageId,
      templateId: asset.templateId,
      templateName: template.name,
      jobStatus: job.status,
      assetType: asset.assetType,
      sourceType: asset.sourceType,
      storageProvider: asset.storageProvider,
      storageKey: asset.storageKey,
      url: asset.url,
      mimeType: asset.mimeType,
      fileSize: asset.fileSize,
      durationMs: asset.durationMs,
      status: asset.status,
      visibility: asset.visibility,
      metadata: asset.metadata,
      expiresAt: asset.expiresAt,
      createdAt: asset.createdAt,
      updatedAt: asset.updatedAt,
    })
    .from(asset)
    .leftJoin(job, eq(asset.jobId, job.id))
    .leftJoin(template, eq(asset.templateId, template.id))
    .where(and(...conditions))
    .orderBy(desc(asset.createdAt))
    .limit(limit);

  return rows.map((item) => ({
    ...item,
    fileSize: item.fileSize ? Number(item.fileSize) : null,
    durationMs: item.durationMs ? Number(item.durationMs) : null,
  }));
}

export async function registerUploadedAsset(input: RegisterUploadedAssetInput) {
  const assetType = normalizeText(input.assetType) || 'reference_image';
  const storageProvider = normalizeText(input.storageProvider);
  const storageKey = normalizeText(input.storageKey);
  const url = normalizeText(input.url);
  const mimeType = normalizeText(input.mimeType);
  const displayName = normalizeText(input.displayName);
  const originalName = normalizeText(input.originalName);

  if (!PERSONAL_ASSET_TYPES.has(assetType)) {
    throw new AssetValidationError('Invalid personal asset type', 'invalid_asset_type');
  }
  if (!url && !storageKey) {
    throw new AssetValidationError('Asset URL or storage key is required', 'missing_location');
  }

  const [created] = await db
    .insert(asset)
    .values({
      id: crypto.randomUUID(),
      workspaceId: input.workspaceId,
      createdByUserId: input.userId,
      assetType,
      sourceType: 'uploaded',
      storageProvider: storageProvider || null,
      storageKey: storageKey || null,
      url: url || null,
      mimeType: mimeType || null,
      fileSize: input.fileSize === null || input.fileSize === undefined ? null : input.fileSize.toString(),
      width: input.width || null,
      height: input.height || null,
      status: 'available',
      visibility: 'private',
      metadata: {
        displayName: displayName || storageKey || url,
        originalName,
        registeredFrom: 'reelflow_asset_library',
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning();

  return created;
}

export async function registerGeneratedAsset(input: RegisterGeneratedAssetInput) {
  const url = normalizeText(input.url);
  const storageKey = normalizeText(input.storageKey);
  if (!url && !storageKey) {
    throw new AssetValidationError('Asset URL or storage key is required', 'missing_location');
  }

  const [created] = await db
    .insert(asset)
    .values({
      id: crypto.randomUUID(),
      workspaceId: input.workspaceId,
      createdByUserId: input.userId,
      jobId: normalizeText(input.jobId) || null,
      stageId: normalizeText(input.stageId) || null,
      assetType: input.assetType,
      sourceType: input.sourceType,
      storageProvider: normalizeText(input.storageProvider) || null,
      storageKey: storageKey || null,
      url: url || null,
      mimeType: normalizeText(input.mimeType) || null,
      fileSize: input.fileSize === null || input.fileSize === undefined ? null : input.fileSize.toString(),
      width: input.width || null,
      height: input.height || null,
      durationMs: input.durationMs || null,
      status: 'available',
      visibility: 'private',
      metadata: input.metadata ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning();

  return created;
}

export async function archiveUploadedAsset(input: ArchiveUploadedAssetInput) {
  const [existing] = await db
    .select({
      id: asset.id,
      sourceType: asset.sourceType,
      status: asset.status,
    })
    .from(asset)
    .where(and(eq(asset.id, input.assetId), eq(asset.workspaceId, input.workspaceId)))
    .limit(1);

  if (!existing || existing.status === 'archived') {
    throw new AssetValidationError('Asset not found', 'not_found');
  }
  if (!PERSONAL_SOURCE_TYPES.has(existing.sourceType)) {
    throw new AssetValidationError('Task output assets are read-only', 'read_only_asset');
  }

  const [updated] = await db
    .update(asset)
    .set({
      status: 'archived',
      updatedAt: new Date(),
    })
    .where(and(eq(asset.id, input.assetId), eq(asset.workspaceId, input.workspaceId)))
    .returning({
      id: asset.id,
      status: asset.status,
      updatedAt: asset.updatedAt,
    });

  return updated;
}

function normalizeText(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}
