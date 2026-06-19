import { generateImageResponse, type ImageGenerationOptions, type ImageProviderName } from '@libs/ai';
import { db } from '@libs/database';
import { creditAccount, creditLedger, pricingItem, usageRecord } from '@libs/database/schema';
import { and, eq, sql } from 'drizzle-orm';
import { registerGeneratedAsset } from './assets';

export type ReelflowImageToolInput = {
  workspaceId: string;
  userId: string;
  prompt: string;
  provider: ImageProviderName;
  model?: string;
  negativePrompt?: string;
  size?: string;
  aspectRatio?: string;
  seed?: number;
  promptExtend?: boolean;
  watermark?: boolean;
  numInferenceSteps?: number;
  guidanceScale?: number;
};

export type ReelflowImageToolResult = {
  asset: {
    id: string;
    assetType: string;
    sourceType: string;
    url: string | null;
    mimeType: string | null;
    metadata: unknown;
    createdAt: Date;
  };
  image: {
    imageUrl: string;
    width?: number;
    height?: number;
    provider: ImageProviderName;
    model: string;
    seed?: number;
  };
  credits: {
    consumed: number;
    balanceAfter: number;
  };
};

export type ReelflowVoiceToolInput = {
  workspaceId: string;
  userId: string;
  text: string;
  voice?: string;
  provider?: string;
  model?: string;
  speed?: number;
};

export type ReelflowVoiceToolResult = {
  asset: {
    id: string;
    assetType: string;
    sourceType: string;
    url: string | null;
    mimeType: string | null;
    metadata: unknown;
    createdAt: Date;
  };
  audio: {
    audioUrl: string;
    provider: string;
    model: string;
    voice: string;
    durationMs?: number;
  };
  credits: {
    consumed: number;
    balanceAfter: number;
  };
};

export class ToolExecutionError extends Error {
  constructor(
    message: string,
    public readonly code: 'invalid_prompt' | 'invalid_text' | 'insufficient_credits' | 'generation_failed',
    public readonly status: number,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'ToolExecutionError';
  }
}

