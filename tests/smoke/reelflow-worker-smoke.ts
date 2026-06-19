type SmokeAssertInput = {
  ok: boolean;
  message: string;
  details?: unknown;
};

function smokeAssert(input: SmokeAssertInput) {
  if (!input.ok) {
    throw new Error(`${input.message}${input.details ? `: ${JSON.stringify(input.details)}` : ''}`);
  }
}

async function main() {
  process.env.DB_DIALECT ||= 'pg';
  process.env.REELFLOW_WORKER_EXECUTION_MODE ||= 'local_draft';

  smokeAssert({
    ok: Boolean(process.env.DATABASE_URL),
    message: 'DATABASE_URL is required for Reelflow worker smoke test',
  });
  smokeAssert({
    ok: process.env.DB_DIALECT === 'pg',
    message: 'Reelflow worker smoke test requires DB_DIALECT=pg',
    details: { DB_DIALECT: process.env.DB_DIALECT },
  });

  const [{ db }, schema, { eq }, { getDefaultWorkspaceForUser }, { createReelflowJob }, { processOneJob }] =
    await Promise.all([
      import('../../libs/database'),
      import('../../libs/database/schema'),
      import('drizzle-orm'),
      import('../../libs/reelflow/workspaces'),
      import('../../libs/reelflow/jobs'),
      import('../../libs/reelflow/worker-runtime'),
    ]);

  const {
    user,
    job,
    asset,
    usageRecord,
    creditAccount,
    notification,
  } = schema;

  const [smokeUser] = await db.select().from(user).where(eq(user.email, 'user@example.com')).limit(1);
  smokeAssert({
    ok: Boolean(smokeUser),
    message: 'Seeded user@example.com was not found. Run pnpm db:seed first.',
  });

  const workspace = await getDefaultWorkspaceForUser(smokeUser.id);
  smokeAssert({
    ok: Boolean(workspace),
    message: 'Default Reelflow workspace was not found for user@example.com',
  });

  const [beforeAccount] = await db
    .select()
    .from(creditAccount)
    .where(eq(creditAccount.workspaceId, workspace.id))
    .limit(1);
  smokeAssert({
    ok: Number(beforeAccount?.balance ?? 0) >= 35,
    message: 'Workspace needs at least 35 credits for the worker smoke test',
    details: beforeAccount,
  });

  const created = await createReelflowJob({
    workspaceId: workspace.id,
    userId: smokeUser.id,
    templateCode: 'psychology_stickman_001',
    inputParams: {
      topic: `worker smoke ${new Date().toISOString()}`,
      audience: 'general',
      tone: 'warm',
      referenceAssetId: '',
    },
    renderMp4Requested: false,
  });

  const processed = await processOneJob(`smoke-worker-${process.pid}`);
  smokeAssert({
    ok: processed.processed && processed.jobId === created.jobId && processed.status === 'completed',
    message: 'Worker did not complete the smoke job',
    details: processed,
  });

  const [completedJob] = await db.select().from(job).where(eq(job.id, created.jobId)).limit(1);
  smokeAssert({
    ok:
      completedJob?.status === 'completed' &&
      completedJob.artifactStatus === 'downloadable' &&
      completedJob.settlementStatus === 'settled' &&
      completedJob.frozenCredits === '0' &&
      Number(completedJob.actualCredits) === created.estimatedCredits,
    message: 'Completed job state is not valid',
    details: completedJob,
  });

  const assets = await db.select().from(asset).where(eq(asset.jobId, created.jobId));
  const draftPackage = assets.find((item) => item.assetType === 'draft_package');
  smokeAssert({
    ok:
      Boolean(draftPackage) &&
      draftPackage?.status === 'available' &&
      draftPackage?.mimeType === 'application/zip',
    message: 'Draft package asset is not available',
    details: draftPackage,
  });

  const usage = await db.select().from(usageRecord).where(eq(usageRecord.jobId, created.jobId));
  const usageCredits = usage.reduce((sum, item) => sum + Number(item.creditCost), 0);
  smokeAssert({
    ok: usage.length >= 4 && usageCredits === created.estimatedCredits,
    message: 'Usage records do not reconcile to estimated credits',
    details: usage,
  });

  const [afterAccount] = await db
    .select()
    .from(creditAccount)
    .where(eq(creditAccount.workspaceId, workspace.id))
    .limit(1);
  smokeAssert({
    ok:
      afterAccount?.frozenBalance === '0' &&
      Number(afterAccount.totalConsumed) >= created.estimatedCredits,
    message: 'Workspace credit account was not settled',
    details: afterAccount,
  });

  const notifications = await db
    .select()
    .from(notification)
    .where(eq(notification.userId, smokeUser.id));
  const jobNotification = notifications.find((item) => {
    const data = item.data && typeof item.data === 'object' ? item.data as Record<string, unknown> : {};
    return data.jobId === created.jobId && data.artifactStatus === 'downloadable';
  });
  smokeAssert({
    ok: Boolean(jobNotification),
    message: 'Downloadable job completion notification was not created',
  });

  console.log(JSON.stringify({
    ok: true,
    mode: process.env.REELFLOW_WORKER_EXECUTION_MODE,
    jobId: created.jobId,
    estimatedCredits: created.estimatedCredits,
    assetCount: assets.length,
    usageCredits,
    draftPackage: {
      status: draftPackage?.status,
      mimeType: draftPackage?.mimeType,
      storageProvider: draftPackage?.storageProvider,
    },
  }, null, 2));
}

main().catch((error) => {
  console.error('[reelflow-worker-smoke] failed', error);
  process.exit(1);
});
