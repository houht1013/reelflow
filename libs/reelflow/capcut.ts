// Reelflow capcut-mate atomic capability — wraps the open-source capcut-mate
// FastAPI (https://github.com/Hommy-master/capcut-mate) that materializes a
// Jianying (剪映) draft from media + captions.
//
// Endpoints (POST, base = <baseUrl><apiPrefix>, default http://localhost:30000
// /openapi/capcut-mate/v1):
//   create_draft  {width,height}                  -> {draft_url, tip_url}
//   add_images    {draft_url, image_infos(JSON)}  -> {draft_url, track_id, ...}
//   add_audios    {draft_url, audio_infos(JSON)}  -> {draft_url, track_id, audio_ids}
//   add_captions  {draft_url, captions(JSON),...} -> {draft_url, track_id, ...}
//   save_draft    {draft_url}                     -> {draft_url}
//
// IMPORTANT: all media urls (image_url/audio_url) must be http/https — data URLs
// are rejected by the service. Generated images therefore need a public URL
// (object storage) before assembly; TTS audio already returns an https CDN URL.
// All timeline values on the capcut API are MICROSECONDS.
import { reelflowConfig } from '@config';
import { registerGeneratedAsset } from './assets';
import type { ResolvedVideo } from './templates/_sdk/ir';
import {
  ProviderCallError,
  chargeCredits,
  fetchWithRetry,
  meterUsage,
  resolveProviderPricing,
  type ProviderBillingMode,
} from './provider-runtime';

const MS_TO_US = 1000;

// --- Low-level API item shapes (microseconds) ---
export type CapcutImageInfo = { image_url: string; start: number; end: number; width?: number; height?: number };
export type CapcutAudioInfo = { audio_url: string; start: number; end: number; duration?: number; volume?: number };
export type CapcutCaptionInfo = { start: number; end: number; text: string; font_size?: number };

export type CapcutCaptionStyle = {
  textColor?: string;
  borderColor?: string;
  alignment?: number;
  fontSize?: number;
  transformY?: number;
};

async function capcutPost<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const { baseUrl, apiPrefix, timeoutMs, maxAttempts } = reelflowConfig.capcut;
  const url = `${baseUrl}${apiPrefix}${path}`;
  let response: Response;
  try {
    response = await fetchWithRetry(
      url,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      },
      { timeoutMs, attempts: maxAttempts, breakerKey: 'capcut' },
    );
  } catch (error) {
    throw new ProviderCallError(
      `capcut-mate is unreachable at ${url}: ${error instanceof Error ? error.message : 'network error'}`,
      'provider_unconfigured',
      503,
    );
  }
  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new ProviderCallError(
      `capcut-mate ${path} failed: ${response.status} ${errorText.slice(0, 500)}`,
      'generation_failed',
      502,
    );
  }
  // capcut-mate returns HTTP 200 even on errors, wrapped as { code, message, ...fields }.
  const data = (await response.json()) as T & { code?: number; message?: string };
  if (typeof data.code === 'number' && data.code !== 0) {
    throw new ProviderCallError(
      `capcut-mate ${path} error ${data.code}: ${data.message ?? 'unknown'}`,
      'generation_failed',
      502,
      { code: data.code },
    );
  }
  return data;
}

