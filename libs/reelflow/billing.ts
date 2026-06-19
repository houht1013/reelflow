import { db } from '@libs/database';
import { creditAccount, creditLedger, job, jobEvent } from '@libs/database/schema';
import { and, asc, eq, sql } from 'drizzle-orm';
import { ensureWorkspaceCreditAccount, getDefaultWorkspaceForUser } from './workspaces';
import { createReelflowNotification, notifyWorkspaceCreditsGranted } from './notifications';
import { buildSubscriptionCreditIdempotencyKey, calculateCreditGrantAllocation } from './billing-utils';
export { buildSubscriptionCreditIdempotencyKey, calculateCreditGrantAllocation } from './billing-utils';

export type WorkspaceCreditGrantType = 'purchase' | 'bonus' | 'refund' | 'adjustment' | 'subscription_grant';

export type GrantWorkspaceCreditsInput = {
  userId: string;
  amount: number;
  type: WorkspaceCreditGrantType;
  orderId?: string;
  idempotencyKey?: string;
  description?: string;
  metadata?: Record<string, unknown>;
};

export type GrantWorkspaceSubscriptionCreditsInput = {
  userId: string;
  amount: number;
  provider: string;
  planId: string;
  subscriptionId?: string;
  orderId?: string;
  periodStart?: Date;
  periodEnd?: Date;
  metadata?: Record<string, unknown>;
};

export type WorkspaceCreditSummary = {
  balance: number;
  frozenBalance: number;
  debtBalance: number;
  totalGranted: number;
  totalConsumed: number;
};

export async function getWorkspaceCreditSummary(userId: string): Promise<WorkspaceCreditSummary> {
  const workspace = await getDefaultWorkspaceForUser(userId);
  if (!workspace) {
    return {
      balance: 0,
      frozenBalance: 0,
      debtBalance: 0,
      totalGranted: 0,
      totalConsumed: 0,
    };
  }

  const account = await ensureWorkspaceCreditAccount(workspace.id);
  return {
    balance: Number(account.balance || 0),
    frozenBalance: Number(account.frozenBalance || 0),
    debtBalance: Number(account.debtBalance || 0),
    totalGranted: Number(account.totalGranted || 0),
    totalConsumed: Number(account.totalConsumed || 0),
  };
}

export async function grantWorkspaceSubscriptionCredits(input: GrantWorkspaceSubscriptionCreditsInput) {
  if (input.amount <= 0) {
    return null;
  }

  const idempotencyKey = buildSubscriptionCreditIdempotencyKey(input);

  return grantWorkspaceCredits({
    userId: input.userId,
    amount: input.amount,
    type: 'subscription_grant',
    orderId: input.orderId,
    idempotencyKey,
    description: 'Reelflow subscription workspace credits',
    metadata: {
      ...(input.metadata ?? {}),
      provider: input.provider,
      planId: input.planId,
      subscriptionId: input.subscriptionId,
      periodStart: input.periodStart?.toISOString(),
      periodEnd: input.periodEnd?.toISOString(),
      idempotencyKey,
    },
  });
}

