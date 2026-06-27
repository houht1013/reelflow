// Reelflow TTS + caption-alignment atomic capability, wrapping the local
// `dubbingx-cli`. Covers two things the worker voice/caption stages need:
//   1. text -> audio        (dubbingx tts)
//   2. audio + text -> word/sentence subtitle timeline (dubbingx align, volcengine)
//
// NODE-ONLY: this module spawns a child process, so it is NOT exported from the
// package barrel. Import it directly: `@libs/reelflow/tts`.
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readFile, unlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { reelflowConfig } from '@config';
import { registerGeneratedAsset } from './assets';
import { resolveActiveModel, modelPricingOf } from './models';
import {
  ProviderCallError,
  chargeCredits,
  meterUsage,
  resolveProviderPricing,
  withProviderBreaker,
  type ProviderBillingMode,
} from './provider-runtime';

const execFileAsync = promisify(execFile);

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

async function runDubbingx(args: string[]): Promise<string> {
  const { entry, bin, timeoutMs, maxAttempts } = reelflowConfig.ai.tts;
  const command = entry ? 'node' : bin;
  const fullArgs = entry ? [entry, ...args] : args;
  const attempts = Math.max(1, Math.floor(maxAttempts ?? 1));

  // Breaker (fail fast on sustained CLI failure) + per-call timeout (kills a hung
  // dubbingx process) + retry on transient failures.
  return withProviderBreaker('tts', async () => {
    let lastError: unknown;
    for (let attempt = 0; attempt < attempts; attempt += 1) {
      try {
        const { stdout } = await execFileAsync(command, fullArgs, {
          maxBuffer: 1024 * 1024 * 32,
          windowsHide: true,
          timeout: timeoutMs,
          // .cmd shim on PATH needs a shell; the `node <entry>` path never does.
          shell: !entry && process.platform === 'win32',
        });
        return stdout;
      } catch (error) {
        lastError = error;
        if (attempt === attempts - 1) throw error;
        await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
      }
    }
    throw lastError;
  });
}

function parseField(stdout: string, label: string): string | null {
  const match = stdout.match(new RegExp(`${label}[:：]\\s*(\\S+)`));
  return match ? match[1] : null;
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
}): Promise<{ audioUrl: string; taskId: string | null }> {
  const args = ['tts', input.text, '--voice', input.voice, '--lang', input.lang, '--format', input.format, '--no-download'];
  if (input.emotion) args.push('--emotion', input.emotion);
  if (input.emotionCustom) args.push('--emotion-custom', input.emotionCustom);
  if (typeof input.speed === 'number') args.push('--speed', String(input.speed));
  if (typeof input.pitch === 'number') args.push('--pitch', String(input.pitch));
  if (typeof input.volume === 'number') args.push('--volume', String(input.volume));

  const stdout = await runDubbingx(args);
  const audioUrl = parseField(stdout, '下载链接');
  if (!audioUrl) {
    throw new Error(`dubbingx tts returned no download link. Output: ${stdout.slice(0, 300)}`);
  }
  return { audioUrl, taskId: parseField(stdout, '任务ID') };
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

async function alignDubbingxCaptions(input: { audioUrl: string; text: string }): Promise<ReelflowCaptionTimeline> {
  const outPath = join(tmpdir(), `reelflow-align-${crypto.randomUUID()}.json`);
  try {
    await runDubbingx(['align', '--audio-url', input.audioUrl, '--text', input.text, '-o', outPath]);
    const raw = await readFile(outPath, 'utf8');
    return mapAlignJson(JSON.parse(raw) as AlignJson);
  } finally {
    await unlink(outPath).catch(() => {});
  }
}

// --- Mock path (dev / e2e without the CLI or credits) ---
const SILENT_MP3 = 'data:audio/mpeg;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA';

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
  let mock = false;

  if (cfg.mock || (!cfg.entry && !cfg.bin)) {
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
      if (doAlign) {
        captions = await alignDubbingxCaptions({ audioUrl, text });
      }
    } catch (error) {
      throw new ProviderCallError(
        error instanceof Error ? error.message : 'Voice generation failed',
        'generation_failed',
        502,
      );
    }
  }

  const durationMs = captions?.durationMs ?? null;

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