// --- Atomic client (one method per endpoint) ---
export const capcutClient = {
  createDraft(input: { width: number; height: number }) {
    return capcutPost<{ draft_url: string; tip_url: string }>('/create_draft', input);
  },
  addImages(input: { draftUrl: string; images: CapcutImageInfo[]; alpha?: number; scaleX?: number; scaleY?: number; transformX?: number; transformY?: number }) {
    return capcutPost<{ draft_url: string; track_id: string; image_ids: string[]; segment_ids: string[] }>('/add_images', {
      draft_url: input.draftUrl,
      image_infos: JSON.stringify(input.images),
      alpha: input.alpha ?? 1.0,
      scale_x: input.scaleX ?? 1.0,
      scale_y: input.scaleY ?? 1.0,
      transform_x: input.transformX ?? 0,
      transform_y: input.transformY ?? 0,
    });
  },
  addAudios(input: { draftUrl: string; audios: CapcutAudioInfo[] }) {
    return capcutPost<{ draft_url: string; track_id: string; audio_ids: string[] }>('/add_audios', {
      draft_url: input.draftUrl,
      audio_infos: JSON.stringify(input.audios),
    });
  },
  addCaptions(input: { draftUrl: string; captions: CapcutCaptionInfo[]; style?: CapcutCaptionStyle }) {
    return capcutPost<{ draft_url: string; track_id: string; text_ids: string[] }>('/add_captions', {
      draft_url: input.draftUrl,
      captions: JSON.stringify(input.captions),
      text_color: input.style?.textColor ?? '#ffffff',
      border_color: input.style?.borderColor ?? '#111111',
      alignment: input.style?.alignment ?? 1,
      font_size: input.style?.fontSize ?? 15,
      transform_y: input.style?.transformY ?? 720,
    });
  },
  saveDraft(input: { draftUrl: string }) {
    return capcutPost<{ draft_url: string }>('/save_draft', { draft_url: input.draftUrl });
  },
  /** Kick off async MP4 render of a saved draft. */
  genVideo(input: { draftUrl: string; apiKey?: string }) {
    return capcutPost<{ message: string }>('/gen_video', {
      draft_url: input.draftUrl,
      apiKey: input.apiKey,
    });
  },
  /** Poll MP4 render status. video_url is set once status completes. */
  genVideoStatus(input: { draftUrl: string }) {
    return capcutPost<{
      draft_url: string;
      status: string;
      progress: number;
      video_url: string;
      error_message?: string;
    }>('/gen_video_status', { draft_url: input.draftUrl });
  },
};

// --- High-level orchestrator (domain units = milliseconds) ---
export type ReelflowDraftScene = { imageUrl: string; startMs: number; endMs: number; width?: number; height?: number };
export type ReelflowDraftAudio = { audioUrl: string; startMs: number; endMs: number; durationMs?: number; volume?: number };
export type ReelflowDraftCaption = { startMs: number; endMs: number; text: string; fontSize?: number };

export type AssembleReelflowDraftInput = {
  workspaceId: string;
  userId: string;
  width?: number;
  height?: number;
  scenes?: ReelflowDraftScene[];
  audios?: ReelflowDraftAudio[];
  captions?: ReelflowDraftCaption[];
  captionStyle?: CapcutCaptionStyle;
  billing?: ProviderBillingMode;
  ledgerType?: string;
  description?: string;
  displayName?: string;
  jobId?: string;
  stageId?: string;
  assetMetadata?: Record<string, unknown>;
};

export type AssembleReelflowDraftResult = {
  draftUrl: string;
  tipUrl: string | null;
  asset: { id: string; url: string | null; metadata: unknown; createdAt: Date } | null;
  credits: { consumed: number; balanceAfter: number } | null;
  mock: boolean;
};

