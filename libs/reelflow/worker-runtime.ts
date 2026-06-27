import { db } from '@libs/database';
import { reelflowConfig } from '@config';
import {
  asset,
  creditAccount,
  creditLedger,
  job,
  jobAttempt,
  jobEvent,
  jobQualityIssue,
  jobStage,
  template,
  usageRecord,
  workspace,
} from '@libs/database/schema';
import { refundCreditLots } from './credit-lots';
import { and, asc, desc, eq, sql } from 'drizzle-orm';
import { renderCloudMp4, type CloudRenderResult } from './cloud-render';
import { buildDraftPackageMetadata, getDraftPackageStorageKey } from './draft-package';
import { notifyReelflowJobCompleted, notifyReelflowJobFailed } from './notifications';
import { canClaimWorkspaceJob, resolveWorkspaceConcurrentJobLimit, resolveWorkspaceImageConcurrency } from './worker-limits';
import { resolveTemplate } from './templates/loader';
import { createSdk } from './sdk';
import type { TemplateRunOutput } from './templates/_sdk/types';

// Stabilize outbound fetch for long-running provider calls on Windows/Node 24:
// don't reuse idle keep-alive sockets (the proxy closes them, surfacing as undici
// "terminated"), and allow generous timeouts for slow reasoning/image models.
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { setGlobalDispatcher, Agent } = require('undici') as typeof import('undici');
  setGlobalDispatcher(new Agent({ keepAliveTimeout: 1000, keepAliveMaxTimeout: 1000, headersTimeout: 600_000, bodyTimeout: 600_000 }));
} catch {
  // undici not available (e.g. edge runtime) — fall back to the default dispatcher.
}

export type ClaimedJob = {
  id: string;
  workspaceId: string;
  createdByUserId: string;
  templateId: string;
  frozenCredits: string;
  attemptNo: number;
  renderMp4Requested: boolean;
};

export type ProcessOneJobResult =
  | { processed: false; reason: 'empty_queue' }
  | { processed: true; jobId: string; status: 'completed' | 'failed' };

type WorkerExecutionMode = 'mock' | 'local_draft';

export async function claimNextJob(workerId: string): Promise<ClaimedJob | null> {
  return db.transaction(async (tx) => {
    const candidates = await tx
      .select({
        id: job.id,
        workspaceId: job.workspaceId,
        workspaceSettings: workspace.settings,
      })
      .from(job)
      .innerJoin(workspace, eq(job.workspaceId, workspace.id))
      .where(eq(job.status, 'queued'))
      .orderBy(desc(job.priority), asc(job.createdAt))
      .limit(25);

    if (candidates.length === 0) return null;

    for (const candidate of candidates) {
      const concurrentJobLimit = resolveWorkspaceConcurrentJobLimit(
        candidate.workspaceSettings,
        reelflowConfig.worker.workspaceDefaultConcurrentJobs,
      );
      const [runningCount] = await tx
        .select({ count: sql<number>`count(*)::int` })
        .from(job)
        .where(and(eq(job.workspaceId, candidate.workspaceId), eq(job.status, 'running')));

      if (!canClaimWorkspaceJob({ runningJobs: runningCount?.count || 0, concurrentJobLimit })) {
        continue;
      }

      const [claimed] = await tx
        .update(job)
        .set({
          status: 'running',
          lockedBy: workerId,
          lockedAt: new Date(),
          startedAt: new Date(),
          attemptCount: sql`${job.attemptCount} + 1`,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(job.id, candidate.id),
            eq(job.status, 'queued'),
            sql`(
              select count(*)::int
              from "job" running_job
              where running_job.workspace_id = ${candidate.workspaceId}
                and running_job.status = 'running'
            ) < ${concurrentJobLimit}`,
          ),
        )
        .returning({
          id: job.id,
          workspaceId: job.workspaceId,
          createdByUserId: job.createdByUserId,
          templateId: job.templateId,
          frozenCredits: job.frozenCredits,
          attemptNo: job.attemptCount,
          renderMp4Requested: job.renderMp4Requested,
        });

      if (!claimed) continue;

      await tx.insert(jobAttempt).values({
        id: crypto.randomUUID(),
        jobId: claimed.id,
        attemptNo: claimed.attemptNo,
        triggerType: claimed.attemptNo === 1 ? 'initial' : 'retry_failed',
        workerId,
        status: 'running',
        metadata: {
          mode: getWorkerExecutionMode(),
          concurrentJobLimit,
        },
        startedAt: new Date(),
      });

      await tx.insert(jobEvent).values({
        id: crypto.randomUUID(),
        jobId: claimed.id,
        level: 'info',
        eventType: 'job_claimed',
        message: `Job claimed by ${workerId}`,
        data: { workerId, attemptNo: claimed.attemptNo, concurrentJobLimit },
        createdAt: new Date(),
      });

      return claimed;
    }

    return null;
  });
}