export async function generateReelflowImageAsset(input: ReelflowImageToolInput): Promise<ReelflowImageToolResult> {
  const prompt = input.prompt.trim();
  if (!prompt) {
    throw new ToolExecutionError('Prompt is required', 'invalid_prompt', 400);
  }

  const pricing = await getImagePricing(input.provider, input.model);
  const creditCost = pricing.creditCost;
  const consumeResult = await consumeImageCredits({
    workspaceId: input.workspaceId,
    userId: input.userId,
    amount: creditCost,
    metadata: {
      provider: input.provider,
      model: input.model ?? pricing.model,
      prompt: prompt.slice(0, 200),
      pricingSnapshot: pricing.snapshot,
    },
  });

  const options: ImageGenerationOptions = {
    prompt,
    provider: input.provider,
    model: input.model,
    negativePrompt: input.negativePrompt,
    size: input.provider === 'fal' || input.provider === 'gemini' ? undefined : input.size,
    aspectRatio: input.provider === 'fal' || input.provider === 'gemini' ? (input.aspectRatio || input.size || '1:1') : undefined,
    seed: input.seed,
    promptExtend: input.provider === 'qwen' ? input.promptExtend : undefined,
    watermark: input.provider === 'qwen' ? input.watermark : undefined,
    numInferenceSteps: input.provider === 'fal' ? input.numInferenceSteps : undefined,
    guidanceScale: input.provider === 'fal' ? input.guidanceScale : undefined,
  };

  let image;
  try {
    if (process.env.REELFLOW_IMAGE_MOCK_FAIL === '1' || prompt.includes('__reelflow_mock_fail__')) {
      throw new Error('Mock image generation failed');
    }
    image = process.env.REELFLOW_IMAGE_MOCK === '1'
      ? {
          imageUrl: createMockPngDataUrl(),
          width: 1,
          height: 1,
          provider: input.provider,
          model: input.model ?? pricing.model,
          seed: input.seed,
        }
      : await generateImageResponse(options);
  } catch (error) {
    await refundImageCredits({
      workspaceId: input.workspaceId,
      userId: input.userId,
      amount: creditCost,
      originalLedgerId: consumeResult.ledgerId,
      metadata: {
        provider: input.provider,
        model: input.model ?? pricing.model,
        error: error instanceof Error ? error.message : 'Unknown image generation error',
      },
    });

    throw new ToolExecutionError(
      error instanceof Error ? error.message : 'Image generation failed',
      'generation_failed',
      500,
    );
  }

  const mimeType = inferImageMimeType(image.imageUrl);
  const fileSize = estimateDataUrlFileSize(image.imageUrl);
  const asset = await registerGeneratedAsset({
    workspaceId: input.workspaceId,
    userId: input.userId,
    assetType: 'image',
    sourceType: 'ai_generated',
    storageProvider: image.provider,
    url: image.imageUrl,
    mimeType,
    fileSize,
    width: image.width ?? null,
    height: image.height ?? null,
    metadata: {
      displayName: prompt.length > 42 ? `${prompt.slice(0, 42)}...` : prompt,
      prompt,
      negativePrompt: input.negativePrompt,
      provider: image.provider,
      model: image.model,
      seed: image.seed,
      size: input.size,
      aspectRatio: input.aspectRatio,
      generatedFrom: 'reelflow_image_tool',
    },
  });

  await db.insert(usageRecord).values({
    id: crypto.randomUUID(),
    workspaceId: input.workspaceId,
    assetId: asset.id,
    resourceType: 'image',
    provider: image.provider,
    model: image.model,
    usageAmount: '1',
    usageUnit: 'image',
    providerCostAmount: pricing.providerCostAmount.toString(),
    providerCostCurrency: pricing.providerCostCurrency,
    creditCost: creditCost.toString(),
    pricingSnapshot: pricing.snapshot,
    rawUsage: {
      promptLength: prompt.length,
      width: image.width,
      height: image.height,
      seed: image.seed,
    },
    createdAt: new Date(),
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
    image,
    credits: {
      consumed: creditCost,
      balanceAfter: consumeResult.balanceAfter,
    },
  };
}

export async function generateReelflowVoiceAsset(input: ReelflowVoiceToolInput): Promise<ReelflowVoiceToolResult> {
  const text = input.text.trim();
  if (!text) {
    throw new ToolExecutionError('Voice text is required', 'invalid_text', 400);
  }
  if (text.length > 2000) {
    throw new ToolExecutionError('Voice text must be 2000 characters or less', 'invalid_text', 400, {
      maxLength: 2000,
    });
  }

  const provider = input.provider?.trim() || process.env.REELFLOW_TTS_PROVIDER || 'openai-compatible';
  const voice = input.voice?.trim() || process.env.REELFLOW_TTS_VOICE || 'alloy';
  const pricing = await getUsagePricing({
    resourceType: 'tts',
    provider,
    model: input.model || process.env.REELFLOW_TTS_MODEL || 'default-tts',
    amount: text.length,
    fallbackCreditCost: Math.max(1, Math.ceil(text.length * 0.002 * 100) / 100),
  });

  const consumeResult = await consumeToolCredits({
    workspaceId: input.workspaceId,
    userId: input.userId,
    amount: pricing.creditCost,
    ledgerType: 'ai_voice_generation',
    description: 'AI voice generation',
    metadata: {
      provider,
      model: pricing.model,
      voice,
      textPreview: text.slice(0, 200),
      textLength: text.length,
      pricingSnapshot: pricing.snapshot,
    },
  });

  let audio;
  try {
    audio = await synthesizeVoice({
      text,
      provider,
      model: input.model || pricing.model,
      voice,
      speed: input.speed,
    });
  } catch (error) {
    await refundToolCredits({
      workspaceId: input.workspaceId,
      userId: input.userId,
      amount: pricing.creditCost,
      originalLedgerId: consumeResult.ledgerId,
      description: 'Refund failed AI voice generation',
      metadata: {
        provider,
        model: pricing.model,
        voice,
        error: error instanceof Error ? error.message : 'Unknown voice generation error',
      },
    });

    throw new ToolExecutionError(
      error instanceof Error ? error.message : 'Voice generation failed',
      'generation_failed',
      500,
    );
  }

  const asset = await registerGeneratedAsset({
    workspaceId: input.workspaceId,
    userId: input.userId,
    assetType: 'audio',
    sourceType: 'ai_generated',
    storageProvider: audio.provider,
    url: audio.audioUrl,
    mimeType: audio.mimeType,
    fileSize: estimateDataUrlFileSize(audio.audioUrl),
    durationMs: audio.durationMs,
    metadata: {
      displayName: text.length > 42 ? `${text.slice(0, 42)}...` : text,
      text,
      provider: audio.provider,
      model: audio.model,
      voice,
      speed: input.speed,
      generatedFrom: 'reelflow_voice_tool',
      mock: audio.mock,
    },
  });

  await db.insert(usageRecord).values({
    id: crypto.randomUUID(),
    workspaceId: input.workspaceId,
    assetId: asset.id,
    resourceType: 'tts',
    provider: audio.provider,
    model: audio.model,
    usageAmount: text.length.toString(),
    usageUnit: 'char',
    providerCostAmount: pricing.providerCostAmount.toString(),
    providerCostCurrency: pricing.providerCostCurrency,
    creditCost: pricing.creditCost.toString(),
    pricingSnapshot: pricing.snapshot,
    rawUsage: {
      textLength: text.length,
      voice,
      durationMs: audio.durationMs,
      mock: audio.mock,
    },
    createdAt: new Date(),
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
    audio: {
      audioUrl: audio.audioUrl,
      provider: audio.provider,
      model: audio.model,
      voice,
      durationMs: audio.durationMs,
    },
    credits: {
      consumed: pricing.creditCost,
      balanceAfter: consumeResult.balanceAfter,
    },
  };
}

async function getImagePricing(provider: string, model?: string) {
  return getUsagePricing({
    resourceType: 'image',
    provider,
    model: model || 'default-image',
    amount: 1,
    fallbackCreditCost: 8,
  });
}

async function getUsagePricing(input: {
  resourceType: 'image' | 'tts';
  provider: string;
  model?: string;
  amount: number;
  fallbackCreditCost: number;
}) {
  const rows = await db
    .select()
    .from(pricingItem)
    .where(and(eq(pricingItem.resourceType, input.resourceType), eq(pricingItem.enabled, true)))
    .limit(50);

  const exact = rows.find((item) => item.provider === input.provider && item.model === input.model);
  const providerDefault = rows.find((item) => item.provider === input.provider);
  const fallback = rows[0];
  const selected = exact ?? providerDefault ?? fallback;

  const unitCreditPrice = selected ? Number(selected.creditUnitPrice || 0) : input.fallbackCreditCost;
  const rawCreditCost = input.resourceType === 'tts' ? unitCreditPrice * input.amount : unitCreditPrice * Math.max(input.amount, 1);
  const creditCost = selected
    ? Math.max(Number(selected.minCreditCost || 0), Math.ceil(rawCreditCost * 100) / 100)
    : input.fallbackCreditCost;
  const providerCostAmount = selected ? Number(selected.providerCostUnitPrice || 0) * input.amount : 0;
  const providerCostCurrency = selected?.providerCostCurrency || 'USD';
  const selectedModel = input.model || selected?.model || (input.resourceType === 'tts' ? 'default-tts' : 'default-image');

  return {
    model: selectedModel,
    creditCost,
    providerCostAmount,
    providerCostCurrency,
    snapshot: {
      pricingItemId: selected?.id,
      resourceType: input.resourceType,
      provider: input.provider,
      model: selectedModel,
      usageUnit: input.resourceType === 'tts' ? 'char' : 'image',
      providerCostUnitPrice: selected?.providerCostUnitPrice ?? providerCostAmount.toString(),
      providerCostCurrency,
      creditUnitPrice: selected?.creditUnitPrice ?? creditCost.toString(),
      minCreditCost: selected?.minCreditCost ?? creditCost.toString(),
    },
  };
}

async function consumeImageCredits(input: {
  workspaceId: string;
  userId: string;
  amount: number;
  metadata: Record<string, unknown>;
}) {
  return consumeToolCredits({
    ...input,
    ledgerType: 'ai_image_generation',
    description: 'AI image generation',
  });
}

async function consumeToolCredits(input: {
  workspaceId: string;
  userId: string;
  amount: number;
  ledgerType: 'ai_image_generation' | 'ai_voice_generation';
  description: string;
  metadata: Record<string, unknown>;
}) {
  return db.transaction(async (tx) => {
    const [updatedAccount] = await tx
      .update(creditAccount)
      .set({
        balance: sql`${creditAccount.balance} - ${input.amount}`,
        totalConsumed: sql`${creditAccount.totalConsumed} + ${input.amount}`,
        updatedAt: new Date(),
      })
      .where(and(eq(creditAccount.workspaceId, input.workspaceId), sql`${creditAccount.balance} >= ${input.amount}`))
      .returning({
        balance: creditAccount.balance,
        frozenBalance: creditAccount.frozenBalance,
        debtBalance: creditAccount.debtBalance,
      });

    if (!updatedAccount) {
      throw new ToolExecutionError('Not enough workspace credits for image generation', 'insufficient_credits', 402, {
        required: input.amount,
      });
    }

    const [ledger] = await tx
      .insert(creditLedger)
      .values({
        id: crypto.randomUUID(),
        workspaceId: input.workspaceId,
        userId: input.userId,
        type: input.ledgerType,
        amount: `-${input.amount}`,
        balanceAfter: updatedAccount.balance,
        frozenAfter: updatedAccount.frozenBalance,
        debtAfter: updatedAccount.debtBalance,
        description: input.description,
        metadata: input.metadata,
        createdAt: new Date(),
      })
      .returning({ id: creditLedger.id });

    return {
      ledgerId: ledger.id,
      balanceAfter: Number(updatedAccount.balance || 0),
    };
  });
}

async function refundImageCredits(input: {
  workspaceId: string;
  userId: string;
  amount: number;
  originalLedgerId: string;
  metadata: Record<string, unknown>;
}) {
  return refundToolCredits({
    ...input,
    description: 'Refund failed AI image generation',
  });
}

async function refundToolCredits(input: {
  workspaceId: string;
  userId: string;
  amount: number;
  originalLedgerId: string;
  description: string;
  metadata: Record<string, unknown>;
}) {
  await db.transaction(async (tx) => {
    const [updatedAccount] = await tx
      .update(creditAccount)
      .set({
        balance: sql`${creditAccount.balance} + ${input.amount}`,
        totalConsumed: sql`${creditAccount.totalConsumed} - ${input.amount}`,
        updatedAt: new Date(),
      })
      .where(eq(creditAccount.workspaceId, input.workspaceId))
      .returning({
        balance: creditAccount.balance,
        frozenBalance: creditAccount.frozenBalance,
        debtBalance: creditAccount.debtBalance,
      });

    if (!updatedAccount) return;

    await tx.insert(creditLedger).values({
      id: crypto.randomUUID(),
      workspaceId: input.workspaceId,
      userId: input.userId,
      type: 'refund',
      amount: input.amount.toString(),
      balanceAfter: updatedAccount.balance,
      frozenAfter: updatedAccount.frozenBalance,
      debtAfter: updatedAccount.debtBalance,
      description: input.description,
      metadata: {
        ...input.metadata,
        originalLedgerId: input.originalLedgerId,
      },
      createdAt: new Date(),
    });
  });
}

function inferImageMimeType(imageUrl: string) {
  const dataMatch = imageUrl.match(/^data:([^;]+);/);
  if (dataMatch?.[1]) return dataMatch[1];
  const lower = imageUrl.toLowerCase();
  if (lower.includes('.webp')) return 'image/webp';
  if (lower.includes('.jpg') || lower.includes('.jpeg')) return 'image/jpeg';
  if (lower.includes('.gif')) return 'image/gif';
  return 'image/png';
}

async function synthesizeVoice(input: {
  text: string;
  provider: string;
  model: string;
  voice: string;
  speed?: number;
}) {
  if (process.env.REELFLOW_TTS_MOCK_FAIL === '1' || input.text.includes('__reelflow_mock_fail__')) {
    throw new Error('Mock voice generation failed');
  }

  const endpoint = getTtsEndpoint(input.provider);
  const apiKey = process.env.REELFLOW_TTS_API_KEY || process.env.OPENAI_API_KEY;
  const model = input.model === 'default-tts'
    ? (process.env.REELFLOW_TTS_MODEL || 'tts-1')
    : input.model;

  if (!endpoint || !apiKey || process.env.REELFLOW_TTS_MOCK === '1') {
    const durationMs = Math.min(Math.max(input.text.length * 85, 1200), 12000);
    return {
      audioUrl: createMockWavDataUrl(durationMs),
      mimeType: 'audio/wav',
      provider: 'mock-tts',
      model: 'mock-voice',
      durationMs,
      mock: true,
    };
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      input: input.text,
      voice: input.voice,
      response_format: 'mp3',
      speed: input.speed,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(`TTS provider error: ${response.status} ${errorText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return {
    audioUrl: `data:audio/mpeg;base64,${arrayBufferToBase64(arrayBuffer)}`,
    mimeType: 'audio/mpeg',
    provider: input.provider,
    model,
    durationMs: Math.min(Math.max(input.text.length * 85, 1200), 120000),
    mock: false,
  };
}

function getTtsEndpoint(provider: string) {
  if (process.env.REELFLOW_TTS_ENDPOINT) return process.env.REELFLOW_TTS_ENDPOINT;
  if (provider === 'openai-compatible') {
    const baseUrl = (process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, '');
    return `${baseUrl}/audio/speech`;
  }
  return '';
}

function estimateDataUrlFileSize(imageUrl: string) {
  const commaIndex = imageUrl.indexOf(',');
  if (!imageUrl.startsWith('data:') || commaIndex < 0) return null;
  const base64 = imageUrl.slice(commaIndex + 1);
  return Math.round((base64.length * 3) / 4);
}

function createMockPngDataUrl() {
  return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAFgwJ/lYgS5wAAAABJRU5ErkJggg==';
}

function createMockWavDataUrl(durationMs: number) {
  const sampleRate = 8000;
  const samples = Math.max(1, Math.floor((durationMs / 1000) * sampleRate));
  const dataSize = samples * 2;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);
  writeAscii(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeAscii(view, 8, 'WAVE');
  writeAscii(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeAscii(view, 36, 'data');
  view.setUint32(40, dataSize, true);

  for (let i = 0; i < samples; i += 1) {
    const envelope = Math.min(1, i / 400, (samples - i) / 400);
    const sample = Math.sin((i / sampleRate) * Math.PI * 2 * 440) * 0.08 * Math.max(0, envelope);
    view.setInt16(44 + i * 2, Math.floor(sample * 32767), true);
  }

  return `data:audio/wav;base64,${arrayBufferToBase64(buffer)}`;
}

function writeAscii(view: DataView, offset: number, text: string) {
  for (let i = 0; i < text.length; i += 1) {
    view.setUint8(offset + i, text.charCodeAt(i));
  }
}

function arrayBufferToBase64(buffer: ArrayBuffer) {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}