export async function assembleReelflowDraft(input: AssembleReelflowDraftInput): Promise<AssembleReelflowDraftResult> {
  const width = input.width ?? 1080;
  const height = input.height ?? 1920;
  const billing = input.billing ?? 'meter-only';
  const { mock, baseUrl, apiPrefix } = reelflowConfig.capcut;

  let draftUrl: string;
  let tipUrl: string | null = null;

  if (mock) {
    draftUrl = `${baseUrl}${apiPrefix}/get_draft?draft_id=mock-${input.jobId ?? crypto.randomUUID()}`;
  } else {
    const draft = await capcutClient.createDraft({ width, height });
    draftUrl = draft.draft_url;
    tipUrl = draft.tip_url || null;
    if (!draftUrl) {
      throw new ProviderCallError('capcut-mate create_draft returned no draft_url', 'generation_failed', 502);
    }

    const images = (input.scenes ?? [])
      .filter((scene) => scene.imageUrl)
      .map<CapcutImageInfo>((scene) => ({
        image_url: scene.imageUrl,
        start: Math.round(scene.startMs * MS_TO_US),
        end: Math.round(scene.endMs * MS_TO_US),
        width: scene.width,
        height: scene.height,
      }));
    if (images.length) await capcutClient.addImages({ draftUrl, images });

    const audios = (input.audios ?? [])
      .filter((audio) => audio.audioUrl)
      .map<CapcutAudioInfo>((audio) => ({
        audio_url: audio.audioUrl,
        start: Math.round(audio.startMs * MS_TO_US),
        end: Math.round(audio.endMs * MS_TO_US),
        duration: audio.durationMs ? Math.round(audio.durationMs * MS_TO_US) : undefined,
        volume: audio.volume,
      }));
    if (audios.length) await capcutClient.addAudios({ draftUrl, audios });

    const captions = (input.captions ?? [])
      .filter((caption) => caption.text.trim())
      .map<CapcutCaptionInfo>((caption) => ({
        start: Math.round(caption.startMs * MS_TO_US),
        end: Math.round(caption.endMs * MS_TO_US),
        text: caption.text,
        font_size: caption.fontSize,
      }));
    if (captions.length) await capcutClient.addCaptions({ draftUrl, captions, style: input.captionStyle });

    const saved = await capcutClient.saveDraft({ draftUrl });
    draftUrl = saved.draft_url || draftUrl;
  }

  const pricing = await resolveProviderPricing({
    resourceType: 'draft',
    provider: 'capcut-mate',
    amount: 1,
    fallbackCreditCost: 3,
  });

  let credits: AssembleReelflowDraftResult['credits'] = null;
  if (billing === 'charge') {
    const charged = await chargeCredits({
      workspaceId: input.workspaceId,
      userId: input.userId,
      amount: pricing.creditCost,
      ledgerType: input.ledgerType ?? 'reelflow_draft',
      description: input.description ?? 'CapCut draft generation',
      metadata: { provider: 'capcut-mate', draftUrl, pricingSnapshot: pricing.snapshot },
    });
    credits = { consumed: pricing.creditCost, balanceAfter: charged.balanceAfter };
  }

  const asset = await registerGeneratedAsset({
    workspaceId: input.workspaceId,
    userId: input.userId,
    assetType: 'draft_package',
    sourceType: 'generated',
    storageProvider: 'capcut-mate',
    url: draftUrl,
    mimeType: 'application/x-capcut-draft',
    metadata: {
      displayName: input.displayName || 'CapCut 草稿',
      draftUrl,
      tipUrl,
      provider: 'capcut-mate',
      width,
      height,
      sceneCount: input.scenes?.length ?? 0,
      audioCount: input.audios?.length ?? 0,
      captionCount: input.captions?.length ?? 0,
      generatedFrom: 'reelflow_capcut_draft',
      mock,
      ...input.assetMetadata,
    },
  });

  await meterUsage({
    workspaceId: input.workspaceId,
    jobId: input.jobId,
    stageId: input.stageId,
    assetId: asset.id,
    resourceType: 'draft',
    provider: 'capcut-mate',
    model: 'capcut-mate',
    usageAmount: 1,
    usageUnit: pricing.usageUnit,
    providerCostAmount: pricing.providerCostAmount,
    providerCostCurrency: pricing.providerCostCurrency,
    creditCost: pricing.creditCost,
    pricingSnapshot: pricing.snapshot,
    rawUsage: { width, height, scenes: input.scenes?.length ?? 0, audios: input.audios?.length ?? 0, captions: input.captions?.length ?? 0, mock },
  });

  return {
    draftUrl,
    tipUrl,
    asset: { id: asset.id, url: asset.url, metadata: asset.metadata, createdAt: asset.createdAt },
    credits,
    mock,
  };
}

// --- MP4 render via capcut-mate gen_video (async) ---
const GEN_VIDEO_POLL_INTERVAL_MS = 3000;
const GEN_VIDEO_POLL_MAX_ATTEMPTS = 120; // ~6 min

/**
 * Render a saved draft to an MP4 via capcut-mate gen_video. Best-effort: returns
 * the video URL, or null on timeout/failure (the draft remains the core
 * deliverable). Polls gen_video_status until a video_url appears.
 */