// Claim one specific queued job by id (used by the in-process task queue, which
// already knows which job to run). Atomic queued->running transition with the
// same per-workspace concurrency guard as the polling claim. Returns null if the
// job is gone, already taken, or the workspace is at its concurrent limit.
export async function claimJobById(jobId: string, workerId: string): Promise<ClaimedJob | null> {
  return db.transaction(async (tx) => {
    const [candidate] = await tx
      .select({ id: job.id, workspaceId: job.workspaceId, status: job.status, workspaceSettings: workspace.settings })
      .from(job)
      .innerJoin(workspace, eq(job.workspaceId, workspace.id))
      .where(eq(job.id, jobId))
      .limit(1);

    if (!candidate || candidate.status !== 'queued') return null;

    const concurrentJobLimit = resolveWorkspaceConcurrentJobLimit(
      candidate.workspaceSettings,
      reelflowConfig.worker.workspaceDefaultConcurrentJobs,
    );

    const [claimed] = await tx
      .update(job)
      .set({
        status: 'running',
        lockedBy: workerId,
        lockedAt: new Date(),
        startedAt: new Date(),
        attemptCount: sql`${job.attemptCount} + 1`,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(job.id, jobId),
          eq(job.status, 'queued'),
          sql`(
            select count(*)::int
            from "job" running_job
            where running_job.workspace_id = ${candidate.workspaceId}
              and running_job.status = 'running'
          ) < ${concurrentJobLimit}`,
        ),
      )
      .returning({
        id: job.id,
        workspaceId: job.workspaceId,
        createdByUserId: job.createdByUserId,
        templateId: job.templateId,
        frozenCredits: job.frozenCredits,
        attemptNo: job.attemptCount,
        renderMp4Requested: job.renderMp4Requested,
      });

    if (!claimed) return null;

    await tx.insert(jobAttempt).values({
      id: crypto.randomUUID(),
      jobId: claimed.id,
      attemptNo: claimed.attemptNo,
      triggerType: claimed.attemptNo === 1 ? 'initial' : 'retry_failed',
      workerId,
      status: 'running',
      metadata: { mode: getWorkerExecutionMode(), concurrentJobLimit, trigger: 'task_queue' },
      startedAt: new Date(),
    });

    await tx.insert(jobEvent).values({
      id: crypto.randomUUID(),
      jobId: claimed.id,
      level: 'info',
      eventType: 'job_claimed',
      message: `Job claimed by ${workerId}`,
      data: { workerId, attemptNo: claimed.attemptNo, concurrentJobLimit, trigger: 'task_queue' },
      createdAt: new Date(),
    });

    return claimed;
  });
}

