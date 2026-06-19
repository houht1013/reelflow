import { reelflowConfig } from '@config';
import { db } from '@libs/database';
import { creditAccount, creditLedger, inviteCode, inviteRecord, user } from '@libs/database/schema';
import { and, desc, eq, sql } from 'drizzle-orm';
import { notifyInviteBonusGranted } from './notifications';
import { ensureWorkspaceCreditAccount, getDefaultWorkspaceForUser } from './workspaces';

const INVITE_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const INVITE_CODE_LENGTH = 8;

export type InviteClaimResult =
  | { status: 'rewarded'; referrerBonusCredits: number; referredBonusCredits: number }
  | { status: 'already_claimed' }
  | { status: 'invalid_code' }
  | { status: 'self_invite' };

function normalizeInviteCode(code: string) {
  return code.trim().replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
}

function createInviteCodeValue() {
  let value = '';
  for (let i = 0; i < INVITE_CODE_LENGTH; i += 1) {
    value += INVITE_CODE_ALPHABET[Math.floor(Math.random() * INVITE_CODE_ALPHABET.length)];
  }
  return value;
}

async function generateUniqueInviteCode() {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const code = createInviteCodeValue();
    const existing = await db.select({ id: inviteCode.id }).from(inviteCode).where(eq(inviteCode.code, code)).limit(1);
    if (!existing[0]) return code;
  }

  return `${createInviteCodeValue()}${Date.now().toString(36).toUpperCase().slice(-3)}`;
}

export async function ensureInviteCodeForUser(userId: string) {
  const workspace = await getDefaultWorkspaceForUser(userId);
  if (!workspace) {
    throw new Error(`Workspace not found for user: ${userId}`);
  }

  const existing = await db
    .select()
    .from(inviteCode)
    .where(and(eq(inviteCode.userId, userId), eq(inviteCode.status, 'active')))
    .limit(1);

  if (existing[0]) return existing[0];

  const [created] = await db
    .insert(inviteCode)
    .values({
      id: crypto.randomUUID(),
      userId,
      workspaceId: workspace.id,
      code: await generateUniqueInviteCode(),
      status: 'active',
      createdAt: new Date(),
    })
    .returning();

  return created;
}

export async function getInviteDashboard(userId: string, origin: string, locale = 'zh-CN') {
  const code = await ensureInviteCodeForUser(userId);
  const records = await db
    .select({
      id: inviteRecord.id,
      status: inviteRecord.status,
      referrerBonusCredits: inviteRecord.referrerBonusCredits,
      referredBonusCredits: inviteRecord.referredBonusCredits,
      createdAt: inviteRecord.createdAt,
      rewardedAt: inviteRecord.rewardedAt,
      referredUserName: user.name,
      referredUserEmail: user.email,
    })
    .from(inviteRecord)
    .leftJoin(user, eq(inviteRecord.referredUserId, user.id))
    .where(eq(inviteRecord.referrerUserId, userId))
    .orderBy(desc(inviteRecord.createdAt))
    .limit(50);

  const rewardedRecords = records.filter((record) => record.status === 'rewarded');
  const referrerBonusCredits = rewardedRecords.reduce(
    (sum, record) => sum + Number(record.referrerBonusCredits || 0),
    0,
  );

  return {
    code: code.code,
    inviteUrl: `${origin.replace(/\/$/, '')}/${locale}/signup?ref=${code.code}`,
    bonuses: {
      referrer: reelflowConfig.credits.inviteReferrerBonus,
      referred: reelflowConfig.credits.inviteReferredBonus,
      totalEarned: referrerBonusCredits,
      successfulInvites: rewardedRecords.length,
    },
    records: records.map((record) => ({
      ...record,
      referrerBonusCredits: Number(record.referrerBonusCredits || 0),
      referredBonusCredits: Number(record.referredBonusCredits || 0),
    })),
  };
}