export async function renderDraftMp4(draftUrl: string): Promise<string | null> {
  const apiKey = process.env.CAPCUT_GEN_VIDEO_API_KEY || undefined;
  try {
    await capcutClient.genVideo({ draftUrl, apiKey });
  } catch (error) {
    console.error('capcut gen_video start failed:', error instanceof Error ? error.message : error);
    return null;
  }
  for (let attempt = 0; attempt < GEN_VIDEO_POLL_MAX_ATTEMPTS; attempt++) {
    await new Promise((r) => setTimeout(r, GEN_VIDEO_POLL_INTERVAL_MS));
    let status: Awaited<ReturnType<typeof capcutClient.genVideoStatus>>;
    try {
      status = await capcutClient.genVideoStatus({ draftUrl });
    } catch (error) {
      console.error('capcut gen_video_status poll failed:', error instanceof Error ? error.message : error);
      continue;
    }
    if (status.video_url) return status.video_url;
    if (status.error_message || status.status === 'failed' || status.status === 'error') {
      console.error('capcut gen_video failed:', status.error_message || status.status);
      return null;
    }
  }
  console.error('capcut gen_video timed out after polling');
  return null;
}

// --- Resolved IR → capcut draft (+ optional MP4) ---
export type AssembleResolvedVideoInput = {
  workspaceId: string;
  userId: string;
  ir: ResolvedVideo;
  billing?: ProviderBillingMode;
  ledgerType?: string;
  description?: string;
  displayName?: string;
  jobId?: string;
  stageId?: string;
  assetMetadata?: Record<string, unknown>;
};

export type AssembleResolvedVideoResult = AssembleReelflowDraftResult & { mp4Url: string | null };

/**
 * Single renderer: materialize a Resolved Video IR into a capcut draft, then
 * (per ir.delivery.mp4) render an MP4 via gen_video. Reuses assembleReelflowDraft
 * for metering/asset/credit. Image shots are wired today; video shots + motion +
 * transitions land in later milestones.
 */
export async function assembleResolvedVideo(input: AssembleResolvedVideoInput): Promise<AssembleResolvedVideoResult> {
  const { ir } = input;

  const scenes: ReelflowDraftScene[] = ir.shots
    .filter((s) => s.visual.kind === 'image')
    .map((s) => ({ imageUrl: (s.visual as { url: string }).url, startMs: s.startMs, endMs: s.endMs }));
  const audios: ReelflowDraftAudio[] = ir.shots
    .filter((s) => s.audioUrl)
    .map((s) => ({ audioUrl: s.audioUrl as string, startMs: s.startMs, endMs: s.endMs, durationMs: s.audioDurationMs }));
  const captions: ReelflowDraftCaption[] = ir.shots.flatMap((s) => s.captions);

  const draft = await assembleReelflowDraft({
    workspaceId: input.workspaceId,
    userId: input.userId,
    width: ir.canvas.width,
    height: ir.canvas.height,
    scenes,
    audios,
    captions,
    captionStyle: ir.captionStyle,
    billing: input.billing,
    ledgerType: input.ledgerType,
    description: input.description,
    displayName: input.displayName,
    jobId: input.jobId,
    stageId: input.stageId,
    assetMetadata: input.assetMetadata,
  });

  let mp4Url: string | null = null;
  if (ir.delivery.mp4 !== 'off' && !draft.mock) {
    mp4Url = await renderDraftMp4(draft.draftUrl);
    if (mp4Url) {
      await registerGeneratedAsset({
        workspaceId: input.workspaceId,
        userId: input.userId,
        assetType: 'video',
        sourceType: 'generated',
        storageProvider: 'capcut-mate',
        url: mp4Url,
        mimeType: 'video/mp4',
        metadata: { displayName: input.displayName || 'Reelflow MP4', draftUrl: draft.draftUrl, provider: 'capcut-mate', generatedFrom: 'reelflow_gen_video', ...input.assetMetadata },
      }).catch((error) => console.error('Failed to register MP4 asset:', error));
    }
  }

  return { ...draft, mp4Url };
}
