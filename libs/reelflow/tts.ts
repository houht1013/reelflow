// Reelflow TTS + caption-alignment atomic capability over the DubbingX HTTP API.
// Covers the two things the worker voice/caption stages need:
//   1. text -> audio  (POST /v1/addTtsTask -> poll GET /v1/getTtsTaskInfo/{id})
//   2. audio + text -> word/sentence subtitle timeline (configurable align endpoint)
import { reelflowConfig } from '@config';
import { registerGeneratedAsset } from './assets';
import { resolveActiveModel, modelPricingOf } from './models';
import {
  ProviderCallError,
  chargeCredits,
  fetchWithRetry,
  meterUsage,
  resolveProviderPricing,
  withProviderBreaker,
  type ProviderBillingMode,
} from './provider-runtime';

export type ReelflowCaptionWord = { text: string; startMs: number; endMs: number; punctuation?: string };
export type ReelflowCaptionSegment = { index: number; text: string; startMs: number; endMs: number; words: ReelflowCaptionWord[] };
export type ReelflowCaptionTimeline = { durationMs: number; segments: ReelflowCaptionSegment[] };

export type ReelflowVoiceTrackInput = {
  workspaceId: string;
  userId: string;
  text: string;
  voice?: string;
  emotion?: string;
  emotionCustom?: string;
  lang?: string;
  speed?: number;
  pitch?: number;
  volume?: number;
  format?: 'mp3' | 'wav';
  /** Run subtitle alignment (default: config). Produces `captions`. */
  align?: boolean;
  /** Defaults to 'meter-only' (worker/job flow). */
  billing?: ProviderBillingMode;
  ledgerType?: string;
  description?: string;
  displayName?: string;
  jobId?: string;
  stageId?: string;
  assetMetadata?: Record<string, unknown>;
};

export type ReelflowVoiceTrackResult = {
  audio: { url: string; taskId: string | null; durationMs: number | null; format: string; voice: string; mock: boolean };
  captions: ReelflowCaptionTimeline | null;
  audioAsset: { id: string; url: string | null; durationMs: number | null; metadata: unknown; createdAt: Date };
  captionAsset: { id: string; metadata: unknown; createdAt: Date } | null;
  credits: { consumed: number; balanceAfter: number } | null;
};

async function dubbingxRequest<T>(path: string, method: 'GET' | 'POST', body?: unknown): Promise<T> {
  const { baseUrl, apiKey, timeoutMs, maxAttempts } = reelflowConfig.ai.tts;
  const res = await fetchWithRetry(
    `${baseUrl}${path}`,
    {
      method,
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    },
    { timeoutMs, attempts: maxAttempts, breakerKey: 'tts' },
  );
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`DubbingX ${path} failed: ${res.status} ${text.slice(0, 300)}`);
  }
  return (await res.json()) as T;
}

// Defensive field pick — tolerate camelCase / snake_case and a `data` wrapper.
function pick<T>(obj: unknown, ...keys: string[]): T | undefined {
  const o = (obj && typeof obj === 'object' ? obj : {}) as Record<string, unknown>;
  const src = (o.data && typeof o.data === 'object' ? { ...(o.data as Record<string, unknown>), ...o } : o);
  for (const k of keys) if (src[k] != null) return src[k] as T;
  return undefined;
}

