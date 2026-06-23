// Reelflow image atomic capability — OpenAI-compatible /v1/images/generations
// (gpt-image-2). Used by the worker image stage (one image per storyboard shot)
// and reusable by tooling. Billing + usage metering go through provider-runtime.
import { reelflowConfig } from '@config';
import { registerGeneratedAsset } from './assets';
import {
  ProviderCallError,
  chargeCredits,
  meterUsage,
  refundCredits,
  resolveProviderPricing,
  type ProviderBillingMode,
} from './provider-runtime';

export type ReelflowImageInput = {
  workspaceId: string;
  userId: string;
  prompt: string;
  size?: string;
  quality?: 'low' | 'medium' | 'high' | 'auto';
  format?: 'png' | 'jpeg' | 'webp';
  model?: string;
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
  image: { imageUrl: string; width: number; height: number; provider: string; model: string; mock: boolean };
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

async function callImageProvider(input: {
  prompt: string;
  model: string;
  size: string;
  quality: string;
  format: string;
}): Promise<{ b64: string; mock: boolean }> {
  const { baseUrl, apiKey, mock } = reelflowConfig.ai.image;

  if (input.prompt.includes('__reelflow_mock_fail__')) {
    throw new Error('Mock image generation failed');
  }

  if (!apiKey || mock) {
    return { b64: MOCK_PNG, mock: true };
  }

  const response = await fetch(`${baseUrl}/v1/images/generations`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: input.model,
      prompt: input.prompt,
      n: 1,
      size: input.size,
      quality: input.quality,
      format: input.format,
    }),
  });

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

  const provider = reelflowConfig.ai.image.provider;
  const model = input.model || reelflowConfig.ai.image.model;
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

  let generated: { b64: string; mock: boolean };
  try {
    generated = await callImageProvider({ prompt, model, size, quality, format });
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

  const mimeType = mimeFromBase64(generated.b64);
  const imageUrl = `data:${mimeType};base64,${generated.b64}`;
  const { width, height } = parseSize(size);

  const asset = await registerGeneratedAsset({
    workspaceId: input.workspaceId,
    userId: input.userId,
    assetType: 'image',
    sourceType: 'ai_generated',
    storageProvider: provider,
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
    image: { imageUrl, width, height, provider, model, mock: generated.mock },
    credits: charge ? { consumed: pricing.creditCost, balanceAfter: charge.balanceAfter } : null,
  };
}
