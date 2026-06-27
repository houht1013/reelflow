// Reelflow Creator SDK — the high-code authoring surface. A template is a plain
// TypeScript file that imports this SDK and orchestrates capability methods
// (text / image / tts / captions / video / draft / asset). Each method is
// job-bound (workspace/user/billing) with built-in metering, retry, asset
// hosting and checkpointing. External capabilities are wrapped here, once.
//
// Built on top of the existing TemplateContext so the worker, preview sandbox
// and templates all share one implementation. `createSdk(session)` === the ctx
// injected into run(), plus a few aliases + future namespaces.
import { createTemplateContext, type TemplateJob } from '../templates/_sdk/context';
import { renderDraftMp4 } from '../capcut';
import { ProviderCallError } from '../provider-runtime';
import type { TemplateContext } from '../templates/_sdk/types';

export type SdkSession = TemplateJob;

/** A single subtitle segment on a local (per-clip) timeline. */
export type CaptionSegment = { startMs: number; endMs: number; text: string };

export type Sdk = TemplateContext & {
  /** Alias for `ai` — AI 文案生成. */
  text: TemplateContext['ai'];
  /** 字幕提取 / 对齐. Today derives from a TTS result; ASR lands later. */
  captions: {
    /** Pull aligned subtitle segments out of a tts.speak() result. */
    fromVoice(voice: { durationMs: number | null; captions: { segments: CaptionSegment[] } | null }, fallbackText: string): CaptionSegment[];
    /** Align an existing audio to a transcript (future: ASR). */
    extract(audioUrl: string, transcript?: string): Promise<CaptionSegment[]>;
  };
  /** AI 视频生成 (future capability; reserved). */
  video: {
    generate(prompt: string, opts?: { durationMs?: number }): Promise<{ url: string; durationMs: number }>;
  };
  /** Draft assembly + MP4 render (剪映草稿 + gen_video). */
  draft: {
    assemble: TemplateContext['capcut']['assemble'];
    renderMp4(draftUrl: string): Promise<string | null>;
  };
  /** Asset hosting + library. */
  asset: {
    upload: TemplateContext['oss']['upload'];
    search(query: string): Promise<Array<{ id: string; url: string; tags?: string[] }>>;
  };
};

export function createSdk(session: SdkSession): Sdk {
  const ctx = createTemplateContext(session);
  return {
    ...ctx,
    text: ctx.ai,
    captions: {
      fromVoice(voice, fallbackText) {
        const dur = voice.durationMs ?? 3000;
        return (
          voice.captions?.segments.map((s) => ({ startMs: s.startMs, endMs: s.endMs, text: s.text })) ?? [
            { startMs: 0, endMs: dur, text: fallbackText },
          ]
        );
      },
      async extract() {
        throw new ProviderCallError('captions.extract (ASR) is not available yet', 'provider_unconfigured', 503);
      },
    },
    video: {
      async generate() {
        throw new ProviderCallError('AI video generation is not available yet', 'provider_unconfigured', 503);
      },
    },
    draft: {
      assemble: ctx.capcut.assemble,
      renderMp4: (draftUrl: string) => renderDraftMp4(draftUrl),
    },
    asset: {
      upload: ctx.oss.upload,
      async search() {
        throw new ProviderCallError('asset.search (library) is not available yet', 'provider_unconfigured', 503);
      },
    },
  };
}