async function synthesizeDubbingxVoice(input: {
  text: string;
  voice: string;
  emotion?: string;
  emotionCustom?: string;
  lang: string;
  speed?: number;
  pitch?: number;
  volume?: number;
  format: string;
}): Promise<{ audioUrl: string; taskId: string | null; durationMs: number | null }> {
  // 1. Create the async TTS task.
  const created = await dubbingxRequest<unknown>('/v1/addTtsTask', 'POST', {
    voiceId: input.voice,
    text: input.text,
    language: input.lang,
    fileFormat: input.format,
    ...(typeof input.speed === 'number' ? { audioSpeed: input.speed } : {}),
    ...(typeof input.pitch === 'number' ? { audioPitch: input.pitch } : {}),
    ...(typeof input.volume === 'number' ? { audioVolume: input.volume } : {}),
    ...(input.emotion ? { emotion: input.emotion } : {}),
    ...(input.emotionCustom ? { emotionCustom: input.emotionCustom } : {}),
  });
  const taskId = String(pick<string>(created, 'taskId', 'task_id', 'id') ?? '');
  if (!taskId) throw new Error(`DubbingX addTtsTask returned no taskId: ${JSON.stringify(created).slice(0, 200)}`);

  // 2. Poll until completed.
  const { pollIntervalMs, pollMaxMs } = reelflowConfig.ai.tts;
  const deadline = Date.now() + pollMaxMs;
  for (;;) {
    const info = await dubbingxRequest<unknown>(`/v1/getTtsTaskInfo/${encodeURIComponent(taskId)}`, 'GET');
    const status = String(pick<string>(info, 'status', 'state') ?? '').toLowerCase();
    if (['completed', 'success', 'succeeded', 'done'].includes(status)) {
      const audioUrl = pick<string>(info, 'audioUrl', 'audio_url', 'downloadUrl', 'download_url', 'fileUrl', 'url');
      if (!audioUrl) throw new Error('DubbingX task completed without an audio URL');
      const durRaw = pick<number>(info, 'duration', 'audioDuration', 'audio_duration');
      const durationMs = typeof durRaw === 'number' ? Math.round(durRaw > 2000 ? durRaw : durRaw * 1000) : null;
      return { audioUrl, taskId, durationMs };
    }
    if (['failed', 'error'].includes(status)) {
      throw new Error(`DubbingX TTS task failed: ${pick<string>(info, 'message', 'error', 'errorMessage') ?? status}`);
    }
    if (Date.now() > deadline) throw new Error('DubbingX TTS task timed out');
    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }
}

type AlignJson = {
  data?: {
    duration?: number;
    utterances?: Array<{
      sentence_id?: number;
      start_time?: number;
      end_time?: number;
      text?: string;
      words?: Array<{ text?: string; start_time?: number; end_time?: number; punctuation?: string }>;
    }>;
  };
};

function mapAlignJson(json: AlignJson): ReelflowCaptionTimeline {
  const durationMs = Math.round((json.data?.duration ?? 0) * 1000);
  const segments: ReelflowCaptionSegment[] = (json.data?.utterances ?? []).map((utt, i) => ({
    index: utt.sentence_id ?? i + 1,
    text: utt.text ?? '',
    startMs: utt.start_time ?? 0,
    endMs: utt.end_time ?? 0,
    words: (utt.words ?? []).map((word) => ({
      text: word.text ?? '',
      startMs: word.start_time ?? 0,
      endMs: word.end_time ?? 0,
      punctuation: word.punctuation || undefined,
    })),
  }));
  return { durationMs, segments };
}

async function alignDubbingxCaptions(input: { audioUrl: string; text: string }): Promise<ReelflowCaptionTimeline | null> {
  const { alignUrl, alignToken, timeoutMs, maxAttempts } = reelflowConfig.ai.tts;
  if (!alignUrl) return null; // no align endpoint configured -> caller degrades
  const res = await fetchWithRetry(
    alignUrl,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(alignToken ? { Authorization: `Bearer ${alignToken}` } : {}) },
      body: JSON.stringify({ audioUrl: input.audioUrl, audio_url: input.audioUrl, text: input.text }),
    },
    { timeoutMs, attempts: maxAttempts, breakerKey: 'tts-align' },
  );
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`DubbingX align failed: ${res.status} ${text.slice(0, 300)}`);
  }
  return mapAlignJson((await res.json()) as AlignJson);
}