export async function claimInviteBonus(referredUserId: string, rawCode: string): Promise<InviteClaimResult> {
  const code = normalizeInviteCode(rawCode);
  if (!code) return { status: 'invalid_code' };

  const [activeCode] = await db
    .select()
    .from(inviteCode)
    .where(and(eq(inviteCode.code, code), eq(inviteCode.status, 'active')))
    .limit(1);

  if (!activeCode) return { status: 'invalid_code' };
  if (activeCode.userId === referredUserId) return { status: 'self_invite' };

  const existing = await db
    .select({ id: inviteRecord.id, status: inviteRecord.status })
    .from(inviteRecord)
    .where(eq(inviteRecord.referredUserId, referredUserId))
    .limit(1);

  if (existing[0]) return { status: 'already_claimed' };

  const referrerWorkspace = await getDefaultWorkspaceForUser(activeCode.userId);
  const referredWorkspace = await getDefaultWorkspaceForUser(referredUserId);
  if (!referrerWorkspace || !referredWorkspace) {
    throw new Error('Workspace not found when claiming invite bonus');
  }

  await Promise.all([
    ensureWorkspaceCreditAccount(referrerWorkspace.id),
    ensureWorkspaceCreditAccount(referredWorkspace.id),
  ]);

  const referrerBonusCredits = reelflowConfig.credits.inviteReferrerBonus;
  const referredBonusCredits = reelflowConfig.credits.inviteReferredBonus;

  const result = await db.transaction(async (tx) => {
    const now = new Date();
    const recordId = crypto.randomUUID();

    const [referrerBalance] = await tx
      .update(creditAccount)
      .set({
        balance: sql`${creditAccount.balance} + ${referrerBonusCredits}`,
        totalGranted: sql`${creditAccount.totalGranted} + ${referrerBonusCredits}`,
        updatedAt: now,
      })
      .where(eq(creditAccount.workspaceId, referrerWorkspace.id))
      .returning({
        balance: creditAccount.balance,
        frozenBalance: creditAccount.frozenBalance,
        debtBalance: creditAccount.debtBalance,
      });

    const [referredBalance] = await tx
      .update(creditAccount)
      .set({
        balance: sql`${creditAccount.balance} + ${referredBonusCredits}`,
        totalGranted: sql`${creditAccount.totalGranted} + ${referredBonusCredits}`,
        updatedAt: now,
      })
      .where(eq(creditAccount.workspaceId, referredWorkspace.id))
      .returning({
        balance: creditAccount.balance,
        frozenBalance: creditAccount.frozenBalance,
        debtBalance: creditAccount.debtBalance,
      });

    if (!referrerBalance || !referredBalance) {
      throw new Error('Failed to update invite credit accounts');
    }

    await tx.insert(inviteRecord).values({
      id: recordId,
      inviteCodeId: activeCode.id,
      referrerUserId: activeCode.userId,
      referredUserId,
      referredWorkspaceId: referredWorkspace.id,
      status: 'rewarded',
      referrerBonusCredits: referrerBonusCredits.toString(),
      referredBonusCredits: referredBonusCredits.toString(),
      metadata: {
        referrerWorkspaceId: referrerWorkspace.id,
        code,
      },
      createdAt: now,
      rewardedAt: now,
    });

    await tx.insert(creditLedger).values([
      {
        id: crypto.randomUUID(),
        workspaceId: referrerWorkspace.id,
        userId: activeCode.userId,
        type: 'invite_bonus',
        amount: referrerBonusCredits.toString(),
        balanceAfter: referrerBalance.balance,
        frozenAfter: referrerBalance.frozenBalance,
        debtAfter: referrerBalance.debtBalance,
        description: 'Invite reward credits',
        metadata: {
          inviteRecordId: recordId,
          inviteRole: 'referrer',
          referredUserId,
        },
        createdAt: now,
      },
      {
        id: crypto.randomUUID(),
        workspaceId: referredWorkspace.id,
        userId: referredUserId,
        type: 'invite_bonus',
        amount: referredBonusCredits.toString(),
        balanceAfter: referredBalance.balance,
        frozenAfter: referredBalance.frozenBalance,
        debtAfter: referredBalance.debtBalance,
        description: 'Invite welcome credits',
        metadata: {
          inviteRecordId: recordId,
          inviteRole: 'referred',
          referrerUserId: activeCode.userId,
        },
        createdAt: now,
      },
    ]);

    return {
      referrerBalanceAfter: Number(referrerBalance.balance || 0),
      referredBalanceAfter: Number(referredBalance.balance || 0),
    };
  });

  notifyInviteBonusGranted({
    workspaceId: referrerWorkspace.id,
    userId: activeCode.userId,
    amount: referrerBonusCredits,
    role: 'referrer',
    balanceAfter: result.referrerBalanceAfter,
  }).catch((error) => {
    console.error('Failed to create referrer invite bonus notification:', error);
  });

  notifyInviteBonusGranted({
    workspaceId: referredWorkspace.id,
    userId: referredUserId,
    amount: referredBonusCredits,
    role: 'referred',
    balanceAfter: result.referredBalanceAfter,
  }).catch((error) => {
    console.error('Failed to create referred invite bonus notification:', error);
  });

  return { status: 'rewarded', referrerBonusCredits, referredBonusCredits };
}
