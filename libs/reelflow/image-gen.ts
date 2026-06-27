// Reelflow image atomic capability — OpenAI-compatible /v1/images/generations
// (gpt-image-2). Used by the worker image stage (one image per storyboard shot)
// and reusable by tooling. Billing + usage metering go through provider-runtime.
import { reelflowConfig } from '@config';
import { registerGeneratedAsset } from './assets';
import { resolveActiveModel, type ResolvedAiModel } from './models';
import {
  ProviderCallError,
  chargeCredits,
  fetchWithRetry,
  meterUsage,
  refundCredits,
  resolveProviderPricing,
  type ProviderBillingMode,
} from './provider-runtime';

export type ReelflowImageInput = {
  workspaceId: string;
  userId: string;
  prompt: string;
  /** Optional reference image (base64 / data URL) — switches to image-to-image (edits). */
  referenceImage?: string;
  size?: string;
  quality?: 'low' | 'medium' | 'high' | 'auto';
  format?: 'png' | 'jpeg' | 'webp';
  model?: string;
  /**
   * Upload the image to object storage and return a public http URL instead of a
   * data URL. Required for the worker draft flow (capcut-mate rejects data URLs).
   * Defaults to config `ai.image.host`.
   */
  host?: boolean;
  /** Defaults to 'meter-only' (worker/job flow). Use 'charge' for standalone tools. */
  billing?: ProviderBillingMode;
  ledgerType?: string;
  description?: string;
  displayName?: string;
  jobId?: string;
  stageId?: string;
  /** Extra asset metadata, e.g. { shotId, sceneIndex } for storyboard-driven shots. */
  assetMetadata?: Record<string, unknown>;
};

export type ReelflowImageResult = {
  asset: {
    id: string;
    assetType: string;
    sourceType: string;
    url: string | null;
    mimeType: string | null;
    metadata: unknown;
    createdAt: Date;
  };
  image: { imageUrl: string; width: number; height: number; provider: string; model: string; mock: boolean; hosted: boolean; storageKey: string | null };
  credits: { consumed: number; balanceAfter: number } | null;
};

// 1x1 transparent PNG for mock/dev runs.
const MOCK_PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAFgwJ/lYgS5wAAAABJRU5ErkJggg==';

function parseSize(size: string): { width: number; height: number } {
  const match = size.match(/^(\d+)\s*[x×]\s*(\d+)$/i);
  if (match) return { width: Number(match[1]), height: Number(match[2]) };
  return { width: 1024, height: 1024 };
}

function mimeFromBase64(b64: string): string {
  if (b64.startsWith('/9j/')) return 'image/jpeg';
  if (b64.startsWith('iVBOR')) return 'image/png';
  if (b64.startsWith('R0lGOD')) return 'image/gif';
  if (b64.startsWith('UklGR')) return 'image/webp';
  return 'image/png';
}

function estimateBase64FileSize(b64: string): number {
  return Math.round((b64.length * 3) / 4);
}

// Upload bytes to object storage and return a public (or presigned) http URL.
async function hostImageBuffer(buffer: Buffer, mimeType: string): Promise<{ url: string; key: string }> {
  const { storage } = await import('@libs/storage');
  const ext = (mimeType.split('/')[1] || 'png').replace('jpeg', 'jpg');
  const fileName = `${crypto.randomUUID()}.${ext}`;
  const uploaded = await storage.uploadFile({
    file: buffer,
    fileName,
    contentType: mimeType,
    folder: reelflowConfig.ai.image.hostFolder,
  });
  // Public mode: use the bucket object URL (needs a public-read bucket/CDN).
  if (reelflowConfig.ai.image.urlMode === 'public' && uploaded.url) {
    return { url: uploaded.url, key: uploaded.key };
  }
  // Signed mode (or no public URL available): presigned GET URL for private buckets.
  const signed = await storage.generateSignedUrl({
    key: uploaded.key,
    operation: 'get',
    expiresIn: reelflowConfig.ai.image.signedUrlTtl,
  });
  return { url: signed.url, key: uploaded.key };
}