// --- Mock path (dev / e2e without the CLI or credits) ---
const SILENT_MP3 = "data:audio/mpeg;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjYyLjEyLjEwMAAAAAAAAAAAAAAA//tAwAAAAAAAAAAAAAAAAAAAAAAASW5mbwAAAA8AAAAoAAARCgAQEBYWHR0dIyMpKSkvLzU1NTs7QUFBSEhOTk5UVFpaWmBgZmZmbGxycnJ5eX9/f4WFi4uLkZGXl5ednaOjo6qqsLCwtra8vLzCwsjIyM7O1dXV29vh4eHn5+3t7fPz+fn5//8AAAAATGF2YzYyLjI4AAAAAAAAAAAAAAAAJAV8AAAAAAAAEQrbF3OAAAAAAAD/+xDEAAPAAAGkAAAAIAAANIAAAARMQU1FMy4xMDBVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVTEFNRTMuMTAwVf/7EsQpg8AAAaQAAAAgAAA0gAAABFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVTEFNRTMuMTAwVf/7EMRTg8AAAaQAAAAgAAA0gAAABFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVMQU1FMy4xMDBV//sSxH0DwAABpAAAACAAADSAAAAEVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVMQU1FMy4xMDBV//sQxKcDwAABpAAAACAAADSAAAAEVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVUxBTUUzLjEwMFX/+xLE0IPAAAGkAAAAIAAANIAAAARVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVUxBTUUzLjEwMFX/+xDE1gPAAAGkAAAAIAAANIAAAARVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVTEFNRTMuMTAwVf/7EsTVg8AAAaQAAAAgAAA0gAAABFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVTEFNRTMuMTAwVf/7EMTWA8AAAaQAAAAgAAA0gAAABFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVMQU1FMy4xMDBV//sSxNWDwAABpAAAACAAADSAAAAEVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVMQU1FMy4xMDBV//sQxNYDwAABpAAAACAAADSAAAAEVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVUxBTUUzLjEwMFX/+xLE1YPAAAGkAAAAIAAANIAAAARVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVUxBTUUzLjEwMFX/+xDE1gPAAAGkAAAAIAAANIAAAARVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVTEFNRTMuMTAwVf/7EsTVg8AAAaQAAAAgAAA0gAAABFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVTEFNRTMuMTAwVf/7EMTWA8AAAaQAAAAgAAA0gAAABFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVMQU1FMy4xMDBV//sSxNWDwAABpAAAACAAADSAAAAEVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVMQU1FMy4xMDBV//sQxNYDwAABpAAAACAAADSAAAAEVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVUxBTUUzLjEwMFX/+xLE1YPAAAGkAAAAIAAANIAAAARVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVUxBTUUzLjEwMFX/+xDE1gPAAAGkAAAAIAAANIAAAARVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVTEFNRTMuMTAwVf/7EsTVg8AAAaQAAAAgAAA0gAAABFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVTEFNRTMuMTAwVf/7EMTWA8AAAaQAAAAgAAA0gAAABFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVMQU1FMy4xMDBV//sSxNWDwAABpAAAACAAADSAAAAEVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVMQU1FMy4xMDBV//sQxNYDwAABpAAAACAAADSAAAAEVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVUxBTUUzLjEwMFX/+xLE1YPAAAGkAAAAIAAANIAAAARVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVUxBTUUzLjEwMFX/+xDE1gPAAAGkAAAAIAAANIAAAARVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVTEFNRTMuMTAwVf/7EsTVg8AAAaQAAAAgAAA0gAAABFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVTEFNRTMuMTAwVf/7EMTWA8AAAaQAAAAgAAA0gAAABFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVMQU1FMy4xMDBV//sSxNWDwAABpAAAACAAADSAAAAEVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVMQU1FMy4xMDBV//sQxNYDwAABpAAAACAAADSAAAAEVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVUxBTUUzLjEwMFX/+xLE1YPAAAGkAAAAIAAANIAAAARVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVUxBTUUzLjEwMFX/+xDE1gPAAAGkAAAAIAAANIAAAARVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVTEFNRTMuMTAwVf/7EsTVg8AAAaQAAAAgAAA0gAAABFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVTEFNRTMuMTAwVf/7EMTWA8AAAaQAAAAgAAA0gAAABFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVMQU1FMy4xMDBV//sSxNWDwAABpAAAACAAADSAAAAEVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVMQU1FMy4xMDBV//sQxNYDwAABpAAAACAAADSAAAAEVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/+xLE1YPAAAGkAAAAIAAANIAAAARVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/+xDE1gPAAAGkAAAAIAAANIAAAARVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVf/7EsTVg8AAAaQAAAAgAAA0gAAABFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVf/7EMTWA8AAAaQAAAAgAAA0gAAABFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV//sSxNWDwAABpAAAACAAADSAAAAEVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV";