// Run a job that has already been claimed (status === 'running'). Shared by the
// polling worker (processOneJob) and the in-process task queue (runReelflowJobById).
export async function runClaimedJob(claimed: ClaimedJob): Promise<ProcessOneJobResult> {
  const executionMode = getWorkerExecutionMode();

  // Resolve the in-repo template. If found, run the real template pipeline;
  // otherwise fall back to the legacy mock / local_draft trace behavior.
  const [jobRow] = await db
    .select({ inputParams: job.inputParams, templateCode: template.code })
    .from(job)
    .innerJoin(template, eq(job.templateId, template.id))
    .where(eq(job.id, claimed.id))
    .limit(1);
  // Resolve by code: built-in registry first, then a runtime-loaded template
  // file from the dynamic dir (B model — no rebuild needed).
  const registryTemplate = jobRow ? await resolveTemplate(jobRow.templateCode) : undefined;

  if (registryTemplate) {
    try {
      const input = registryTemplate.schema.parse(jobRow!.inputParams);
      const [ws] = await db
        .select({ settings: workspace.settings })
        .from(workspace)
        .where(eq(workspace.id, claimed.workspaceId))
        .limit(1);
      const imageConcurrency = resolveWorkspaceImageConcurrency(
        ws?.settings,
        reelflowConfig.imageConcurrency.default,
        reelflowConfig.imageConcurrency.max,
      );
      const ctx = createSdk({
        id: claimed.id,
        workspaceId: claimed.workspaceId,
        userId: claimed.createdByUserId,
        frozenCredits: claimed.frozenCredits,
        renderMp4Requested: claimed.renderMp4Requested,
        imageConcurrency,
      });
      const output = await registryTemplate.run(ctx, input);
      await completeTemplateJob(claimed, output);
      return { processed: true, jobId: claimed.id, status: 'completed' };
    } catch (error) {
      await failClaimedJob(claimed, error);
      return { processed: true, jobId: claimed.id, status: 'failed' };
    }
  }

  try {
    const stages = await db
      .select()
      .from(jobStage)
      .where(eq(jobStage.jobId, claimed.id))
      .orderBy(asc(jobStage.sortOrder));

    for (const stage of stages) {
      if (stage.status === 'completed' || stage.status === 'skipped' || stage.status === 'needs_fix') {
        continue;
      }

      await db.transaction(async (tx) => {
        const [runningStage] = await tx
          .update(jobStage)
          .set({
            status: 'running',
            startedAt: new Date(),
            attemptCount: sql`${jobStage.attemptCount} + 1`,
            updatedAt: new Date(),
          })
          .where(eq(jobStage.id, stage.id))
          .returning({ id: jobStage.id, stageCode: jobStage.stageCode });

        if (!runningStage) return;

        await tx.insert(jobEvent).values({
          id: crypto.randomUUID(),
          jobId: claimed.id,
          stageId: runningStage.id,
          level: 'info',
          eventType: 'stage_started',
          message: `Stage started: ${runningStage.stageCode}`,
          data: { stageCode: runningStage.stageCode, mode: executionMode },
          createdAt: new Date(),
        });

        await tx
          .update(jobStage)
          .set({
            status: 'completed',
            outputSnapshot: {
              mode: executionMode,
              note:
                executionMode === 'local_draft'
                  ? 'Stage completed by the local draft adapter.'
                  : 'Stage state transition verified. Real provider execution is not connected yet.',
            },
            completedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(jobStage.id, runningStage.id));

        await tx.insert(jobEvent).values({
          id: crypto.randomUUID(),
          jobId: claimed.id,
          stageId: runningStage.id,
          level: 'info',
          eventType: 'stage_completed',
          message: `Stage completed: ${runningStage.stageCode}`,
          data: { stageCode: runningStage.stageCode, mode: executionMode },
          createdAt: new Date(),
        });
      });
    }

    if (executionMode === 'local_draft') {
      await completeLocalDraftJob(claimed);
    } else {
      await completeMockJob(claimed);
    }
    return { processed: true, jobId: claimed.id, status: 'completed' };
  } catch (error) {
    await failClaimedJob(claimed, error);
    return { processed: true, jobId: claimed.id, status: 'failed' };
  }
}

// Polling entry point (standalone worker daemon): claim the next queued job and run it.
export async function processOneJob(workerId: string): Promise<ProcessOneJobResult> {
  const claimed = await claimNextJob(workerId);
  if (!claimed) return { processed: false, reason: 'empty_queue' };
  return runClaimedJob(claimed);
}

// Direct entry point (in-process task queue): claim a specific job by id and run it.
// Returns empty_queue if the job was already taken / not claimable.
export async function runReelflowJobById(jobId: string, workerId: string): Promise<ProcessOneJobResult> {
  const claimed = await claimJobById(jobId, workerId);
  if (!claimed) return { processed: false, reason: 'empty_queue' };
  return runClaimedJob(claimed);
}

// Settle a template-driven job: assets + usage were already recorded by the
// template via ctx; here we reconcile credits (metered actual vs frozen estimate),
// close the settlement/notify stages, and finalize the job.
async function completeTemplateJob(claimed: ClaimedJob, output: TemplateRunOutput): Promise<void> {
  const frozen = Number(claimed.frozenCredits || 0);
  let actual = 0;

  await db.transaction(async (tx) => {
    const [usageTotal] = await tx
      .select({ total: sql<string>`COALESCE(SUM(CAST(${usageRecord.creditCost} AS DECIMAL)), 0)` })
      .from(usageRecord)
      .where(eq(usageRecord.jobId, claimed.id));
    actual = Math.round(Number(usageTotal?.total || 0) * 100) / 100;

    const consumedFromFrozen = Math.min(actual, frozen);
    const refund = Math.round(Math.max(0, frozen - consumedFromFrozen) * 100) / 100;
    const debt = Math.round(Math.max(0, actual - frozen) * 100) / 100;
    const downloadable = debt <= 0;

    const [updatedAccount] = await tx
      .update(creditAccount)
      .set({
        balance: refund > 0 ? sql`${creditAccount.balance} + ${refund}` : creditAccount.balance,
        frozenBalance: sql`${creditAccount.frozenBalance} - ${frozen}`,
        totalConsumed: sql`${creditAccount.totalConsumed} + ${consumedFromFrozen}`,
        debtBalance: debt > 0 ? sql`${creditAccount.debtBalance} + ${debt}` : creditAccount.debtBalance,
        updatedAt: new Date(),
      })
      .where(eq(creditAccount.workspaceId, claimed.workspaceId))
      .returning({
        balance: creditAccount.balance,
        frozenBalance: creditAccount.frozenBalance,
        debtBalance: creditAccount.debtBalance,
      });

    // Close worker-owned stages (settlement, notify) if they were seeded.
    const now = new Date();
    for (const code of ['settlement', 'notify'] as const) {
      await tx
        .update(jobStage)
        .set({ status: 'completed', startedAt: now, completedAt: now, updatedAt: now })
        .where(and(eq(jobStage.jobId, claimed.id), eq(jobStage.stageCode, code), sql`${jobStage.status} <> 'completed'`));
    }

    await tx
      .update(jobAttempt)
      .set({ status: 'completed', endedAt: now })
      .where(and(eq(jobAttempt.jobId, claimed.id), eq(jobAttempt.attemptNo, claimed.attemptNo)));

    await tx.insert(creditLedger).values({
      id: crypto.randomUUID(),
      workspaceId: claimed.workspaceId,
      userId: claimed.createdByUserId,
      jobId: claimed.id,
      type: 'settlement',
      amount: `-${consumedFromFrozen}`,
      balanceAfter: updatedAccount?.balance ?? '0',
      frozenAfter: updatedAccount?.frozenBalance ?? '0',
      debtAfter: updatedAccount?.debtBalance ?? '0',
      description: `Settle Reelflow template job ${claimed.id}`,
      metadata: { mode: 'template', actual, frozen, refund, debt, draftUrl: output.draftUrl },
      createdAt: now,
    });

    if (refund > 0) {
      await tx.insert(creditLedger).values({
        id: crypto.randomUUID(),
        workspaceId: claimed.workspaceId,
        userId: claimed.createdByUserId,
        jobId: claimed.id,
        type: 'refund',
        amount: refund.toString(),
        balanceAfter: updatedAccount?.balance ?? '0',
        frozenAfter: updatedAccount?.frozenBalance ?? '0',
        debtAfter: updatedAccount?.debtBalance ?? '0',
        description: `Refund unused frozen credits for Reelflow job ${claimed.id}`,
        metadata: { mode: 'template', actual, frozen },
        createdAt: now,
      });
    }

    // Freeze consumed lots up front; return the unused remainder to a lot.
    if (refund > 0) {
      await refundCreditLots(tx, { workspaceId: claimed.workspaceId, userId: claimed.createdByUserId, amount: refund, metadata: { jobId: claimed.id, kind: 'settle_refund' } });
    }

    await tx
      .update(job)
      .set({
        status: 'completed',
        artifactStatus: downloadable ? 'downloadable' : 'locked',
        actualCredits: actual.toString(),
        frozenCredits: '0',
        settlementStatus: debt > 0 ? 'debt' : 'settled',
        debtCredits: debt > 0 ? debt.toString() : '0',
        lockedBy: null,
        lockedAt: null,
        completedAt: now,
        updatedAt: now,
      })
      .where(eq(job.id, claimed.id));

    await tx.insert(jobEvent).values({
      id: crypto.randomUUID(),
      jobId: claimed.id,
      level: 'info',
      eventType: 'job_completed_template',
      message: 'Template pipeline completed.',
      data: { actual, frozen, refund, debt, draftUrl: output.draftUrl, summary: output.summary },
      createdAt: now,
    });
  });

  notifyReelflowJobCompleted({
    workspaceId: claimed.workspaceId,
    userId: claimed.createdByUserId,
    jobId: claimed.id,
    artifactStatus: actual > frozen ? 'locked' : 'downloadable',
    actualCredits: actual,
    downloadable: actual <= frozen,
  }).catch((error) => {
    console.error('Failed to create Reelflow template completion notification:', error);
  });
}

function getWorkerExecutionMode(): WorkerExecutionMode {
  return reelflowConfig.worker.executionMode === 'local_draft' ? 'local_draft' : 'mock';
}

async function completeMockJob(claimed: ClaimedJob): Promise<void> {
  const frozenCredits = Number(claimed.frozenCredits || 0);

  await db.transaction(async (tx) => {
    const stages = await tx
      .select({
        id: jobStage.id,
        stageCode: jobStage.stageCode,
      })
      .from(jobStage)
      .where(eq(jobStage.jobId, claimed.id));
    const stageIdByCode = new Map(stages.map((stage) => [stage.stageCode, stage.id]));

    const mockAssets = buildTraceAssets(claimed, stageIdByCode, 'mock');
    const insertedAssets = mockAssets.length
      ? await tx.insert(asset).values(mockAssets).returning({
          id: asset.id,
          assetType: asset.assetType,
          stageId: asset.stageId,
        })
      : [];
    const assetIdByType = new Map(insertedAssets.map((item) => [item.assetType, item.id]));

    const mockUsage = buildUsageRecords(claimed, stageIdByCode, assetIdByType, 'mock', 0, claimed.renderMp4Requested);
    if (mockUsage.length) {
      await tx.insert(usageRecord).values(mockUsage);
    }

    const draftStageId = stageIdByCode.get('draft_package') ?? stageIdByCode.get('compose_project');
    await tx.insert(jobQualityIssue).values({
      id: crypto.randomUUID(),
      jobId: claimed.id,
      stageId: draftStageId,
      assetId: assetIdByType.get('draft_package'),
      issueType: 'draft_issue',
      severity: 'medium',
      status: 'open',
      message: 'Mock execution produced trace records only. A real provider is required before draft download.',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const [updatedAccount] = await tx
      .update(creditAccount)
      .set({
        balance: sql`${creditAccount.balance} + ${frozenCredits}`,
        frozenBalance: sql`${creditAccount.frozenBalance} - ${frozenCredits}`,
        updatedAt: new Date(),
      })
      .where(eq(creditAccount.workspaceId, claimed.workspaceId))
      .returning({
        balance: creditAccount.balance,
        frozenBalance: creditAccount.frozenBalance,
        debtBalance: creditAccount.debtBalance,
      });

    if (frozenCredits > 0) {
      await refundCreditLots(tx, { workspaceId: claimed.workspaceId, userId: claimed.createdByUserId, amount: frozenCredits, metadata: { jobId: claimed.id, kind: 'mock_unfreeze' } });
    }

    await tx
      .update(job)
      .set({
        status: 'completed',
        qualityStatus: 'needs_fix',
        artifactStatus: 'locked',
        actualCredits: '0',
        frozenCredits: '0',
        settlementStatus: 'refunded',
        lockedBy: null,
        lockedAt: null,
        completedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(job.id, claimed.id));

    await tx
      .update(jobAttempt)
      .set({
        status: 'completed',
        endedAt: new Date(),
      })
      .where(and(eq(jobAttempt.jobId, claimed.id), eq(jobAttempt.attemptNo, claimed.attemptNo)));

    await tx.insert(creditLedger).values({
      id: crypto.randomUUID(),
      workspaceId: claimed.workspaceId,
      userId: claimed.createdByUserId,
      jobId: claimed.id,
      type: 'refund',
      amount: frozenCredits.toString(),
      balanceAfter: updatedAccount?.balance ?? '0',
      frozenAfter: updatedAccount?.frozenBalance ?? '0',
      debtAfter: updatedAccount?.debtBalance ?? '0',
      description: `Refund mock execution frozen credits for Reelflow job ${claimed.id}`,
      metadata: {
        mode: 'mock',
        reason: 'Real provider execution is not connected yet.',
      },
      createdAt: new Date(),
    });

    await tx.insert(jobEvent).values({
      id: crypto.randomUUID(),
      jobId: claimed.id,
      level: 'warn',
      eventType: 'job_completed_mock',
      message: 'Mock execution completed with trace assets and zero-cost usage. No downloadable draft or video was produced.',
      data: {
        refundedCredits: frozenCredits,
        assetCount: mockAssets.length,
        usageCount: mockUsage.length,
      },
      createdAt: new Date(),
    });
  });

  notifyReelflowJobCompleted({
    workspaceId: claimed.workspaceId,
    userId: claimed.createdByUserId,
    jobId: claimed.id,
    artifactStatus: 'locked',
    actualCredits: 0,
    downloadable: false,
  }).catch((error) => {
    console.error('Failed to create Reelflow mock completion notification:', error);
  });
}

async function completeLocalDraftJob(claimed: ClaimedJob): Promise<void> {
  const frozenCredits = Number(claimed.frozenCredits || 0);
  const renderCreditEstimate = claimed.renderMp4Requested ? Math.min(20, frozenCredits) : 0;
  let renderResult: CloudRenderResult | null = null;
  let renderErrorMessage: string | null = null;

  if (claimed.renderMp4Requested) {
    try {
      renderResult = await renderCloudMp4({
        jobId: claimed.id,
        workspaceId: claimed.workspaceId,
        templateId: claimed.templateId,
        draftPackageStorageKey: getDraftPackageStorageKey(claimed.id),
        durationSeconds: 45,
      });
    } catch (error) {
      renderErrorMessage = error instanceof Error ? error.message : 'Cloud render failed';
    }
  }

  const actualCredits = renderErrorMessage ? Math.max(0, frozenCredits - renderCreditEstimate) : frozenCredits;
  const refundCredits = Math.max(0, frozenCredits - actualCredits);

  await db.transaction(async (tx) => {
    const stages = await tx
      .select({
        id: jobStage.id,
        stageCode: jobStage.stageCode,
      })
      .from(jobStage)
      .where(eq(jobStage.jobId, claimed.id));
    const stageIdByCode = new Map(stages.map((stage) => [stage.stageCode, stage.id]));

    const draftAssets = buildTraceAssets(claimed, stageIdByCode, 'local_draft', renderResult);
    const insertedAssets = draftAssets.length
      ? await tx.insert(asset).values(draftAssets).returning({
          id: asset.id,
          assetType: asset.assetType,
          stageId: asset.stageId,
        })
      : [];
    const assetIdByType = new Map(insertedAssets.map((item) => [item.assetType, item.id]));

    const usage = buildUsageRecords(claimed, stageIdByCode, assetIdByType, 'local_draft', actualCredits, Boolean(renderResult));
    if (usage.length) {
      await tx.insert(usageRecord).values(usage);
    }

    const draftStageId = stageIdByCode.get('draft_package') ?? stageIdByCode.get('compose_project');
    await tx.insert(jobQualityIssue).values({
      id: crypto.randomUUID(),
      jobId: claimed.id,
      stageId: draftStageId,
      assetId: assetIdByType.get('draft_package'),
      issueType: 'draft_issue',
      severity: 'medium',
      status: 'open',
      message: 'Draft package is downloadable, but image and audio assets are placeholders until real providers are connected.',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    if (renderErrorMessage) {
      const renderStageId = stageIdByCode.get('render_mp4');
      if (renderStageId) {
        await tx
          .update(jobStage)
          .set({
            status: 'needs_fix',
            errorCode: 'cloud_render_failed',
            errorMessage: renderErrorMessage,
            updatedAt: new Date(),
          })
          .where(eq(jobStage.id, renderStageId));
      }

      await tx.insert(jobQualityIssue).values({
        id: crypto.randomUUID(),
        jobId: claimed.id,
        stageId: renderStageId,
        issueType: 'render_issue',
        severity: 'medium',
        status: 'open',
        message: `MP4 render did not complete: ${renderErrorMessage}`,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    const [updatedAccount] = await tx
      .update(creditAccount)
      .set({
        balance: refundCredits > 0 ? sql`${creditAccount.balance} + ${refundCredits}` : creditAccount.balance,
        frozenBalance: sql`${creditAccount.frozenBalance} - ${frozenCredits}`,
        totalConsumed: sql`${creditAccount.totalConsumed} + ${actualCredits}`,
        updatedAt: new Date(),
      })
      .where(eq(creditAccount.workspaceId, claimed.workspaceId))
      .returning({
        balance: creditAccount.balance,
        frozenBalance: creditAccount.frozenBalance,
        debtBalance: creditAccount.debtBalance,
      });

    if (refundCredits > 0) {
      await refundCreditLots(tx, { workspaceId: claimed.workspaceId, userId: claimed.createdByUserId, amount: refundCredits, metadata: { jobId: claimed.id, kind: 'settle_refund' } });
    }

    await tx
      .update(job)
      .set({
        status: 'completed',
        qualityStatus: 'needs_fix',
        artifactStatus: 'downloadable',
        actualCredits: actualCredits.toString(),
        frozenCredits: '0',
        settlementStatus: 'settled',
        lockedBy: null,
        lockedAt: null,
        completedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(job.id, claimed.id));

    await tx
      .update(jobAttempt)
      .set({
        status: 'completed',
        endedAt: new Date(),
      })
      .where(and(eq(jobAttempt.jobId, claimed.id), eq(jobAttempt.attemptNo, claimed.attemptNo)));

    await tx.insert(creditLedger).values({
      id: crypto.randomUUID(),
      workspaceId: claimed.workspaceId,
      userId: claimed.createdByUserId,
      jobId: claimed.id,
      type: 'settlement',
      amount: `-${actualCredits}`,
      balanceAfter: updatedAccount?.balance ?? '0',
      frozenAfter: updatedAccount?.frozenBalance ?? '0',
      debtAfter: updatedAccount?.debtBalance ?? '0',
      description: `Settle Reelflow local draft package for job ${claimed.id}`,
      metadata: {
        mode: 'local_draft',
        actualCredits,
        refundedCredits: refundCredits,
        packageAssetId: assetIdByType.get('draft_package'),
        renderedMp4AssetId: assetIdByType.get('rendered_mp4'),
      },
      createdAt: new Date(),
    });

    if (refundCredits > 0) {
      await tx.insert(creditLedger).values({
        id: crypto.randomUUID(),
        workspaceId: claimed.workspaceId,
        userId: claimed.createdByUserId,
        jobId: claimed.id,
        type: 'refund',
        amount: refundCredits.toString(),
        balanceAfter: updatedAccount?.balance ?? '0',
        frozenAfter: updatedAccount?.frozenBalance ?? '0',
        debtAfter: updatedAccount?.debtBalance ?? '0',
        description: `Refund failed MP4 render credits for Reelflow job ${claimed.id}`,
        metadata: {
          mode: 'local_draft',
          reason: renderErrorMessage,
          renderCreditEstimate,
        },
        createdAt: new Date(),
      });
    }

    await tx.insert(jobEvent).values({
      id: crypto.randomUUID(),
      jobId: claimed.id,
      level: 'info',
      eventType: 'job_completed_local_draft',
      message: 'Local draft package completed and is ready to download.',
      data: {
        actualCredits,
        refundedCredits: refundCredits,
        assetCount: draftAssets.length,
        usageCount: usage.length,
        packageAssetId: assetIdByType.get('draft_package'),
        renderedMp4AssetId: assetIdByType.get('rendered_mp4'),
        renderErrorMessage,
      },
      createdAt: new Date(),
    });
  });

  notifyReelflowJobCompleted({
    workspaceId: claimed.workspaceId,
    userId: claimed.createdByUserId,
    jobId: claimed.id,
    artifactStatus: 'downloadable',
    actualCredits,
    downloadable: true,
  }).catch((error) => {
    console.error('Failed to create Reelflow local draft completion notification:', error);
  });
}

type StageIdByCode = Map<string, string>;
type MockAssetDefinition = {
  assetType: string;
  stageCode: string;
  fileName: string;
  note: string;
};

function buildTraceAssets(
  claimed: ClaimedJob,
  stageIdByCode: StageIdByCode,
  mode: WorkerExecutionMode,
  renderResult: CloudRenderResult | null = null,
) {
  const now = new Date();
  const isLocalDraft = mode === 'local_draft';
  const base = {
    workspaceId: claimed.workspaceId,
    createdByUserId: claimed.createdByUserId,
    jobId: claimed.id,
    templateId: claimed.templateId,
    sourceType: 'generated',
    storageProvider: isLocalDraft ? 'reelflow-local' : 'mock',
    mimeType: 'application/json',
    status: isLocalDraft ? 'available' : 'locked',
    visibility: 'private',
    createdAt: now,
    updatedAt: now,
  };

  const definitions: MockAssetDefinition[] = [
    {
      assetType: 'script',
      stageCode: 'script',
      fileName: 'mock-script.json',
      note: 'Trace-only placeholder. Real provider execution has not produced a file.',
    },
    {
      assetType: 'storyboard',
      stageCode: 'storyboard',
      fileName: 'mock-storyboard.json',
      note: 'Trace-only placeholder. Real provider execution has not produced a file.',
    },
    {
      assetType: 'image',
      stageCode: 'image',
      fileName: 'mock-image-plan.json',
      note: 'Trace-only placeholder. Real provider execution has not produced a file.',
    },
    {
      assetType: 'audio',
      stageCode: 'voice',
      fileName: 'mock-voice-plan.json',
      note: 'Trace-only placeholder. Real provider execution has not produced a file.',
    },
    {
      assetType: 'caption',
      stageCode: 'caption',
      fileName: 'mock-captions.json',
      note: 'Trace-only placeholder. Real provider execution has not produced a file.',
    },
    {
      assetType: 'workflow_project',
      stageCode: 'compose_project',
      fileName: 'mock-workflow-project.json',
      note: 'Trace-only placeholder. Real provider execution has not produced a file.',
    },
    {
      assetType: 'draft_package',
      stageCode: 'draft_package',
      fileName: 'mock-draft-package.json',
      note: isLocalDraft
        ? 'Downloadable Reelflow draft package with capcut-mate payload.'
        : 'Trace-only placeholder. Real provider execution has not produced a file.',
    },
    {
      assetType: 'manifest',
      stageCode: 'draft_package',
      fileName: 'mock-manifest.json',
      note: 'Trace-only placeholder. Real provider execution has not produced a file.',
    },
  ];

  if (claimed.renderMp4Requested && (!isLocalDraft || renderResult)) {
    definitions.push({
      assetType: 'rendered_mp4',
      stageCode: 'render_mp4',
      fileName: 'mock-rendered-mp4.json',
      note: 'Trace-only placeholder. Real cloud render is not connected yet.',
    });
  }

  return definitions.map(({ assetType, stageCode, fileName, note }) => {
    if (assetType === 'rendered_mp4' && renderResult) {
      return {
        id: crypto.randomUUID(),
        ...base,
        stageId: stageIdByCode.get(stageCode),
        assetType,
        storageProvider: renderResult.provider,
        storageKey: renderResult.storageKey,
        url: renderResult.videoUrl,
        mimeType: renderResult.mimeType,
        width: renderResult.width,
        height: renderResult.height,
        durationMs: renderResult.durationMs,
        metadata: {
          ...renderResult.metadata,
          model: renderResult.model,
          mock: renderResult.mock,
          stageCode,
          downloadable: Boolean(renderResult.videoUrl || renderResult.storageKey),
          note: renderResult.mock ? 'Mock MP4 render asset for local verification.' : 'Cloud rendered MP4 asset.',
        },
      };
    }

    return {
      id: crypto.randomUUID(),
      ...base,
      stageId: stageIdByCode.get(stageCode),
      assetType,
      storageKey:
        isLocalDraft && assetType === 'draft_package'
          ? getDraftPackageStorageKey(claimed.id)
          : `${mode}/jobs/${claimed.id}/${fileName}`,
      mimeType: isLocalDraft && assetType === 'draft_package' ? 'application/zip' : base.mimeType,
      metadata: {
        ...(isLocalDraft && assetType === 'draft_package'
          ? buildDraftPackageMetadata(claimed.id)
          : { mode, downloadable: false }),
        stageCode,
        note,
      },
    };
  });
}

function buildUsageRecords(
  claimed: ClaimedJob,
  stageIdByCode: StageIdByCode,
  assetIdByType: Map<string, string>,
  mode: WorkerExecutionMode,
  totalCreditCost: number,
  includeRenderUsage = false,
) {
  const now = new Date();
  const creditCosts = distributeUsageCredits(totalCreditCost, includeRenderUsage);
  const base = {
    workspaceId: claimed.workspaceId,
    jobId: claimed.id,
    provider: mode === 'local_draft' ? 'reelflow-local' : 'mock',
    providerCostAmount: '0',
    providerCostCurrency: 'USD',
    pricingSnapshot: {
      mode,
      creditUnitPrice: 0,
      providerCostUnitPrice: 0,
      billable: mode === 'local_draft',
    },
    rawUsage: {
      mode,
      note:
        mode === 'local_draft'
          ? 'Local draft package generated without external media providers.'
          : 'No external provider was called.',
    },
    createdAt: now,
  };

  const rows = [
    {
      id: crypto.randomUUID(),
      ...base,
      stageId: stageIdByCode.get('script'),
      assetId: assetIdByType.get('script'),
      resourceType: 'llm',
      model: `${mode}-llm`,
      usageAmount: '1800',
      usageUnit: 'token',
      creditCost: creditCosts.llm.toString(),
    },
    {
      id: crypto.randomUUID(),
      ...base,
      stageId: stageIdByCode.get('image'),
      assetId: assetIdByType.get('image'),
      resourceType: 'image',
      model: `${mode}-image`,
      usageAmount: '6',
      usageUnit: 'image',
      creditCost: creditCosts.image.toString(),
    },
    {
      id: crypto.randomUUID(),
      ...base,
      stageId: stageIdByCode.get('voice'),
      assetId: assetIdByType.get('audio'),
      resourceType: 'tts',
      model: `${mode}-tts`,
      usageAmount: '45',
      usageUnit: 'second',
      creditCost: creditCosts.tts.toString(),
    },
    {
      id: crypto.randomUUID(),
      ...base,
      stageId: stageIdByCode.get('draft_package'),
      assetId: assetIdByType.get('draft_package'),
      resourceType: 'draft',
      model: mode === 'local_draft' ? 'capcut-mate-payload' : 'mock-capcut',
      usageAmount: '1',
      usageUnit: 'package',
      creditCost: creditCosts.draft.toString(),
    },
  ];

  if (includeRenderUsage) {
    rows.push({
      id: crypto.randomUUID(),
      ...base,
      stageId: stageIdByCode.get('render_mp4'),
      assetId: assetIdByType.get('rendered_mp4'),
      resourceType: 'render',
      model: `${mode}-cloud-render`,
      usageAmount: '1',
      usageUnit: 'minute',
      creditCost: creditCosts.render.toString(),
    });
  }

  return rows;
}

function distributeUsageCredits(total: number, hasRender: boolean) {
  if (total <= 0) {
    return { llm: 0, image: 0, tts: 0, draft: 0, render: 0 };
  }

  const render = hasRender ? Math.min(20, total) : 0;
  const remaining = total - render;
  const llm = Math.round(remaining * 0.4);
  const image = Math.round(remaining * 0.35);
  const tts = Math.round(remaining * 0.15);
  const draft = remaining - llm - image - tts;

  return { llm, image, tts, draft, render };
}

async function failClaimedJob(claimed: ClaimedJob, error: unknown): Promise<void> {
  const message = error instanceof Error ? error.message : 'Unknown worker error';

  await db.transaction(async (tx) => {
    await tx
      .update(job)
      .set({
        status: 'failed',
        lastErrorCode: 'worker_error',
        lastErrorMessage: message,
        lockedBy: null,
        lockedAt: null,
        updatedAt: new Date(),
      })
      .where(eq(job.id, claimed.id));

    await tx
      .update(jobAttempt)
      .set({
        status: 'failed',
        endedAt: new Date(),
      })
      .where(and(eq(jobAttempt.jobId, claimed.id), eq(jobAttempt.attemptNo, claimed.attemptNo)));

    await tx.insert(jobEvent).values({
      id: crypto.randomUUID(),
      jobId: claimed.id,
      level: 'error',
      eventType: 'job_failed',
      message,
      data: { code: 'worker_error' },
      createdAt: new Date(),
    });
  });

  notifyReelflowJobFailed({
    workspaceId: claimed.workspaceId,
    userId: claimed.createdByUserId,
    jobId: claimed.id,
    errorMessage: message,
  }).catch((notifyError) => {
    console.error('Failed to create Reelflow failure notification:', notifyError);
  });
}
