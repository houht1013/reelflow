import { reelflowConfig } from '@config';

export type CloudRenderInput = {
  jobId: string;
  workspaceId: string;
  templateId: string;
  draftPackageStorageKey: string;
  durationSeconds?: number;
};

export type CloudRenderResult = {
  provider: string;
  model: string;
  videoUrl: string | null;
  storageKey: string | null;
  mimeType: string;
  width: number;
  height: number;
  durationMs: number | null;
  mock: boolean;
  metadata: Record<string, unknown>;
};

type CloudRenderApiResponse = {
  videoUrl?: string;
  url?: string;
  storageKey?: string;
  durationMs?: number;
  metadata?: Record<string, unknown>;
};

export async function renderCloudMp4(input: CloudRenderInput): Promise<CloudRenderResult> {
  const provider = reelflowConfig.cloudRender.provider;
  const model = reelflowConfig.cloudRender.model;
  const endpoint = reelflowConfig.cloudRender.endpoint;
  const apiKey = reelflowConfig.cloudRender.apiKey;
  const durationMs = input.durationSeconds ? input.durationSeconds * 1000 : null;

  if (process.env.REELFLOW_CLOUD_RENDER_MOCK_FAIL === '1') {
    throw new Error('Mock cloud render failed');
  }

  if (!endpoint || !apiKey || reelflowConfig.cloudRender.mock) {
    return {
      provider: 'mock-cloud-render',
      model,
      videoUrl: `https://mock.reelflow.local/rendered/${input.jobId}.mp4`,
      storageKey: `mock/rendered/${input.jobId}.mp4`,
      mimeType: 'video/mp4',
      width: 1080,
      height: 1920,
      durationMs,
      mock: true,
      metadata: {
        mode: 'mock',
        spec: 'mp4-1080p',
        note: 'Mock cloud render result for local MVP verification.',
      },
    };
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      jobId: input.jobId,
      workspaceId: input.workspaceId,
      templateId: input.templateId,
      draftPackageStorageKey: input.draftPackageStorageKey,
      output: {
        format: 'mp4',
        width: 1080,
        height: 1920,
        profile: 'mp4-1080p',
      },
    }),
  });

  if (!response.ok) {
    const message = await response.text().catch(() => '');
    throw new Error(`Cloud render failed: ${response.status}${message ? ` ${message.slice(0, 200)}` : ''}`);
  }

  const payload = (await response.json()) as CloudRenderApiResponse;
  const videoUrl = normalizeText(payload.videoUrl || payload.url);
  const storageKey = normalizeText(payload.storageKey);
  if (!videoUrl && !storageKey) {
    throw new Error('Cloud render response must include videoUrl or storageKey');
  }

  return {
    provider,
    model,
    videoUrl: videoUrl || null,
    storageKey: storageKey || null,
    mimeType: 'video/mp4',
    width: 1080,
    height: 1920,
    durationMs: typeof payload.durationMs === 'number' && Number.isFinite(payload.durationMs) ? payload.durationMs : durationMs,
    mock: false,
    metadata: {
      ...(payload.metadata || {}),
      spec: 'mp4-1080p',
    },
  };
}

function normalizeText(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}