/**
 * Host an inline `data:` audio URI on OSS and return a public/signed http(s) URL.
 * Downstream (capcut-mate) requires http(s) URLs; the mock TTS — and any provider
 * that returns inline base64 — would otherwise break draft assembly. Reuses the
 * image host bucket/url settings. Returns the original URI on failure.
 */
async function hostAudioDataUri(dataUri: string): Promise<string> {
  const m = /^data:([^;]+);base64,(.*)$/.exec(dataUri);
  if (!m) return dataUri;
  const contentType = m[1] || 'audio/mpeg';
  const buffer = Buffer.from(m[2], 'base64');
  const { storage } = await import('@libs/storage');
  const ext = (contentType.split('/')[1] || 'mp3').replace('mpeg', 'mp3');
  const uploaded = await storage.uploadFile({ file: buffer, fileName: `${crypto.randomUUID()}.${ext}`, contentType, folder: 'reelflow-tts' });
  if (reelflowConfig.ai.image.urlMode === 'public' && uploaded.url) return uploaded.url;
  const signed = await storage.generateSignedUrl({ key: uploaded.key, operation: 'get', expiresIn: reelflowConfig.ai.image.signedUrlTtl });
  return signed.url;
}

function buildMockTimeline(text: string): ReelflowCaptionTimeline {
  const parts = text.split(/(?<=[。！？!?\.\n])/).map((s) => s.trim()).filter(Boolean);
  const sentences = parts.length ? parts : [text.trim()];
  const perCharMs = 180;
  let cursor = 0;
  const segments: ReelflowCaptionSegment[] = sentences.map((sentence, i) => {
    const startMs = cursor;
    const endMs = cursor + Math.max(400, sentence.length * perCharMs);
    cursor = endMs + 80;
    return { index: i + 1, text: sentence, startMs, endMs, words: [] };
  });
  return { durationMs: cursor, segments };
}

