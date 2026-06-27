// Reelflow in-repo template contract. Templates live in the code repo (one folder
// per template) and are executed directly by the worker — no OSS bundle / sandbox.
import type { z } from 'zod';
import type { ReelflowStageCode } from '../../constants';
import type { ReelflowCaptionTimeline } from '../../tts';
import type { ReelflowDraftScene, ReelflowDraftAudio, ReelflowDraftCaption, CapcutCaptionStyle } from '../../capcut';

// Bilingual UI text. A plain string is used as-is (treated as the default
// locale); an object carries per-locale copy. Lets the page render accurately
// in zh-CN / en without a separate translation table.
export type LocalizedText = string | { 'zh-CN'?: string; en?: string };

/** Resolve a LocalizedText for a given locale (graceful fallback). */
export function localize(text: LocalizedText | undefined | null, locale: string): string {
  if (text == null) return '';
  if (typeof text === 'string') return text;
  const zh = text['zh-CN'] ?? '';
  const en = text.en ?? '';
  return locale.startsWith('zh') ? zh || en : en || zh;
}

// Standardized input field component the frontend renders from metadata.
export type TemplateFieldType =
  | 'text'
  | 'textarea'
  | 'number' // int/float — use `precision` (0 = integer) and min/max/step
  | 'slider'
  | 'switch' // boolean
  | 'select'
  | 'color'
  | 'aspect' // picks a canvas ratio, e.g. '16:9' | '9:16' | '1:1'
  | 'voice'  // picks a TTS voice id
  | 'image'  // uploads a single image -> asset (logo / reference / background)
  | 'asset'; // picks an existing asset from the library

export type TemplateFieldOption = { value: string; label: LocalizedText };

// Standardized INPUT param metadata — synced to `template.inputSchema`. The
// composer renders the right component purely from this (no per-template UI).
export type TemplateField = {
  /** Param key — also the run() input key. */
  key: string;
  label: LocalizedText;
  type: TemplateFieldType;
  /** Helper/description text shown under the control. */
  help?: LocalizedText;
  placeholder?: LocalizedText;
  required?: boolean;
  defaultValue?: unknown;
  /** UI grouping, e.g. '内容' / '风格' / '配音' / '品牌'. */
  group?: LocalizedText;
  /** For select/aspect/voice. */
  options?: TemplateFieldOption[];
  // number / slider
  min?: number;
  max?: number;
  step?: number;
  /** Decimal places for number/slider (0 = integer). */
  precision?: number;
  /** Unit suffix for number/slider, e.g. 's' / '%'. */
  unit?: string;
  // image upload
  /** Allowed mime/extension for type 'image', e.g. ['image/png','image/jpeg']. */
  accept?: string[];
  /** Upload size cap (MB) for type 'image'. */
  maxSizeMb?: number;
  /** For type 'asset' — restrict pickable asset types. */
  assetTypes?: string[];
  /** Reuse a shared param preset (aspect/voice/speed/...) for consistency. */
  preset?: string;
};

// Standardized OUTPUT metadata — synced to `template.outputSchema`. The result
// page renders each output by type (video player / image / audio / link / text).
export type TemplateOutputType = 'draft' | 'video' | 'image' | 'audio' | 'text' | 'json';

export type TemplateOutput = {
  key: string;
  label: LocalizedText;
  type: TemplateOutputType;
  description?: LocalizedText;
};

// What a run is expected to consume — priced by the shared estimator (pricing_item)
// so the frozen estimate matches the metered actual.
export type ResourcePlan = {
  llmCalls?: number;
  images?: number;
  ttsChars?: number;
  draft?: number;
};

export type TemplateContext = {
  job: {
    id: string;
    workspaceId: string;
    userId: string;
    renderMp4Requested: boolean;
    /** Per-job parallelism for storyboard image generation (1–5, default 1). */
    imageConcurrency: number;
  };

  ai: {
    generateText(prompt: string, opts?: { system?: string; temperature?: number; maxTokens?: number; model?: string }): Promise<string>;
    generateJson<T = unknown>(prompt: string, opts?: { system?: string; temperature?: number; maxTokens?: number; model?: string }): Promise<T>;
  };

  image: {
    generate(prompt: string, opts?: {
      size?: string;
      quality?: 'low' | 'medium' | 'high' | 'auto';
      displayName?: string;
      assetMetadata?: Record<string, unknown>;
    }): Promise<{ url: string; assetId: string; width: number; height: number }>;
  };

  tts: {
    speak(text: string, opts?: {
      voice?: string;
      emotion?: string;
      speed?: number;
      align?: boolean;
      displayName?: string;
    }): Promise<{ url: string; durationMs: number | null; captions: ReelflowCaptionTimeline | null; assetId: string }>;
  };

  oss: {
    upload(file: Buffer, opts?: { dir?: string; contentType?: string; fileName?: string }): Promise<{ url: string; key: string }>;
  };

  capcut: {
    assemble(input: {
      width?: number;
      height?: number;
      scenes?: ReelflowDraftScene[];
      audios?: ReelflowDraftAudio[];
      captions?: ReelflowDraftCaption[];
      captionStyle?: CapcutCaptionStyle;
      displayName?: string;
    }): Promise<{ draftUrl: string; assetId: string | null }>;
  };

  /** Run a tracked content stage. Completed stages are skipped on retry (checkpoint). */
  stage<T>(code: ReelflowStageCode, fn: () => Promise<T>): Promise<T>;

  /**
   * Item-level checkpoint inside a stage. Memoizes each item's result to the
   * stage's output snapshot, so when a multi-item stage (e.g. one image per
   * shot) fails partway and is retried, already-completed items are returned
   * from cache instead of being regenerated and re-metered. Must be called
   * inside a `stage()` callback. `key` must be unique within the stage.
   */
  item<T>(key: string, fn: () => Promise<T>): Promise<T>;

  /**
   * Run `fn` over `items` with bounded parallelism, checkpointing each result
   * (via `item`) so a partial failure + retry only reprocesses missing items.
   * Use for storyboard image/voice loops: pass `{ concurrency: ctx.job.imageConcurrency }`.
   * Results preserve input order. Default concurrency is 1 (sequential).
   */
  mapItems<T, R>(
    items: readonly T[],
    fn: (item: T, index: number) => Promise<R>,
    opts?: { concurrency?: number; key?: (item: T, index: number) => string },
  ): Promise<R[]>;

  /** Append a log line to the job timeline (job_event). */
  log(level: 'info' | 'warn' | 'error', message: string, data?: Record<string, unknown>): Promise<void>;
};

