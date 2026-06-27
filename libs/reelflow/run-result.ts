// Assemble the standardized TemplateRunResult envelope (执行上下文 + 产物素材) from
// a persisted job row + its produced assets. This is the canonical, read-side
// builder consumers (API / result page) use — the runtime already records the
// status / credits / timestamps / assets; this just maps them to the contract.
import type { OutputAsset, TemplateOutputType, TemplateRunResult, TemplateRunStatus } from './templates/_sdk/types';

type RunResultJob = {
  id: string;
  templateCode: string;
  status: string;
  actualCredits: string | number | null;
  startedAt: string | Date | null;
  completedAt: string | Date | null;
  lastErrorCode?: string | null;
  lastErrorMessage?: string | null;
};

type RunResultAsset = {
  assetType: string;
  url: string | null;
  mimeType?: string | null;
  fileSize?: string | number | null;
  durationMs?: number | null;
  width?: number | null;
  height?: number | null;
};

const TERMINAL: Record<string, TemplateRunStatus> = { completed: 'succeeded', failed: 'failed' };

function ms(value: string | Date | null): number | null {
  if (!value) return null;
  const t = value instanceof Date ? value.getTime() : new Date(value).getTime();
  return Number.isFinite(t) ? t : null;
}

function assetOutputType(assetType: string, mime?: string | null): TemplateOutputType {
  if (assetType === 'draft_package' || assetType === 'draft') return 'draft';
  if (mime?.startsWith('video/')) return 'video';
  if (mime?.startsWith('audio/')) return 'audio';
  if (mime?.startsWith('image/')) return 'image';
  return 'image';
}

/** Build the envelope, or null while the job is not yet terminal. */
export function buildTemplateRunResult(job: RunResultJob, assets: RunResultAsset[]): TemplateRunResult | null {
  const status = TERMINAL[job.status];
  if (!status) return null;

  const startedMs = ms(job.startedAt);
  const finishedMs = ms(job.completedAt);
  const durationMs = startedMs != null && finishedMs != null ? Math.max(0, finishedMs - startedMs) : 0;

  const outAssets: OutputAsset[] = assets
    .filter((a) => a.url)
    .map((a) => ({
      key: a.assetType,
      type: assetOutputType(a.assetType, a.mimeType),
      url: a.url ?? undefined,
      mimeType: a.mimeType ?? undefined,
      sizeBytes: a.fileSize != null && a.fileSize !== '' ? Number(a.fileSize) : undefined,
      durationMs: a.durationMs ?? undefined,
      width: a.width ?? undefined,
      height: a.height ?? undefined,
    }));

  return {
    jobId: job.id,
    templateCode: job.templateCode,
    status,
    startedAt: job.startedAt ? new Date(job.startedAt).toISOString() : '',
    finishedAt: job.completedAt ? new Date(job.completedAt).toISOString() : '',
    durationMs,
    creditsConsumed: Math.round(Number(job.actualCredits ?? 0) * 100) / 100,
    error: status === 'failed' ? { code: job.lastErrorCode || 'error', message: job.lastErrorMessage || '' } : undefined,
    assets: outAssets,
  };
}
