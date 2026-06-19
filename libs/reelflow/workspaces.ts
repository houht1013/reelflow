import { db } from '@libs/database';
import { creditAccount, creditLedger, user, workspace, workspaceMember } from '@libs/database/schema';
import { reelflowConfig } from '@config';
import { eq } from 'drizzle-orm';

export type DefaultWorkspace = typeof workspace.$inferSelect;

export async function getDefaultWorkspaceForUser(userId: string): Promise<DefaultWorkspace | null> {
  const owned = await db
    .select()
    .from(workspace)
    .where(eq(workspace.ownerUserId, userId))
    .limit(1);

  if (owned[0]) return owned[0];

  const memberships = await db
    .select({ workspace })
    .from(workspaceMember)
    .innerJoin(workspace, eq(workspaceMember.workspaceId, workspace.id))
    .where(eq(workspaceMember.userId, userId))
    .limit(1);

  if (memberships[0]?.workspace) return memberships[0].workspace;

  return ensureDefaultWorkspaceForUser(userId);
}

export async function ensureDefaultWorkspaceForUser(userId: string): Promise<DefaultWorkspace | null> {
  const [existingUser] = await db
    .select({ id: user.id, name: user.name, email: user.email })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);

  if (!existingUser) return null;

  const workspaceName =
    existingUser.name?.trim() ||
    existingUser.email?.split('@')[0] ||
    'My Reelflow workspace';
  const trialCredits = reelflowConfig.credits.trialGrant;

  return db.transaction(async (tx) => {
    const owned = await tx
      .select()
      .from(workspace)
      .where(eq(workspace.ownerUserId, userId))
      .limit(1);

    if (owned[0]) {
      await ensureWorkspaceCreditAccount(owned[0].id);
      return owned[0];
    }

    const memberships = await tx
      .select({ workspace })
      .from(workspaceMember)
      .innerJoin(workspace, eq(workspaceMember.workspaceId, workspace.id))
      .where(eq(workspaceMember.userId, userId))
      .limit(1);

    if (memberships[0]?.workspace) {
      await ensureWorkspaceCreditAccount(memberships[0].workspace.id);
      return memberships[0].workspace;
    }

    const now = new Date();
    const workspaceId = crypto.randomUUID();
    const [createdWorkspace] = await tx
      .insert(workspace)
      .values({
        id: workspaceId,
        name: `${workspaceName}'s Reelflow`,
        ownerUserId: userId,
        status: 'active',
        settings: {
          planTier: 'free',
          concurrentJobs: reelflowConfig.worker.workspaceDefaultConcurrentJobs,
          queueLimit: reelflowConfig.worker.workspaceDefaultQueueLimit,
        },
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    await tx.insert(workspaceMember).values({
      id: crypto.randomUUID(),
      workspaceId,
      userId,
      role: 'owner',
      status: 'active',
      createdAt: now,
      updatedAt: now,
    });

    await tx.insert(creditAccount).values({
      id: crypto.randomUUID(),
      workspaceId,
      balance: trialCredits.toString(),
      frozenBalance: '0',
      debtBalance: '0',
      totalGranted: trialCredits.toString(),
      totalConsumed: '0',
      updatedAt: now,
    });

    if (trialCredits > 0) {
      await tx.insert(creditLedger).values({
        id: crypto.randomUUID(),
        workspaceId,
        userId,
        type: 'trial_grant',
        amount: trialCredits.toString(),
        balanceAfter: trialCredits.toString(),
        frozenAfter: '0',
        debtAfter: '0',
        description: 'Reelflow trial credits',
        metadata: { source: 'default_workspace_creation' },
        createdAt: now,
      });
    }

    return createdWorkspace;
  });
}

export async function ensureWorkspaceCreditAccount(workspaceId: string) {
  const existing = await db
    .select()
    .from(creditAccount)
    .where(eq(creditAccount.workspaceId, workspaceId))
    .limit(1);

  if (existing[0]) return existing[0];

  const [created] = await db
    .insert(creditAccount)
    .values({
      id: crypto.randomUUID(),
      workspaceId,
      balance: '0',
      frozenBalance: '0',
      debtBalance: '0',
      totalGranted: '0',
      totalConsumed: '0',
      updatedAt: new Date(),
    })
    .returning();

  return created;
}