export async function generateReelflowVoiceTrack(input: ReelflowVoiceTrackInput): Promise<ReelflowVoiceTrackResult> {
  const text = input.text.trim();
  if (!text) {
    throw new ProviderCallError('Voice text is required', 'invalid_input', 400);
  }

  const cfg = reelflowConfig.ai.tts;
  // Admin-managed audio model (DB) supplies defaults; env is the fallback. The
  // dubbingx CLI is local, so only voice/lang/format are DB-managed here.
  const dbModel = await resolveActiveModel('audio').catch(() => null);
  const dbConfig = (dbModel?.config ?? {}) as Record<string, unknown>;
  const voice = (input.voice || dbModel?.modelId || cfg.defaultVoice).trim();
  if (!voice) {
    throw new ProviderCallError('A dubbingx voice id is required', 'invalid_input', 400);
  }
  const lang = input.lang || (dbConfig.lang as string) || cfg.defaultLang;
  const format = input.format || (dbConfig.format as 'mp3' | 'wav') || (cfg.defaultFormat as 'mp3' | 'wav');
  const doAlign = input.align ?? cfg.align;
  const billing = input.billing ?? 'meter-only';

  let audioUrl: string;
  let taskId: string | null = null;
  let captions: ReelflowCaptionTimeline | null = null;
  let synthDurationMs: number | null = null;
  let mock = false;

  if (cfg.mock || !cfg.apiKey) {
    mock = true;
    audioUrl = SILENT_MP3;
    captions = doAlign ? buildMockTimeline(text) : null;
  } else {
    try {
      const synth = await synthesizeDubbingxVoice({
        text,
        voice,
        emotion: input.emotion,
        emotionCustom: input.emotionCustom,
        lang,
        speed: input.speed,
        pitch: input.pitch,
        volume: input.volume,
        format,
      });
      audioUrl = synth.audioUrl;
      taskId = synth.taskId;
      synthDurationMs = synth.durationMs;
      if (doAlign) {
        // Degrade to a char-proportional timeline if no align endpoint is configured.
        captions = (await alignDubbingxCaptions({ audioUrl, text })) ?? buildMockTimeline(text);
      }
    } catch (error) {
      throw new ProviderCallError(
        error instanceof Error ? error.message : 'Voice generation failed',
        'generation_failed',
        502,
      );
    }
  }

  // capcut-mate needs http(s) audio; host inline data: URIs (mock / base64 providers) on OSS.
  if (audioUrl.startsWith('data:')) {
    try {
      audioUrl = await hostAudioDataUri(audioUrl);
    } catch (error) {
      console.warn('[reelflow-tts] failed to host data: audio on OSS:', error instanceof Error ? error.message : error);
    }
  }

  const durationMs = captions?.durationMs ?? synthDurationMs;

  // For a per_time audio model meter on seconds; otherwise on characters.
  const meterAmount = dbModel?.pricingMode === 'per_time' ? Math.max(0, Math.round((durationMs ?? 0) / 1000)) : text.length;
  const pricing = await resolveProviderPricing({
    resourceType: 'tts',
    provider: cfg.provider,
    model: voice,
    amount: meterAmount,
    fallbackCreditCost: Math.max(1, Math.ceil(text.length * 0.002 * 100) / 100),
    modelPricing: modelPricingOf(dbModel),
  });

  let credits: ReelflowVoiceTrackResult['credits'] = null;
  if (billing === 'charge') {
    const charged = await chargeCredits({
      workspaceId: input.workspaceId,
      userId: input.userId,
      amount: pricing.creditCost,
      ledgerType: input.ledgerType ?? 'ai_voice_generation',
      description: input.description ?? 'AI voice generation',
      metadata: { provider: cfg.provider, voice, textLength: text.length, pricingSnapshot: pricing.snapshot },
    });
    credits = { consumed: pricing.creditCost, balanceAfter: charged.balanceAfter };
  }

  const audioAsset = await registerGeneratedAsset({
    workspaceId: input.workspaceId,
    userId: input.userId,
    jobId: input.jobId,
    stageId: input.stageId,
    assetType: 'audio',
    sourceType: 'ai_generated',
    storageProvider: cfg.provider,
    url: audioUrl,
    mimeType: format === 'wav' ? 'audio/wav' : 'audio/mpeg',
    durationMs,
    metadata: {
      displayName: input.displayName || (text.length > 42 ? `${text.slice(0, 42)}...` : text),
      text,
      voice,
      lang,
      taskId,
      provider: cfg.provider,
      generatedFrom: 'reelflow_voice_track',
      mock,
      ...input.assetMetadata,
    },
  });

  let captionAsset: ReelflowVoiceTrackResult['captionAsset'] = null;
  if (captions) {
    const captionJson = JSON.stringify({ audioAssetId: audioAsset.id, voice, text, timeline: captions });
    const created = await registerGeneratedAsset({
      workspaceId: input.workspaceId,
      userId: input.userId,
      jobId: input.jobId,
      stageId: input.stageId,
      assetType: 'caption',
      sourceType: 'ai_generated',
      storageProvider: cfg.provider,
      url: `data:application/json;base64,${Buffer.from(captionJson, 'utf8').toString('base64')}`,
      mimeType: 'application/json',
      durationMs,
      metadata: {
        displayName: `字幕时间线 · ${text.length > 30 ? `${text.slice(0, 30)}...` : text}`,
        audioAssetId: audioAsset.id,
        timeline: captions,
        generatedFrom: 'reelflow_caption_align',
        mock,
      },
    });
    captionAsset = { id: created.id, metadata: created.metadata, createdAt: created.createdAt };
  }

  await meterUsage({
    workspaceId: input.workspaceId,
    jobId: input.jobId,
    stageId: input.stageId,
    assetId: audioAsset.id,
    resourceType: 'tts',
    provider: cfg.provider,
    model: voice,
    usageAmount: text.length,
    usageUnit: pricing.usageUnit,
    providerCostAmount: pricing.providerCostAmount,
    providerCostCurrency: pricing.providerCostCurrency,
    creditCost: pricing.creditCost,
    pricingSnapshot: pricing.snapshot,
    rawUsage: { chars: text.length, durationMs, aligned: Boolean(captions), taskId, mock },
  });

  return {
    audio: { url: audioUrl, taskId, durationMs, format, voice, mock },
    captions,
    audioAsset: { id: audioAsset.id, url: audioAsset.url, durationMs: audioAsset.durationMs, metadata: audioAsset.metadata, createdAt: audioAsset.createdAt },
    captionAsset,
    credits,
  };
}
