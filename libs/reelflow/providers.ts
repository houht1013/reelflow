import { reelflowConfig } from '@config';
import { db } from '@libs/database';
import { providerHealthCheck, providerProfile } from '@libs/database/schema';
import { eq } from 'drizzle-orm';

export type ProviderProfileSeed = {
  providerType: 'llm' | 'image' | 'tts' | 'draft' | 'render' | 'storage';
  provider: string;
  displayName: string;
  enabled: boolean;
  priority: number;
  config?: Record<string, unknown>;
};

export const MVP_PROVIDER_PROFILE_SEEDS: ProviderProfileSeed[] = [
  { providerType: 'llm', provider: 'openai-compatible', displayName: 'OpenAI Compatible Chat', enabled: true, priority: 100 },
  { providerType: 'image', provider: 'fal', displayName: 'Fal Image', enabled: true, priority: 100 },
  { providerType: 'tts', provider: 'openai-compatible', displayName: 'OpenAI Compatible TTS', enabled: true, priority: 100 },
  { providerType: 'draft', provider: 'capcut-mate', displayName: 'CapCut Mate Draft Service', enabled: true, priority: 100 },
  { providerType: 'render', provider: 'cloud-render', displayName: 'Cloud Render 1080P MP4', enabled: false, priority: 50 },
];

export type ProviderHealthStatus = 'available' | 'degraded' | 'unavailable';

export async function runProviderHealthCheck(input: {
  providerProfileId: string;
  checkedBy?: 'admin' | 'system' | 'worker';
}) {
  const startedAt = Date.now();
  const [profile] = await db
    .select({
      id: providerProfile.id,
      providerType: providerProfile.providerType,
      provider: providerProfile.provider,
      displayName: providerProfile.displayName,
      enabled: providerProfile.enabled,
      config: providerProfile.config,
    })
    .from(providerProfile)
    .where(eq(providerProfile.id, input.providerProfileId))
    .limit(1);

  if (!profile) {
    throw new Error('Provider not found');
  }

  const result = resolveProviderHealth(profile);
  const latencyMs = Math.max(0, Date.now() - startedAt);
  const [row] = await db
    .insert(providerHealthCheck)
    .values({
      id: crypto.randomUUID(),
      providerProfileId: profile.id,
      status: result.status,
      latencyMs,
      errorCode: result.errorCode,
      errorMessage: result.errorMessage,
      checkedBy: input.checkedBy ?? 'system',
      createdAt: new Date(),
    })
    .returning({
      id: providerHealthCheck.id,
      providerProfileId: providerHealthCheck.providerProfileId,
      status: providerHealthCheck.status,
      latencyMs: providerHealthCheck.latencyMs,
      errorCode: providerHealthCheck.errorCode,
      errorMessage: providerHealthCheck.errorMessage,
      checkedBy: providerHealthCheck.checkedBy,
      createdAt: providerHealthCheck.createdAt,
    });

  return row;
}

function resolveProviderHealth(profile: {
  providerType: string;
  provider: string;
  displayName: string;
  enabled: boolean;
  config: unknown;
}): { status: ProviderHealthStatus; errorCode?: string; errorMessage?: string } {
  if (!profile.enabled) {
    return {
      status: 'unavailable',
      errorCode: 'provider_disabled',
      errorMessage: `${profile.displayName} is disabled.`,
    };
  }

  if (profile.providerType === 'render') {
    if (reelflowConfig.cloudRender.mock) {
      return { status: 'available' };
    }
    if (!reelflowConfig.cloudRender.endpoint || !reelflowConfig.cloudRender.apiKey) {
      return {
        status: 'unavailable',
        errorCode: 'render_config_missing',
        errorMessage: 'Cloud render endpoint or API key is not configured.',
      };
    }
    return { status: 'available' };
  }

  if (profile.providerType === 'draft') {
    if (reelflowConfig.worker.executionMode === 'mock' || reelflowConfig.worker.executionMode === 'local_draft') {
      return { status: 'available' };
    }
    return {
      status: 'degraded',
      errorCode: 'draft_mode_unknown',
      errorMessage: 'Draft provider is enabled, but the worker execution mode is not recognized.',
    };
  }

  if (profile.providerType === 'tts') {
    if (process.env.REELFLOW_TTS_MOCK === '1' || process.env.REELFLOW_TTS_API_KEY || process.env.OPENAI_API_KEY) {
      return { status: 'available' };
    }
    return {
      status: 'degraded',
      errorCode: 'tts_uses_mock_fallback',
      errorMessage: 'TTS API key is not configured; local generation falls back to mock audio.',
    };
  }

  if (profile.providerType === 'image') {
    if (process.env.REELFLOW_IMAGE_MOCK === '1' || process.env.REELFLOW_IMAGE_API_KEY || process.env.OPENAI_API_KEY) {
      return { status: 'available' };
    }
    return {
      status: 'degraded',
      errorCode: 'image_uses_mock_fallback',
      errorMessage: 'Image provider credentials are not configured; local generation may use mock output.',
    };
  }

  if (profile.providerType === 'llm') {
    if (process.env.REELFLOW_LLM_API_KEY || process.env.OPENAI_API_KEY) {
      return { status: 'available' };
    }
    return {
      status: 'degraded',
      errorCode: 'llm_credentials_missing',
      errorMessage: 'LLM credentials are not configured; templates can only use local/mock execution.',
    };
  }

  return { status: 'available' };
}
