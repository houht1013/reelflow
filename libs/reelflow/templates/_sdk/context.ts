// Builds the TemplateContext (ctx) injected into a template's run(). Binds every
// capability to the job (workspace/user/job/stage), forces meter-only billing
// (the job already froze an estimate), tracks stages with checkpointing, enforces
// a budget ceiling, and writes logs to the job timeline.
import { db } from '@libs/database';
import { jobEvent, jobStage, usageRecord } from '@libs/database/schema';
import { and, eq, sql } from 'drizzle-orm';
import type { ReelflowStageCode } from '../../constants';
import { ProviderCallError } from '../../provider-runtime';
import { generateReelflowText } from '../../llm';
import { generateReelflowImage } from '../../image-gen';
import { generateReelflowVoiceTrack } from '../../tts';
import { assembleReelflowDraft } from '../../capcut';
import type { TemplateContext } from './types';

const BUDGET_TOLERANCE = 1.2;

export type TemplateJob = {
  id: string;
  workspaceId: string;
  userId: string;
  frozenCredits: string;
  renderMp4Requested: boolean;
  /** Per-job storyboard image parallelism (1–5). Defaults to 1 if omitted. */
  imageConcurrency?: number;
};

export function createTemplateContext(job: TemplateJob): TemplateContext {
  const frozen = Number(job.frozenCredits || 0);
  const base = { workspaceId: job.workspaceId, userId: job.userId, jobId: job.id, billing: 'meter-only' as const };
  let currentStageId: string | null = null;

  async function meteredTotal(): Promise<number> {
    const [row] = await db
      .select({ total: sql<string>`COALESCE(SUM(CAST(${usageRecord.creditCost} AS DECIMAL)), 0)` })
      .from(usageRecord)
      .where(eq(usageRecord.jobId, job.id));
    return Number(row?.total || 0);
  }

  async function assertWithinBudget(): Promise<void> {
    if (frozen <= 0) return; // no estimate -> no ceiling
    const spent = await meteredTotal();
    if (spent > frozen * BUDGET_TOLERANCE) {
      throw new ProviderCallError(
        `Job budget exceeded: spent ${spent} > frozen ${frozen} x ${BUDGET_TOLERANCE}`,
        'insufficient_credits',
        402,
        { spent, frozen },
      );
    }
  }

  // Item-level checkpoint: memoize a single item's result into the current
  // stage's outputSnapshot under __items[key]. A stage failure leaves the
  // snapshot intact, so on retry already-completed items short-circuit here
  // instead of being regenerated and re-metered (prevents duplicate cost ->
  // actual>frozen -> debt/lock).
  async function item<T>(key: string, fn: () => Promise<T>): Promise<T> {
    if (!currentStageId) {
      throw new ProviderCallError('ctx.item() must be called inside ctx.stage()', 'invalid_input', 400);
    }
    const stageId = currentStageId;

    const [row] = await db
      .select({ outputSnapshot: jobStage.outputSnapshot })
      .from(jobStage)
      .where(eq(jobStage.id, stageId))
      .limit(1);
    const snapshot = (row?.outputSnapshot as { __items?: Record<string, unknown> } | null) ?? {};
    const items = snapshot.__items ?? {};
    if (Object.prototype.hasOwnProperty.call(items, key)) {
      return items[key] as T;
    }

    const result = await fn();

    // Persist this item with an atomic JSONB write to a single path
    // (output_snapshot.__items[key]). Postgres serializes concurrent UPDATEs on
    // the same row, so parallel items (mapItems) each land without clobbering
    // siblings — unlike a read-modify-write of the whole snapshot.
    await db.execute(sql`
      update job_stage
      set output_snapshot = jsonb_set(
            coalesce(output_snapshot, '{}'::jsonb),
            array['__items', ${key}],
            ${JSON.stringify(result ?? null)}::jsonb,
            true
          ),
          updated_at = now()
      where id = ${stageId}
    `);
    return result;
  }

  async function mapItems<T, R>(
    items: readonly T[],
    fn: (item: T, index: number) => Promise<R>,
    opts?: { concurrency?: number; key?: (item: T, index: number) => string },
  ): Promise<R[]> {
    const concurrency = Math.max(1, Math.floor(opts?.concurrency ?? 1));
    const keyOf = opts?.key ?? ((_: T, i: number) => String(i));
    const results = new Array<R>(items.length);
    let cursor = 0;
    async function runner() {
      while (true) {
        const i = cursor++;
        if (i >= items.length) return;
        results[i] = await item(keyOf(items[i], i), () => fn(items[i], i));
      }
    }
    const lanes = Math.min(concurrency, items.length);
    await Promise.all(Array.from({ length: lanes }, () => runner()));
    return results;
  }

  async function log(level: 'info' | 'warn' | 'error', message: string, data?: Record<string, unknown>): Promise<void> {
    await db.insert(jobEvent).values({
      id: crypto.randomUUID(),
      jobId: job.id,
      stageId: currentStageId,
      level,
      eventType: 'template_log',
      message,
      data: data ?? {},
      createdAt: new Date(),
    });
  }

  async function stage<T>(code: ReelflowStageCode, fn: () => Promise<T>): Promise<T> {
    const [row] = await db
      .select({ id: jobStage.id, status: jobStage.status, outputSnapshot: jobStage.outputSnapshot })
      .from(jobStage)
      .where(and(eq(jobStage.jobId, job.id), eq(jobStage.stageCode, code)))
      .limit(1);

    if (!row) {
      throw new ProviderCallError(`Stage '${code}' is not declared for this job`, 'invalid_input', 400);
    }

    // Checkpoint: a previously completed stage is reused on retry (no re-spend).
    const cached = row.outputSnapshot as { __cache?: boolean; result?: unknown } | null;
    if (row.status === 'completed' && cached?.__cache) {
      return cached.result as T;
    }

    await assertWithinBudget();

    await db
      .update(jobStage)
      .set({ status: 'running', startedAt: new Date(), attemptCount: sql`${jobStage.attemptCount} + 1`, updatedAt: new Date() })
      .where(eq(jobStage.id, row.id));
    await db.insert(jobEvent).values({
      id: crypto.randomUUID(), jobId: job.id, stageId: row.id, level: 'info',
      eventType: 'stage_started', message: `Stage started: ${code}`, data: { stageCode: code }, createdAt: new Date(),
    });

    const previousStageId = currentStageId;
    currentStageId = row.id;
    try {
      const result = await fn();
      await db
        .update(jobStage)
        .set({ status: 'completed', outputSnapshot: { __cache: true, result }, completedAt: new Date(), updatedAt: new Date() })
        .where(eq(jobStage.id, row.id));
      await db.insert(jobEvent).values({
        id: crypto.randomUUID(), jobId: job.id, stageId: row.id, level: 'info',
        eventType: 'stage_completed', message: `Stage completed: ${code}`, data: { stageCode: code }, createdAt: new Date(),
      });
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Stage failed';
      await db
        .update(jobStage)
        .set({ status: 'failed', errorMessage: message.slice(0, 1000), updatedAt: new Date() })
        .where(eq(jobStage.id, row.id));
      await db.insert(jobEvent).values({
        id: crypto.randomUUID(), jobId: job.id, stageId: row.id, level: 'error',
        eventType: 'stage_failed', message: `Stage failed: ${code}`, data: { stageCode: code, error: message.slice(0, 500) }, createdAt: new Date(),
      });
      throw error;
    } finally {
      currentStageId = previousStageId;
    }
  }

  const ctx: TemplateContext = {
    job: {
      id: job.id,
      workspaceId: job.workspaceId,
      userId: job.userId,
      renderMp4Requested: job.renderMp4Requested,
      imageConcurrency: Math.max(1, Math.floor(job.imageConcurrency ?? 1)),
    },

    ai: {
      async generateText(prompt, opts) {
        const res = await generateReelflowText({ ...base, stageId: currentStageId ?? undefined, prompt, system: opts?.system, temperature: opts?.temperature, maxTokens: opts?.maxTokens, model: opts?.model });
        return res.text;
      },
      async generateJson<T = unknown>(prompt: string, opts?: { system?: string; temperature?: number; maxTokens?: number; model?: string }) {
        const res = await generateReelflowText({ ...base, stageId: currentStageId ?? undefined, prompt, system: opts?.system, temperature: opts?.temperature, maxTokens: opts?.maxTokens, model: opts?.model, responseFormat: 'json' });
        if (res.json === null) {
          throw new ProviderCallError('LLM did not return valid JSON', 'generation_failed', 502);
        }
        return res.json as T;
      },
    },

    image: {
      async generate(prompt, opts) {
        const res = await generateReelflowImage({ ...base, stageId: currentStageId ?? undefined, prompt, size: opts?.size, quality: opts?.quality, host: true, displayName: opts?.displayName, assetMetadata: opts?.assetMetadata });
        return { url: res.image.imageUrl, assetId: res.asset.id, width: res.image.width, height: res.image.height };
      },
    },

    tts: {
      async speak(text, opts) {
        const res = await generateReelflowVoiceTrack({ ...base, stageId: currentStageId ?? undefined, text, voice: opts?.voice, emotion: opts?.emotion, speed: opts?.speed, align: opts?.align ?? true, displayName: opts?.displayName });
        return { url: res.audio.url, durationMs: res.audio.durationMs, captions: res.captions, assetId: res.audioAsset.id };
      },
    },

    oss: {
      async upload(file, opts) {
        const { storage } = await import('@libs/storage');
        const fileName = opts?.fileName ?? `${crypto.randomUUID()}`;
        const uploaded = await storage.uploadFile({ file, fileName, contentType: opts?.contentType, folder: opts?.dir ?? 'reelflow/uploads' });
        if (uploaded.url) return { url: uploaded.url, key: uploaded.key };
        const signed = await storage.generateSignedUrl({ key: uploaded.key, operation: 'get', expiresIn: 7 * 24 * 3600 });
        return { url: signed.url, key: uploaded.key };
      },
    },

    capcut: {
      async assemble(input) {
        const res = await assembleReelflowDraft({ ...base, stageId: currentStageId ?? undefined, width: input.width, height: input.height, scenes: input.scenes, audios: input.audios, captions: input.captions, captionStyle: input.captionStyle, displayName: input.displayName });
        return { draftUrl: res.draftUrl, assetId: res.asset?.id ?? null };
      },
    },

    stage,
    item,
    mapItems,
    log,
  };

  return ctx;
}
