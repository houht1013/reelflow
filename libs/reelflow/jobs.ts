import { db } from '@libs/database';
import { creditAccount, creditLedger, job, jobEvent, jobStage, template } from '@libs/database/schema';
import { and, eq, sql } from 'drizzle-orm';
import { REELFLOW_STAGES } from './constants';
import { assertJobPreflight } from './preflight';

export type EstimateJobCreditsInput = {
  templateCode: string;
  renderMp4Requested?: boolean;
};

export type CreateReelflowJobInput = {
  workspaceId: string;
  userId: string;
  templateCode: string;
  inputParams: Record<string, unknown>;
  renderMp4Requested?: boolean;
};

export type CreateReelflowJobResult = {
  jobId: string;
  estimatedCredits: number;
  frozenCredits: number;
};

export type RetryReelflowJobInput = {
  workspaceId: string;
  userId: string;
  jobId: string;
};

export type RerunReelflowJobInput = RetryReelflowJobInput;

export function estimateJobCredits(input: EstimateJobCreditsInput): number {
  const templateBaseCredits: Record<string, number> = {
    psychology_stickman_001: 35,
    opinion_voiceover_001: 30,
    knowledge_cards_001: 28,
  };

  const base = templateBaseCredits[input.templateCode] ?? 30;
  return input.renderMp4Requested ? base + 20 : base;
}