export async function grantWorkspaceCredits(input: GrantWorkspaceCreditsInput) {
  if (input.amount <= 0) {
    throw new Error('Amount must be positive when granting workspace credits');
  }

  const workspace = await getDefaultWorkspaceForUser(input.userId);
  if (!workspace) {
    throw new Error(`Workspace not found for user: ${input.userId}`);
  }

  await ensureWorkspaceCreditAccount(workspace.id);

  const result = await db.transaction(async (tx) => {
    if (input.orderId) {
      const existing = await tx
        .select()
        .from(creditLedger)
        .where(
          and(
            eq(creditLedger.workspaceId, workspace.id),
            eq(creditLedger.orderId, input.orderId),
            eq(creditLedger.type, input.type),
          ),
        )
        .limit(1);

      if (existing[0]) {
        return { ledger: existing[0], created: false, unlockedJobs: [] };
      }
    }

    if (input.idempotencyKey) {
      const existing = await tx
        .select()
        .from(creditLedger)
        .where(
          and(
            eq(creditLedger.workspaceId, workspace.id),
            eq(creditLedger.type, input.type),
            sql`${creditLedger.metadata}->>'idempotencyKey' = ${input.idempotencyKey}`,
          ),
        )
        .limit(1);

      if (existing[0]) {
        return { ledger: existing[0], created: false, unlockedJobs: [] };
      }
    }

    const [currentAccount] = await tx
      .select({
        balance: creditAccount.balance,
        frozenBalance: creditAccount.frozenBalance,
        debtBalance: creditAccount.debtBalance,
      })
      .from(creditAccount)
      .where(eq(creditAccount.workspaceId, workspace.id))
      .limit(1);

    if (!currentAccount) {
      throw new Error(`Credit account not found for workspace: ${workspace.id}`);
    }

    const currentDebt = Number(currentAccount.debtBalance || 0);
    const { appliedToDebt, addedToBalance } = calculateCreditGrantAllocation(input.amount, currentDebt);
    const debtUnlockResult =
      appliedToDebt > 0
        ? await applyWorkspaceDebtPayment(tx, {
            workspaceId: workspace.id,
            userId: input.userId,
            amount: appliedToDebt,
          })
        : { unlockedJobs: [], partialJobs: [] };

    const [updatedAccount] = await tx
      .update(creditAccount)
      .set({
        balance: addedToBalance > 0 ? sql`${creditAccount.balance} + ${addedToBalance}` : creditAccount.balance,
        debtBalance: appliedToDebt > 0 ? sql`${creditAccount.debtBalance} - ${appliedToDebt}` : creditAccount.debtBalance,
        totalGranted: sql`${creditAccount.totalGranted} + ${input.amount}`,
        updatedAt: new Date(),
      })
      .where(eq(creditAccount.workspaceId, workspace.id))
      .returning({
        balance: creditAccount.balance,
        frozenBalance: creditAccount.frozenBalance,
        debtBalance: creditAccount.debtBalance,
      });

    if (!updatedAccount) {
      throw new Error(`Credit account not found for workspace: ${workspace.id}`);
    }

    const [ledger] = await tx
      .insert(creditLedger)
      .values({
        id: crypto.randomUUID(),
        workspaceId: workspace.id,
        userId: input.userId,
        orderId: input.orderId,
        type: input.type,
        amount: input.amount.toString(),
        balanceAfter: updatedAccount.balance,
        frozenAfter: updatedAccount.frozenBalance,
        debtAfter: updatedAccount.debtBalance,
        description: input.description ?? `${input.type} workspace credits`,
        metadata: {
          ...(input.metadata ?? {}),
          idempotencyKey: input.idempotencyKey ?? input.metadata?.idempotencyKey,
          appliedToDebt,
          addedToBalance,
          unlockedJobIds: debtUnlockResult.unlockedJobs.map((item) => item.jobId),
          partiallyPaidJobIds: debtUnlockResult.partialJobs.map((item) => item.jobId),
        },
        createdAt: new Date(),
      })
      .returning();

    return { ledger, created: true, unlockedJobs: debtUnlockResult.unlockedJobs };
  });

  if (
    result.created &&
    (input.type === 'purchase' ||
      input.type === 'bonus' ||
      input.type === 'adjustment' ||
      input.type === 'subscription_grant')
  ) {
    notifyWorkspaceCreditsGranted({
      workspaceId: workspace.id,
      userId: input.userId,
      orderId: input.orderId,
      amount: input.amount,
      balanceAfter: Number(result.ledger.balanceAfter || 0),
    }).catch((error) => {
      console.error('Failed to create Reelflow credit notification:', error);
    });

    for (const unlockedJob of result.unlockedJobs) {
      createReelflowNotification({
        workspaceId: workspace.id,
        userId: unlockedJob.userId,
        type: 'asset_ready',
        title: 'Reelflow draft unlocked',
        body: 'Your unpaid credits have been covered. The draft package is ready to download.',
        data: {
          jobId: unlockedJob.jobId,
          paidCredits: unlockedJob.paidCredits,
          targetUrl: `/reelflow/jobs/${unlockedJob.jobId}`,
        },
      }).catch((error) => {
        console.error('Failed to create Reelflow debt unlock notification:', error);
      });
    }
  }

  return result.ledger;
}