function decodeBase64Image(value: string): { bytes: Buffer; mime: string } {
  const match = value.match(/^data:([^;]+);base64,(.*)$/s);
  const mime = match ? match[1] : 'image/png';
  const b64 = match ? match[2] : value;
  return { bytes: Buffer.from(b64, 'base64'), mime };
}

async function callImageProvider(input: {
  prompt: string;
  model: string;
  size: string;
  quality: string;
  format: string;
  referenceImage?: string;
  db?: ResolvedAiModel | null;
}): Promise<{ b64: string; mock: boolean }> {
  const cfg = reelflowConfig.ai.image;
  const { mock, timeoutMs, maxAttempts } = cfg;
  // DB model overrides env when present.
  const baseUrl = input.db?.baseUrl || cfg.baseUrl;
  const apiKey = input.db?.apiKey || cfg.apiKey;
  const dbConfig = (input.db?.config ?? {}) as Record<string, unknown>;
  const outputFormat = (dbConfig.output_format as string) ?? cfg.outputFormat;
  const watermark = (dbConfig.watermark as boolean) ?? cfg.watermark;
  const sequentialImageGeneration = (dbConfig.sequential_image_generation as string) ?? cfg.sequentialImageGeneration;
  const flavor =
    cfg.flavor ||
    (input.db?.protocol === 'seedream' || input.db?.protocol === 'openai-image'
      ? (input.db.protocol === 'seedream' ? 'seedream' : 'openai')
      : input.model.toLowerCase().includes('seedream') ? 'seedream' : 'openai');

  if (input.prompt.includes('__reelflow_mock_fail__')) {
    throw new Error('Mock image generation failed');
  }

  if (!apiKey || mock) {
    return { b64: MOCK_PNG, mock: true };
  }

  let response: Response;
  if (input.referenceImage) {
    // Image-to-image: OpenAI-compatible /v1/images/edits (multipart) with the reference.
    const { bytes, mime } = decodeBase64Image(input.referenceImage);
    const ext = (mime.split('/')[1] || 'png').replace('jpeg', 'jpg');
    const form = new FormData();
    form.append('model', input.model);
    form.append('prompt', input.prompt);
    form.append('n', '1');
    form.append('size', input.size);
    form.append('quality', input.quality);
    form.append('image', new Blob([new Uint8Array(bytes)], { type: mime }), `reference.${ext}`);
    response = await fetchWithRetry(
      `${baseUrl}/v1/images/edits`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}` },
        body: form,
      },
      { timeoutMs, attempts: maxAttempts, breakerKey: 'image' },
    );
  } else {
    response = await fetchWithRetry(
      `${baseUrl}/v1/images/generations`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(
          flavor === 'seedream'
            ? {
                model: input.model,
                prompt: input.prompt,
                size: input.size,
                output_format: outputFormat,
                watermark,
                sequential_image_generation: sequentialImageGeneration,
              }
            : {
                model: input.model,
                prompt: input.prompt,
                n: 1,
                size: input.size,
                quality: input.quality,
                format: input.format,
              },
        ),
      },
      { timeoutMs, attempts: maxAttempts, breakerKey: 'image' },
    );
  }

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(`Image provider error: ${response.status} ${errorText.slice(0, 500)}`);
  }

  const data = (await response.json()) as { data?: Array<{ b64_json?: string; url?: string }> };
  const b64 = data.data?.[0]?.b64_json;
  if (!b64) {
    const url = data.data?.[0]?.url;
    if (url) {
      // Some gateways return a URL instead of base64 — fetch and inline it.
      const imgResp = await fetch(url);
      if (!imgResp.ok) throw new Error(`Failed to fetch generated image URL: ${imgResp.status}`);
      const buffer = Buffer.from(await imgResp.arrayBuffer());
      return { b64: buffer.toString('base64'), mock: false };
    }
    throw new Error('Image provider returned no image data');
  }
  return { b64, mock: false };
}

export async function generateReelflowImage(input: ReelflowImageInput): Promise<ReelflowImageResult> {
  const prompt = input.prompt.trim();
  if (!prompt) {
    throw new ProviderCallError('Image prompt is required', 'invalid_input', 400);
  }

  // Admin-managed model (DB) is the source of truth; env is the fallback.
  const dbModel = await resolveActiveModel('image').catch(() => null);
  const provider = dbModel?.provider || reelflowConfig.ai.image.provider;
  const model = dbModel?.modelId || input.model || reelflowConfig.ai.image.model;
  const size = input.size || '1024x1024';
  const quality = input.quality || 'low';
  const format = input.format || 'png';
  const billing = input.billing ?? 'meter-only';

  const pricing = await resolveProviderPricing({
    resourceType: 'image',
    provider,
    model,
    amount: 1,
    fallbackCreditCost: 8,
  });

  // Image cost is known up front; charge before the call and refund on failure.
  let charge: { ledgerId: string; balanceAfter: number } | null = null;
  if (billing === 'charge') {
    charge = await chargeCredits({
      workspaceId: input.workspaceId,
      userId: input.userId,
      amount: pricing.creditCost,
      ledgerType: input.ledgerType ?? 'ai_image_generation',
      description: input.description ?? 'AI image generation',
      metadata: { provider, model, prompt: prompt.slice(0, 200), pricingSnapshot: pricing.snapshot },
    });
  }

  const shouldHost = (input.host ?? reelflowConfig.ai.image.host);

  let generated: { b64: string; mock: boolean };
  let mimeType: string;
  let imageUrl: string;
  let storageKey: string | null = null;
  let hosted = false;
  try {
    generated = await callImageProvider({ prompt, model, size, quality, format, referenceImage: input.referenceImage, db: dbModel });
    mimeType = mimeFromBase64(generated.b64);
    imageUrl = `data:${mimeType};base64,${generated.b64}`;
    if (shouldHost && !generated.mock) {
      const uploaded = await hostImageBuffer(Buffer.from(generated.b64, 'base64'), mimeType);
      imageUrl = uploaded.url;
      storageKey = uploaded.key;
      hosted = true;
    }
  } catch (error) {
    if (charge) {
      await refundCredits({
        workspaceId: input.workspaceId,
        userId: input.userId,
        amount: pricing.creditCost,
        description: 'Refund failed AI image generation',
        metadata: { provider, model, error: error instanceof Error ? error.message : 'unknown' },
      });
    }
    throw new ProviderCallError(
      error instanceof Error ? error.message : 'Image generation failed',
      'generation_failed',
      502,
    );
  }

  const { width, height } = parseSize(size);

  const asset = await registerGeneratedAsset({
    workspaceId: input.workspaceId,
    userId: input.userId,
    assetType: 'image',
    sourceType: 'ai_generated',
    storageProvider: hosted ? 'object-storage' : provider,
    storageKey: storageKey || undefined,
    url: imageUrl,
    mimeType,
    fileSize: estimateBase64FileSize(generated.b64),
    width,
    height,
    metadata: {
      displayName: input.displayName || (prompt.length > 42 ? `${prompt.slice(0, 42)}...` : prompt),
      prompt,
      provider,
      model,
      size,
      quality,
      hosted,
      storageKey,
      generatedFrom: 'reelflow_image_capability',
      mock: generated.mock,
      ...input.assetMetadata,
    },
  });

  await meterUsage({
    workspaceId: input.workspaceId,
    jobId: input.jobId,
    stageId: input.stageId,
    assetId: asset.id,
    resourceType: 'image',
    provider,
    model,
    usageAmount: 1,
    usageUnit: pricing.usageUnit,
    providerCostAmount: pricing.providerCostAmount,
    providerCostCurrency: pricing.providerCostCurrency,
    creditCost: pricing.creditCost,
    pricingSnapshot: pricing.snapshot,
    rawUsage: { size, quality, promptLength: prompt.length, mock: generated.mock },
  });

  return {
    asset: {
      id: asset.id,
      assetType: asset.assetType,
      sourceType: asset.sourceType,
      url: asset.url,
      mimeType: asset.mimeType,
      metadata: asset.metadata,
      createdAt: asset.createdAt,
    },
    image: { imageUrl, width, height, provider, model, mock: generated.mock, hosted, storageKey },
    credits: charge ? { consumed: pricing.creditCost, balanceAfter: charge.balanceAfter } : null,
  };
}
