// Shared "narrated storyboard" pipeline used by short-video templates whose flow
// is: LLM script -> one image per scene -> one voiceover per scene -> global
// timeline -> CapCut draft. Templates supply the creative direction (prompts,
// visual style, dimensions); the mechanics (parallel image gen + per-item
// checkpointing + settlement-friendly metering) live here, once.
import type { TemplateContext, TemplateRunOutput } from './types';
import type {
  ReelflowDraftScene,
  ReelflowDraftAudio,
  ReelflowDraftCaption,
  CapcutCaptionStyle,
} from '../../capcut';

export type StoryboardScene = { narration: string; visualPrompt: string };

export type NarratedStoryboardOptions = {
  /** Number of scenes (also the number of images + voiceovers). */
  sceneCount: number;
  /** System prompt for the scriptwriter LLM call. */
  scriptSystem: string;
  /** User prompt for the scriptwriter — should ask for the JSON scenes schema. */
  scriptPrompt: string;
  /** Appended to each scene's visualPrompt to enforce a consistent look. */
  visualStyle: string;
  /** gpt-image-2 native size, default '1024x1536' (portrait). */
  imageSize?: string;
  imageQuality?: 'low' | 'medium' | 'high';
  /** Final draft canvas, default 1080x1920 (9:16). */
  draftWidth?: number;
  draftHeight?: number;
  captionStyle?: CapcutCaptionStyle;
  /** Human-facing draft name (e.g. the user's topic). */
  displayName: string;
};

/**
 * Run the full narrated-storyboard pipeline against ctx. Images are generated in
 * parallel up to ctx.job.imageConcurrency; every image/voice is checkpointed so a
 * partial failure + retry resumes instead of re-charging completed items.
 */
export async function runNarratedStoryboard(
  ctx: TemplateContext,
  opts: NarratedStoryboardOptions,
): Promise<TemplateRunOutput> {
  const imageSize = opts.imageSize ?? '1024x1536';
  const imageQuality = opts.imageQuality ?? 'high';
  const draftWidth = opts.draftWidth ?? 1080;
  const draftHeight = opts.draftHeight ?? 1920;

  // 1. Script -> structured scenes.
  const script = await ctx.stage('script', async () => {
    const data = await ctx.ai.generateJson<{ scenes: StoryboardScene[] }>(opts.scriptPrompt, {
      system: opts.scriptSystem,
    });
    const scenes = (data.scenes ?? []).slice(0, opts.sceneCount);
    if (scenes.length === 0) throw new Error('脚本生成为空');
    return { scenes };
  });

  // 2. One image per scene (parallel + checkpointed), hosted for capcut.
  const images = await ctx.stage('image', async () => {
    const generated = await ctx.mapItems(
      script.scenes,
      (scene, i) =>
        ctx.image.generate(`${scene.visualPrompt}. ${opts.visualStyle}`, {
          size: imageSize,
          quality: imageQuality,
          displayName: `镜头 ${i + 1}`,
          assetMetadata: { sceneIndex: i },
        }),
      { concurrency: ctx.job.imageConcurrency, key: (_, i) => `image:${i}` },
    );
    return generated.map((img) => ({ url: img.url }));
  });

  // 3. One voiceover per scene (with subtitle alignment), checkpointed.
  const voices = await ctx.stage('voice', async () => {
    const out: { url: string; durationMs: number; segments: { startMs: number; endMs: number; text: string }[] }[] = [];
    for (const [i, scene] of script.scenes.entries()) {
      const v = await ctx.item(`voice:${i}`, () =>
        ctx.tts.speak(scene.narration, { align: true, displayName: `配音 ${i + 1}` }),
      );
      const durationMs = v.durationMs ?? 3000;
      const segments = v.captions?.segments.map((s) => ({ startMs: s.startMs, endMs: s.endMs, text: s.text }))
        ?? [{ startMs: 0, endMs: durationMs, text: scene.narration }];
      out.push({ url: v.url, durationMs, segments });
    }
    return out;
  });

  // 4. Lay everything on one global timeline.
  const timeline = await ctx.stage('caption', async () => {
    const scenes: ReelflowDraftScene[] = [];
    const audios: ReelflowDraftAudio[] = [];
    const captions: ReelflowDraftCaption[] = [];
    let cursor = 0;
    script.scenes.forEach((scene, i) => {
      const dur = voices[i].durationMs;
      const start = cursor;
      const end = cursor + dur;
      scenes.push({ imageUrl: images[i].url, startMs: start, endMs: end });
      audios.push({ audioUrl: voices[i].url, startMs: start, endMs: end, durationMs: dur });
      for (const seg of voices[i].segments) {
        captions.push({ startMs: start + seg.startMs, endMs: start + seg.endMs, text: seg.text });
      }
      cursor = end;
    });
    return { scenes, audios, captions };
  });

  // 5. Materialize the CapCut draft.
  const draft = await ctx.stage('draft_package', async () =>
    ctx.capcut.assemble({
      width: draftWidth,
      height: draftHeight,
      scenes: timeline.scenes,
      audios: timeline.audios,
      captions: timeline.captions,
      captionStyle: opts.captionStyle ?? { fontSize: 14, transformY: 600 },
      displayName: opts.displayName,
    }),
  );

  return { draftUrl: draft.draftUrl, summary: { sceneCount: script.scenes.length } };
}