type DebtPaymentTx = Parameters<Parameters<typeof db.transaction>[0]>[0];

type ApplyWorkspaceDebtPaymentInput = {
  workspaceId: string;
  userId: string;
  amount: number;
};

type DebtPaymentResult = {
  unlockedJobs: Array<{ jobId: string; userId: string; paidCredits: number }>;
  partialJobs: Array<{ jobId: string; userId: string; paidCredits: number; remainingDebt: number }>;
};

async function applyWorkspaceDebtPayment(
  tx: DebtPaymentTx,
  input: ApplyWorkspaceDebtPaymentInput,
): Promise<DebtPaymentResult> {
  let remaining = input.amount;
  const unlockedJobs: DebtPaymentResult['unlockedJobs'] = [];
  const partialJobs: DebtPaymentResult['partialJobs'] = [];

  const lockedJobs = await tx
    .select({
      id: job.id,
      createdByUserId: job.createdByUserId,
      debtCredits: job.debtCredits,
      completedAt: job.completedAt,
      createdAt: job.createdAt,
    })
    .from(job)
    .where(
      and(
        eq(job.workspaceId, input.workspaceId),
        eq(job.artifactStatus, 'locked'),
        eq(job.settlementStatus, 'debt'),
      ),
    )
    .orderBy(asc(job.completedAt), asc(job.createdAt));

  for (const lockedJob of lockedJobs) {
    if (remaining <= 0) break;

    const debtCredits = Number(lockedJob.debtCredits || 0);
    if (debtCredits <= 0) continue;

    const paidCredits = Math.min(remaining, debtCredits);
    const nextDebt = Math.max(0, debtCredits - paidCredits);
    remaining -= paidCredits;

    if (nextDebt === 0) {
      await tx
        .update(job)
        .set({
          debtCredits: '0',
          settlementStatus: 'settled',
          artifactStatus: 'downloadable',
          updatedAt: new Date(),
        })
        .where(eq(job.id, lockedJob.id));

      await tx.insert(jobEvent).values({
        id: crypto.randomUUID(),
        jobId: lockedJob.id,
        level: 'info',
        eventType: 'job_debt_unlocked',
        message: 'Job draft package unlocked after workspace credits covered the unpaid balance.',
        data: {
          paidCredits,
          paidByUserId: input.userId,
        },
        createdAt: new Date(),
      });

      unlockedJobs.push({
        jobId: lockedJob.id,
        userId: lockedJob.createdByUserId,
        paidCredits,
      });
    } else {
      await tx
        .update(job)
        .set({
          debtCredits: nextDebt.toString(),
          updatedAt: new Date(),
        })
        .where(eq(job.id, lockedJob.id));

      await tx.insert(jobEvent).values({
        id: crypto.randomUUID(),
        jobId: lockedJob.id,
        level: 'info',
        eventType: 'job_debt_partially_paid',
        message: 'Workspace credits partially covered the unpaid job balance.',
        data: {
          paidCredits,
          remainingDebt: nextDebt,
          paidByUserId: input.userId,
        },
        createdAt: new Date(),
      });

      partialJobs.push({
        jobId: lockedJob.id,
        userId: lockedJob.createdByUserId,
        paidCredits,
        remainingDebt: nextDebt,
      });
    }
  }

  return { unlockedJobs, partialJobs };
}