// One concrete produced artifact (产物素材信息) — fills an `outputs[]` slot.
export type OutputAsset = {
  /** Matches a template.outputs[].key (e.g. 'draft' / 'mp4'). */
  key: string;
  type: TemplateOutputType;
  label?: LocalizedText;
  /** Public http(s) URL (or draft URL). */
  url?: string;
  /** Library asset id, when stored. */
  assetId?: string;
  mimeType?: string;
  sizeBytes?: number;
  /** For video/audio. */
  durationMs?: number;
  width?: number;
  height?: number;
  thumbnailUrl?: string;
  meta?: Record<string, unknown>;
};

// What run() returns — the produced artifacts. The runtime wraps this into the
// standardized TemplateRunResult envelope (adds jobId/status/duration/credits).
export type TemplateRunOutput = {
  draftUrl?: string;
  /** MP4 URL if rendered (gen_video). */
  mp4Url?: string;
  /** Produced artifacts keyed to the template's outputs[]. */
  assets?: OutputAsset[];
  summary?: Record<string, unknown>;
};

export type TemplateRunStatus = 'succeeded' | 'failed';

// Standardized RUN RESULT envelope handed to the page: execution context
// (任务ID / 状态 / 耗时 / 消耗积分) + produced artifacts (产物素材信息).
export type TemplateRunResult = {
  jobId: string; // 任务ID
  templateCode: string;
  status: TemplateRunStatus; // 成功/失败
  startedAt: string; // ISO 8601
  finishedAt: string; // ISO 8601
  durationMs: number; // 耗时
  creditsConsumed: number; // 消耗积分
  error?: { code: string; message: string };
  assets: OutputAsset[]; // 产物素材信息
  summary?: Record<string, unknown>;
};

// Default outputs when a template doesn't declare its own (a draft + optional MP4).
export const DEFAULT_TEMPLATE_OUTPUTS: TemplateOutput[] = [
  { key: 'draft', label: '剪映草稿', type: 'draft', description: '可编辑的剪映草稿包' },
  { key: 'mp4', label: '成片 MP4', type: 'video', description: '渲染输出的视频(可选)' },
];

export type TemplateBadge = 'new' | 'recommended' | 'hot';

export type ReelflowTemplate<TInput = unknown> = {
  code: string;
  name: string;
  description: string;
  category: string;
  version: string;
  /** Free-form tags for filtering + fuzzy search (e.g. ['情绪价值','口播']). */
  tags?: string[];
  /** Markers shown on the card: new / recommended / hot. */
  badges?: TemplateBadge[];
  /** Cover image URL (http) shown on the card. */
  coverImageUrl?: string;
  /** Optional sample video URL (http) — card shows a video preview when present. */
  sampleVideoUrl?: string;
  capabilityRequirements?: string[];
  /** Single source of truth for input: validation + inferred run() type. */
  schema: z.ZodType<TInput>;
  /** Standardized input param metadata (synced to template.inputSchema). */
  fields: TemplateField[];
  /** Standardized output metadata (synced to template.outputSchema). Defaults
   *  to a draft + optional MP4 when omitted. */
  outputs?: TemplateOutput[];
  /** Content stages this template uses (only these are pre-seeded for the progress UI). */
  stages: ReelflowStageCode[];
  /** Resource plan for the freeze estimate. */
  estimate(input: TInput): ResourcePlan;
  /** Director logic. Drives ctx.* and reports stages via ctx.stage(). */
  run(ctx: TemplateContext, input: TInput): Promise<TemplateRunOutput>;
};

export function defineTemplate<TInput>(template: ReelflowTemplate<TInput>): ReelflowTemplate<TInput> {
  return template;
}
