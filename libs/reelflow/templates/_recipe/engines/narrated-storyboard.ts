// narrated-storyboard structure engine — the config-driven successor to
// runNarratedStoryboard. It interprets a recipe's NarratedStoryboardConfig +
// user input, drives ctx.* to generate per-shot media, and produces a Resolved
// Video IR (rendered later by the single capcut renderer). New structures =
// new engines registered the same way.
import type { TemplateContext, ResourcePlan, TemplateField } from '../../_sdk/types';
import type { NarratedStoryboardConfig, VisualDirective } from '../recipe';
import type { ResolvedVideo, ResolvedVisual } from '../ir';
import type { StructureEngine, RecipeGlobals } from '../structure';
import { assembleTimeline, type ShotDraft } from '../timeline';

type StoryboardScene = { narration: string; visualPrompt: string };
type Input = Record<string, unknown>;

const DEFAULT_IMAGE_SIZE = '1024x1536';

function fillTemplate(tpl: string, input: Input): string {
  return tpl.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k) => {
    const v = input[k];
    return v == null ? '' : String(v);
  });
}

/** Resolve a shot's visual to a concrete media URL per the directive. */
async function resolveVisual(
  ctx: TemplateContext,
  directive: VisualDirective,
  scene: StoryboardScene,
  index: number,
  globalStyle: string | undefined,
): Promise<ResolvedVisual> {
  switch (directive.kind) {
    case 'ai_image': {
      const style = directive.style ?? globalStyle ?? '';
      const img = await ctx.image.generate(`${scene.visualPrompt}. ${style}`.trim(), {
        size: directive.size ?? DEFAULT_IMAGE_SIZE,
        quality: directive.quality ?? 'high',
        displayName: `镜头 ${index + 1}`,
        assetMetadata: { sceneIndex: index },
      });
      return { kind: 'image', url: img.url };
    }
    // ai_video / library_match / user_upload land in later milestones; fall back
    // to ai_image so the pipeline stays runnable end-to-end for now.
    default: {
      const img = await ctx.image.generate(`${scene.visualPrompt}. ${globalStyle ?? ''}`.trim(), {
        size: DEFAULT_IMAGE_SIZE,
        quality: 'high',
        displayName: `镜头 ${index + 1}`,
        assetMetadata: { sceneIndex: index, requestedKind: directive.kind },
      });
      return { kind: 'image', url: img.url };
    }
  }
}

export const narratedStoryboardEngine: StructureEngine<NarratedStoryboardConfig, Input> = {
  id: 'narrated-storyboard',

  parseConfig(config: unknown): NarratedStoryboardConfig {
    const c = config as NarratedStoryboardConfig;
    if (!c || typeof c !== 'object') throw new Error('narrated-storyboard: config is required');
    if (!c.scriptPrompt || !c.scriptSystem) throw new Error('narrated-storyboard: scriptPrompt/scriptSystem required');
    if (!c.visual) throw new Error('narrated-storyboard: visual directive required');
    return c;
  },

  parseInput(input: unknown, _fields: TemplateField[]): Input {
    if (!input || typeof input !== 'object') throw new Error('input is required');
    return input as Input;
  },

  estimate(config: NarratedStoryboardConfig): ResourcePlan {
    const n = typeof config.sceneCount === 'number' ? config.sceneCount : (config.sceneRange?.[1] ?? 5);
    const usesVideo = config.visual.kind === 'ai_video';
    return { llmCalls: 1, images: usesVideo ? 0 : n, ttsChars: n * 90, draft: 1 };
  },

  async build(ctx: TemplateContext, config: NarratedStoryboardConfig, input: Input, globals?: RecipeGlobals): Promise<ResolvedVideo> {
    const maxScenes = typeof config.sceneCount === 'number' ? config.sceneCount : (config.sceneRange?.[1] ?? 6);
    const globalStyle = config.visual.kind === 'ai_image' ? config.visual.style : undefined;

    // 1. Script → structured scenes.
    const script = await ctx.stage('script', async () => {
      const prompt = fillTemplate(config.scriptPrompt, input);
      const data = await ctx.ai.generateJson<{ scenes: StoryboardScene[] }>(prompt, { system: config.scriptSystem });
      const scenes = (data.scenes ?? []).slice(0, maxScenes);
      if (scenes.length === 0) throw new Error('脚本生成为空');
      return { scenes };
    });

    // 2. One visual per scene (parallel + checkpointed).
    const visuals = await ctx.stage('image', async () =>
      ctx.mapItems(
        script.scenes,
        (scene, i) => resolveVisual(ctx, config.visual, scene, i, globalStyle),
        { concurrency: ctx.job.imageConcurrency, key: (_, i) => `visual:${i}` },
      ),
    );

    // 3. One voiceover per scene (subtitle-aligned), checkpointed.
    const voices = await ctx.stage('voice', async () => {
      const out: { url: string; durationMs: number; segments: { startMs: number; endMs: number; text: string }[] }[] = [];
      for (const [i, scene] of script.scenes.entries()) {
        const v = await ctx.item(`voice:${i}`, () =>
          ctx.tts.speak(scene.narration, { align: true, displayName: `配音 ${i + 1}`, voice: globals?.voice?.voice, speed: globals?.voice?.speed, emotion: globals?.voice?.emotion }),
        );
        const durationMs = v.durationMs ?? 3000;
        const segments = v.captions?.segments.map((s) => ({ startMs: s.startMs, endMs: s.endMs, text: s.text }))
          ?? [{ startMs: 0, endMs: durationMs, text: scene.narration }];
        out.push({ url: v.url, durationMs, segments });
      }
      return out;
    });

    // 4. Assemble the global timeline → Resolved IR.
    return await ctx.stage('caption', async () => {
      const shots: ShotDraft[] = script.scenes.map((_, i) => ({
        id: `s${i + 1}`,
        visual: visuals[i],
        audioUrl: voices[i].url,
        narrationDurationMs: voices[i].durationMs,
        captions: voices[i].segments,
        motion: config.motion,
        transitionIn: config.transition && config.transition.type !== 'none'
          ? { type: 'effect', id: config.transition.id, durationMs: config.transition.durationMs ?? 300 }
          : undefined,
      }));
      return assembleTimeline({
        canvas: globals?.canvas ?? { width: 1080, height: 1920 },
        shots,
        captionStyle: config.captionStyle,
        branding: globals?.branding,
        delivery: { draft: true, mp4: 'optional' },
        meta: { structure: 'narrated-storyboard', sceneCount: shots.length },
      });
    });
  },
};