export async function createReelflowJob(input: CreateReelflowJobInput): Promise<CreateReelflowJobResult> {
  const estimatedCredits = estimateJobCredits(input);
  const estimatedCreditsText = estimatedCredits.toString();

  const [selectedTemplate] = await db
    .select()
    .from(template)
    .where(and(eq(template.code, input.templateCode), eq(template.status, 'published')))
    .limit(1);

  if (!selectedTemplate) {
    throw new Error(`Template is not available: ${input.templateCode}`);
  }

  await assertJobPreflight({
    workspaceId: input.workspaceId,
    userId: input.userId,
    template: selectedTemplate,
    inputParams: input.inputParams,
    renderMp4Requested: input.renderMp4Requested,
  });

  return db.transaction(async (tx) => {
    const [updatedAccount] = await tx
      .update(creditAccount)
      .set({
        balance: sql`${creditAccount.balance} - ${estimatedCredits}`,
        frozenBalance: sql`${creditAccount.frozenBalance} + ${estimatedCredits}`,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(creditAccount.workspaceId, input.workspaceId),
          sql`${creditAccount.balance} >= ${estimatedCredits}`,
        ),
      )
      .returning({
        balance: creditAccount.balance,
        frozenBalance: creditAccount.frozenBalance,
        debtBalance: creditAccount.debtBalance,
      });

    if (!updatedAccount) {
      throw new Error('Insufficient credits to freeze estimated job cost');
    }

    const jobId = crypto.randomUUID();
    const [createdJob] = await tx
      .insert(job)
      .values({
        id: jobId,
        workspaceId: input.workspaceId,
        createdByUserId: input.userId,
        templateId: selectedTemplate.id,
        status: 'queued',
        qualityStatus: 'unchecked',
        priority: 0,
        inputParams: input.inputParams,
        estimatedCredits: estimatedCreditsText,
        frozenCredits: estimatedCreditsText,
        actualCredits: '0',
        debtCredits: '0',
        settlementStatus: 'frozen',
        artifactStatus: 'generating',
        renderMp4Requested: Boolean(input.renderMp4Requested),
        attemptCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning({ id: job.id });

    await tx.insert(jobStage).values(
      REELFLOW_STAGES
        .filter((stage) => input.renderMp4Requested || stage.code !== 'render_mp4')
        .map((stage, index) => ({
          id: crypto.randomUUID(),
          jobId: createdJob.id,
          stageCode: stage.code,
          status: 'pending',
          sortOrder: index,
          attemptCount: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        })),
    );

    await tx.insert(creditLedger).values({
      id: crypto.randomUUID(),
      workspaceId: input.workspaceId,
      userId: input.userId,
      jobId: createdJob.id,
      type: 'freeze',
      amount: `-${estimatedCreditsText}`,
      balanceAfter: updatedAccount.balance,
      frozenAfter: updatedAccount.frozenBalance,
      debtAfter: updatedAccount.debtBalance,
      description: `Freeze estimated credits for Reelflow job ${createdJob.id}`,
      metadata: {
        templateCode: input.templateCode,
        estimatedCredits,
        renderMp4Requested: Boolean(input.renderMp4Requested),
      },
      createdAt: new Date(),
    });

    return {
      jobId: createdJob.id,
      estimatedCredits,
      frozenCredits: estimatedCredits,
    };
  });
}

export async function retryFailedReelflowJob(input: RetryReelflowJobInput) {
  const detail = await getJobForUserAction(input.workspaceId, input.jobId);
  if (!detail) {
    throw new Error('Job not found');
  }
  if (detail.status !== 'failed') {
    throw new Error('Only failed jobs can be retried from the failed point');
  }

  await assertJobPreflight({
    workspaceId: input.workspaceId,
    userId: input.userId,
    template: {
      id: detail.templateId,
      code: detail.templateCode,
      capabilityRequirements: detail.capabilityRequirements,
    },
    inputParams: normalizeInputParams(detail.inputParams),
    renderMp4Requested: detail.renderMp4Requested,
  });

  return db.transaction(async (tx) => {
    await tx
      .update(jobStage)
      .set({
        status: 'pending',
        errorCode: null,
        errorMessage: null,
        startedAt: null,
        completedAt: null,
        updatedAt: new Date(),
      })
      .where(and(eq(jobStage.jobId, input.jobId), sql`${jobStage.status} in ('running', 'failed')`));

    const [updatedJob] = await tx
      .update(job)
      .set({
        status: 'queued',
        lockedBy: null,
        lockedAt: null,
        lastErrorCode: null,
        lastErrorMessage: null,
        updatedAt: new Date(),
      })
      .where(and(eq(job.id, input.jobId), eq(job.workspaceId, input.workspaceId), eq(job.status, 'failed')))
      .returning({ id: job.id, attemptCount: job.attemptCount });

    if (!updatedJob) {
      throw new Error('Failed to queue job retry');
    }

    await tx.insert(jobEvent).values({
      id: crypto.randomUUID(),
      jobId: input.jobId,
      level: 'info',
      eventType: 'job_retry_requested',
      message: 'Retry requested from the failed point.',
      data: {
        requestedByUserId: input.userId,
        nextAttemptNo: Number(updatedJob.attemptCount || 0) + 1,
      },
      createdAt: new Date(),
    });

    return {
      jobId: input.jobId,
      status: 'queued' as const,
      nextAttemptNo: Number(updatedJob.attemptCount || 0) + 1,
    };
  });
}

export async function rerunReelflowJob(input: RerunReelflowJobInput): Promise<CreateReelflowJobResult> {
  const detail = await getJobForUserAction(input.workspaceId, input.jobId);
  if (!detail) {
    throw new Error('Job not found');
  }

  const result = await createReelflowJob({
    workspaceId: input.workspaceId,
    userId: input.userId,
    templateCode: detail.templateCode,
    inputParams: normalizeInputParams(detail.inputParams),
    renderMp4Requested: detail.renderMp4Requested,
  });

  await db.insert(jobEvent).values({
    id: crypto.randomUUID(),
    jobId: input.jobId,
    level: 'info',
    eventType: 'job_rerun_created',
    message: `A new rerun job was created: ${result.jobId}`,
    data: {
      requestedByUserId: input.userId,
      newJobId: result.jobId,
    },
    createdAt: new Date(),
  });

  return result;
}

async function getJobForUserAction(workspaceId: string, jobId: string) {
  const [detail] = await db
    .select({
      id: job.id,
      workspaceId: job.workspaceId,
      templateId: job.templateId,
      templateCode: template.code,
      status: job.status,
      inputParams: job.inputParams,
      renderMp4Requested: job.renderMp4Requested,
      capabilityRequirements: template.capabilityRequirements,
    })
    .from(job)
    .innerJoin(template, eq(job.templateId, template.id))
    .where(and(eq(job.id, jobId), eq(job.workspaceId, workspaceId)))
    .limit(1);

  return detail ?? null;
}

function normalizeInputParams(inputParams: unknown): Record<string, unknown> {
  return inputParams && typeof inputParams === 'object' && !Array.isArray(inputParams)
    ? (inputParams as Record<string, unknown>)
    : {};
}
