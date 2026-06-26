import { db } from '@libs/database';
import { notification, notificationDelivery, user } from '@libs/database/schema';
import { eq } from 'drizzle-orm';

export type ReelflowNotificationType =
  | 'job_completed'
  | 'job_failed'
  | 'credits_granted'
  | 'credits_debt'
  | 'asset_ready'
  | 'invite_bonus';

export type CreateReelflowNotificationInput = {
  workspaceId: string;
  userId: string;
  type: ReelflowNotificationType;
  title: string;
  body?: string;
  data?: Record<string, unknown>;
  email?: {
    enabled?: boolean;
    subject?: string;
    preview?: string;
  };
};

type NotificationDeliveryInsert = typeof notificationDelivery.$inferInsert;

export async function createReelflowNotification(input: CreateReelflowNotificationInput) {
  const [created] = await db
    .insert(notification)
    .values({
      id: crypto.randomUUID(),
      workspaceId: input.workspaceId,
      userId: input.userId,
      type: input.type,
      title: input.title,
      body: input.body ?? null,
      data: input.data ?? null,
      createdAt: new Date(),
    })
    .returning();

  if (!created) {
    throw new Error('Failed to create Reelflow notification');
  }

  const deliveries: NotificationDeliveryInsert[] = [
    {
      id: crypto.randomUUID(),
      notificationId: created.id,
      channel: 'in_app',
      recipient: input.userId,
      status: 'sent',
      provider: 'reelflow',
      sentAt: new Date(),
      createdAt: new Date(),
    },
  ];

  if (input.email?.enabled !== false) {
    const [recipientUser] = await db.select({ email: user.email }).from(user).where(eq(user.id, input.userId)).limit(1);
    deliveries.push({
      id: crypto.randomUUID(),
      notificationId: created.id,
      channel: 'email',
      recipient: recipientUser?.email || input.userId,
      status: 'pending',
      provider: 'configured_email_provider',
      sentAt: null,
      createdAt: new Date(),
    });
  }

  await db.insert(notificationDelivery).values(deliveries);
  return created;
}

export async function notifyReelflowJobCompleted(input: {
  workspaceId: string;
  userId: string;
  jobId: string;
  templateName?: string;
  artifactStatus: string;
  actualCredits: number;
  downloadable: boolean;
}) {
  return createReelflowNotification({
    workspaceId: input.workspaceId,
    userId: input.userId,
    type: 'job_completed',
    title: input.downloadable ? 'Reelflow draft is ready' : 'Reelflow task completed',
    body: input.downloadable
      ? `${input.templateName || 'Your task'} is ready to download.`
      : `${input.templateName || 'Your task'} completed and needs manual follow-up.`,
    data: {
      jobId: input.jobId,
      templateName: input.templateName,
      artifactStatus: input.artifactStatus,
      actualCredits: input.actualCredits,
      targetUrl: `/reelflow/jobs/${input.jobId}`,
    },
  });
}

export async function notifyReelflowJobFailed(input: {
  workspaceId: string;
  userId: string;
  jobId: string;
  errorMessage: string;
}) {
  return createReelflowNotification({
    workspaceId: input.workspaceId,
    userId: input.userId,
    type: 'job_failed',
    title: 'Reelflow task needs attention',
    // Keep the user-facing body generic; the raw provider error (which can be
    // an HTML gateway page) is kept only in `data` for admin/diagnostics and is
    // never rendered on user pages. The UI localizes this by type anyway.
    body: 'The task could not be completed. Please try again.',
    data: {
      jobId: input.jobId,
      errorMessage: input.errorMessage,
      targetUrl: `/reelflow/jobs/${input.jobId}`,
    },
  });
}

export async function notifyWorkspaceCreditsGranted(input: {
  workspaceId: string;
  userId: string;
  orderId?: string;
  amount: number;
  balanceAfter: number;
}) {
  return createReelflowNotification({
    workspaceId: input.workspaceId,
    userId: input.userId,
    type: 'credits_granted',
    title: 'Workspace credits added',
    body: `${input.amount} credits have been added to your Reelflow workspace.`,
    data: {
      orderId: input.orderId,
      amount: input.amount,
      balanceAfter: input.balanceAfter,
      targetUrl: '/reelflow/credits',
    },
  });
}

export async function notifyWorkspaceCreditDebt(input: {
  workspaceId: string;
  userId: string;
  jobId: string;
  debtCredits: number;
}) {
  return createReelflowNotification({
    workspaceId: input.workspaceId,
    userId: input.userId,
    type: 'credits_debt',
    title: 'Reelflow task has unpaid credits',
    body: `A task completed with ${input.debtCredits} unpaid credits. Top up to unlock downloads.`,
    data: {
      jobId: input.jobId,
      debtCredits: input.debtCredits,
      targetUrl: `/reelflow/jobs/${input.jobId}`,
    },
  });
}

export async function notifyInviteBonusGranted(input: {
  workspaceId: string;
  userId: string;
  amount: number;
  role: 'referrer' | 'referred';
  balanceAfter: number;
}) {
  return createReelflowNotification({
    workspaceId: input.workspaceId,
    userId: input.userId,
    type: 'invite_bonus',
    title: 'Invite reward credits added',
    body:
      input.role === 'referrer'
        ? `${input.amount} credits were added for a successful invitation.`
        : `${input.amount} welcome credits were added from your invitation link.`,
    data: {
      amount: input.amount,
      role: input.role,
      balanceAfter: input.balanceAfter,
      targetUrl: '/reelflow/invites',
    },
  });
}
