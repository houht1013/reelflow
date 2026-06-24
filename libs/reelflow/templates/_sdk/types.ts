// Reelflow in-repo template contract. Templates live in the code repo (one folder
// per template) and are executed directly by the worker — no OSS bundle / sandbox.
import type { z } from 'zod';
import type { ReelflowStageCode } from '../../constants';
import type { ReelflowCaptionTimeline } from '../../tts';
import type { ReelflowDraftScene, ReelflowDraftAudio, ReelflowDraftCaption, CapcutCaptionStyle } from '../../capcut';

// Form field metadata — synced to the `template.inputSchema` column for the UI.
export type TemplateField = {
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'select' | 'switch' | 'number' | 'asset';
  required?: boolean;
  defaultValue?: unknown;
  placeholder?: string;
  help?: string;
  options?: { value: string; label: string }[];
  min?: number;
  max?: number;
  assetTypes?: string[];
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
  job: { id: string; workspaceId: string; userId: string; renderMp4Requested: boolean };

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

  /** Append a log line to the job timeline (job_event). */
  log(level: 'info' | 'warn' | 'error', message: string, data?: Record<string, unknown>): Promise<void>;
};

export type TemplateRunOutput = {
  draftUrl?: string;
  summary?: Record<string, unknown>;
};

export type ReelflowTemplate<TInput = unknown> = {
  code: string;
  name: string;
  description: string;
  category: string;
  version: string;
  capabilityRequirements?: string[];
  /** Single source of truth for input: validation + inferred run() type. */
  schema: z.ZodType<TInput>;
  /** Form field metadata for the UI (synced to DB). */
  fields: TemplateField[];
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
