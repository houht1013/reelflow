// Recipe preview (sandbox) — runs a recipe end-to-end against real providers in
// a dev workspace, captures per-stage artifacts, and returns a PreviewResult for
// agent self-correction + human visual QA (and, later, the React Flow canvas).
//
// "Sandbox" = does NOT publish and does NOT bill an end-user (dev workspace,
// meter-only). It DOES call real providers, so it has real cost — guarded by a
// pre-flight cap. Uses a lightweight in-memory ctx (stages/checkpoints in
// memory; no job rows) so it stays preview≈prod without polluting the job table.
import { db } from '@libs/database';
import { user } from '@libs/database/schema';
import { eq } from 'drizzle-orm';
import type { ReelflowStageCode } from '../../constants';
import { generateReelflowText } from '../../llm';
import { generateReelflowImage } from '../../image-gen';
import { generateReelflowVoiceTrack } from '../../tts';
import { assembleResolvedVideo } from '../../capcut';
import { ProviderCallError } from '../../provider-runtime';
import { getDefaultWorkspaceForUser, ensureWorkspaceCreditAccount } from '../../workspaces';
import type { TemplateContext } from '../_sdk/types';
import type { VideoRecipe } from './recipe';
import type { ResolvedVideo } from './ir';
import { buildRecipeIR, estimateRecipe } from './runner';

export type PreviewShot = {
  index: number;
  visual: ResolvedVideo['shots'][number]['visual'];
  startMs: number;
  endMs: number;
  narration: string;
  audioUrl?: string;
};

export type PreviewResult = {
  recipe: { code: string; version: string; name: string; structure: string };
  input: unknown;
  script: unknown;
  shots: PreviewShot[];
  ir: ResolvedVideo;
  draftUrl: string | null;
  mp4Url: string | null;
  durationMs: number;
  estimate: ReturnType<typeof estimateRecipe>;
  errors: string[];
};

export type PreviewOptions = {
  /** Dev workspace owner. Falls back to REELFLOW_DEV_USER_ID or the first admin. */
  userId?: string;
  /** Pre-flight cap on storyboard images (cost guard). Default 16. */
  maxImages?: number;
  /** Render the MP4 via gen_video. Default true; pass false to skip (faster/cheaper). */
  mp4?: boolean;
};

async function resolveDevUserId(explicit?: string): Promise<string> {
  if (explicit) return explicit;
  if (process.env.REELFLOW_DEV_USER_ID) return process.env.REELFLOW_DEV_USER_ID;
  const [admin] = await db.select({ id: user.id }).from(user).where(eq(user.role, 'admin')).limit(1);
  if (admin) return admin.id;
  const [any] = await db.select({ id: user.id }).from(user).limit(1);
  if (!any) throw new Error('No user found for the preview dev workspace');
  return any.id;
}

/** Lightweight in-memory ctx: real providers, dev workspace, no job rows. */
function createPreviewContext(
  workspaceId: string,
  userId: string,
  capture: { script?: unknown },
): TemplateContext {
  const base = { workspaceId, userId, billing: 'meter-only' as const };
  return {
    job: { id: `preview-${crypto.randomUUID()}`, workspaceId, userId, renderMp4Requested: true, imageConcurrency: 1 },
    ai: {
      async generateText(prompt, opts) {
        const res = await generateReelflowText({ ...base, prompt, system: opts?.system, temperature: opts?.temperature, maxTokens: opts?.maxTokens, model: opts?.model });
        return res.text;
      },
      async generateJson<T = unknown>(prompt: string, opts?: { system?: string; temperature?: number; maxTokens?: number; model?: string }) {
        const res = await generateReelflowText({ ...base, prompt, system: opts?.system, temperature: opts?.temperature, maxTokens: opts?.maxTokens, model: opts?.model, responseFormat: 'json' });
        if (res.json === null) throw new ProviderCallError('LLM did not return valid JSON', 'generation_failed', 502);
        capture.script = res.json;
        return res.json as T;
      },
    },
    image: {
      async generate(prompt, opts) {
        const res = await generateReelflowImage({ ...base, prompt, size: opts?.size, quality: opts?.quality, host: true, displayName: opts?.displayName, assetMetadata: opts?.assetMetadata });
        return { url: res.image.imageUrl, assetId: res.asset.id, width: res.image.width, height: res.image.height };
      },
    },
    tts: {
      async speak(text, opts) {
        const res = await generateReelflowVoiceTrack({ ...base, text, voice: opts?.voice, emotion: opts?.emotion, speed: opts?.speed, align: opts?.align ?? true, displayName: opts?.displayName });
        return { url: res.audio.url, durationMs: res.audio.durationMs, captions: res.captions, assetId: res.audioAsset.id };
      },
    },
    oss: {
      async upload(file, opts) {
        const { storage } = await import('@libs/storage');
        const uploaded = await storage.uploadFile({ file, fileName: opts?.fileName ?? crypto.randomUUID(), contentType: opts?.contentType, folder: opts?.dir ?? 'reelflow/preview' });
        if (uploaded.url) return { url: uploaded.url, key: uploaded.key };
        const signed = await storage.generateSignedUrl({ key: uploaded.key, operation: 'get', expiresIn: 7 * 24 * 3600 });
        return { url: signed.url, key: uploaded.key };
      },
    },
    capcut: {
      async assemble() {
        throw new ProviderCallError('preview uses assembleResolvedVideo, not ctx.capcut.assemble', 'invalid_input', 400);
      },
    },
    // In-memory stage/checkpoint (preview is one-shot; no resume needed).
    async stage<T>(_code: ReelflowStageCode, fn: () => Promise<T>) { return fn(); },
    async item<T>(_key: string, fn: () => Promise<T>) { return fn(); },
    async mapItems<T, R>(items: readonly T[], fn: (item: T, i: number) => Promise<R>, opts?: { concurrency?: number }) {
      const concurrency = Math.max(1, Math.floor(opts?.concurrency ?? 1));
      const results = new Array<R>(items.length);
      let cursor = 0;
      const runner = async () => { while (cursor < items.length) { const i = cursor++; results[i] = await fn(items[i], i); } };
      await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, runner));
      return results;
    },
    async log() { /* preview logs go to stdout via the caller */ },
  };
}

export async function runRecipePreview(recipe: VideoRecipe, input: unknown, opts: PreviewOptions = {}): Promise<PreviewResult> {
  const estimate = estimateRecipe(recipe, input);
  const maxImages = opts.maxImages ?? 16;
  if ((estimate.images ?? 0) > maxImages) {
    throw new Error(`preview cost cap: estimate needs ${estimate.images} images > ${maxImages}. Lower sceneCount or raise --max-images.`);
  }

  const userId = await resolveDevUserId(opts.userId);
  const ws = await getDefaultWorkspaceForUser(userId);
  if (!ws) throw new Error(`No default workspace for dev user ${userId}`);
  await ensureWorkspaceCreditAccount(ws.id);

  const capture: { script?: unknown } = {};
  const ctx = createPreviewContext(ws.id, userId, capture);

  const ir = await buildRecipeIR(ctx, recipe, input);
  if (opts.mp4 === false) ir.delivery = { ...ir.delivery, mp4: 'off' };

  const draft = await assembleResolvedVideo({
    workspaceId: ws.id,
    userId,
    ir,
    billing: 'meter-only',
    displayName: recipe.name,
    assetMetadata: { preview: true, recipeCode: recipe.code, recipeVersion: recipe.version },
  });

  const shots: PreviewShot[] = ir.shots.map((s, i) => ({
    index: i,
    visual: s.visual,
    startMs: s.startMs,
    endMs: s.endMs,
    narration: s.captions.map((c) => c.text).join(''),
    audioUrl: s.audioUrl,
  }));

  return {
    recipe: { code: recipe.code, version: recipe.version, name: recipe.name, structure: recipe.structure },
    input,
    script: capture.script,
    shots,
    ir,
    draftUrl: draft.draftUrl,
    mp4Url: draft.mp4Url,
    durationMs: Number(ir.meta?.totalDurationMs ?? 0),
    estimate,
    errors: [],
  };
}
