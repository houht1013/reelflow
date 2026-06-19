import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import pg from 'pg';
import { PAGES, TIMEOUTS, uniqueEmail } from '../helpers/constants';
import { signUpViaAPI } from '../helpers/auth';

test.describe('Reelflow workspace credits', () => {
  test.setTimeout(120_000);

  test('unauthenticated users are redirected from Reelflow credits to signin', async ({ page }) => {
    await page.goto(PAGES.reelflowCredits, { timeout: TIMEOUTS.navigation });
    await expect(page).toHaveURL(/\/signin/);
  });

  test('user can initiate a credit checkout order from the credits page', async ({ page }) => {
    test.skip(process.env.REELFLOW_PAYMENT_MOCK !== '1', 'REELFLOW_PAYMENT_MOCK=1 is required for stable checkout initiation E2E.');

    const email = uniqueEmail('reelflow-checkout');
    const password = 'TestPassword123!';

    const signUpRes = await signUpViaAPI(page, {
      name: 'Reelflow Checkout User',
      email,
      password,
    });
    expect(signUpRes.ok(), `Sign-up failed: ${signUpRes.status()}`).toBeTruthy();

    await page.goto(PAGES.reelflowCredits, { timeout: TIMEOUTS.navigation });
    await expect(page.getByTestId('reelflow-credits-page')).toBeVisible();

    const [initiateResponse] = await Promise.all([
      page.waitForResponse((response) =>
        response.url().includes('/api/payment/initiate') &&
        response.request().method() === 'POST',
      ),
      page.getByTestId('reelflow-buy-plan-credits100').click(),
    ]);
    expect(initiateResponse.ok(), `Payment initiate failed: ${initiateResponse.status()}`).toBeTruthy();
    const order = await getLatestMockOrder(email);
    expect(order.id).toBeTruthy();
    expect(order.provider_order_id).toMatch(/^reelflow_mock_/);
  });

  test('user can top up workspace credits and see ledger plus notification', async ({ page }) => {
    test.skip(!process.env.DATABASE_URL, 'DATABASE_URL is required for Reelflow billing E2E setup.');

    const email = uniqueEmail('reelflow-credits');
    const password = 'TestPassword123!';

    const signUpRes = await signUpViaAPI(page, {
      name: 'Reelflow Credits User',
      email,
      password,
    });
    expect(signUpRes.ok(), `Sign-up failed: ${signUpRes.status()}`).toBeTruthy();

    await page.goto(PAGES.reelflowCredits, { timeout: TIMEOUTS.navigation });
    await expect(page.getByTestId('reelflow-credits-page')).toBeVisible();
    await expect(page.getByTestId('reelflow-credit-plan-credits100')).toBeVisible({
      timeout: TIMEOUTS.navigation,
    });

    const before = await getCredits(page);
    const purchaseResponse = await page.request.post('/api/reelflow/credits/dev-complete-purchase', {
      data: { planId: 'credits100' },
    });
    if (purchaseResponse.status() !== 201) {
      throw new Error(`Dev credit purchase failed: ${purchaseResponse.status()} ${await purchaseResponse.text()}`);
    }
    const purchase = await purchaseResponse.json();
    expect(purchase.credits).toBe(100);
    expect(purchase.orderId).toBeTruthy();

    const after = await waitForCreditPurchase(page, purchase.orderId, before.account.balance + 100);
    expect(after.account.balance).toBeGreaterThanOrEqual(before.account.balance + 100);
    expect(after.ledger.some((item) => item.type === 'purchase' && item.orderId === purchase.orderId)).toBeTruthy();

    const duplicatePurchaseResponse = await page.request.post('/api/reelflow/credits/dev-complete-purchase', {
      data: { planId: 'credits100', orderId: purchase.orderId, providerOrderId: purchase.providerOrderId },
    });
    expect(duplicatePurchaseResponse.status(), `Duplicate purchase failed: ${duplicatePurchaseResponse.status()} ${await duplicatePurchaseResponse.text()}`).toBe(200);
    const afterDuplicate = await getCredits(page);
    expect(afterDuplicate.account.balance).toBe(after.account.balance);
    expect(afterDuplicate.ledger.filter((item) => item.type === 'purchase' && item.orderId === purchase.orderId)).toHaveLength(1);

    const lockedJobId = await createLockedDebtJob(email, 40);
    const withDebt = await waitForDebtBalance(page, 40);
    expect(withDebt.account.debtBalance).toBe(40);

    const debtPurchaseResponse = await page.request.post('/api/reelflow/credits/dev-complete-purchase', {
      data: { planId: 'credits100' },
    });
    expect(debtPurchaseResponse.status(), `Debt purchase failed: ${debtPurchaseResponse.status()} ${await debtPurchaseResponse.text()}`).toBe(201);
    const debtPurchase: { orderId: string } = await debtPurchaseResponse.json();
    const afterDebtPurchase = await waitForCreditPurchase(page, debtPurchase.orderId, afterDuplicate.account.balance + 60);
    expect(afterDebtPurchase.account.debtBalance).toBe(0);
    expect(afterDebtPurchase.account.balance).toBeGreaterThanOrEqual(afterDuplicate.account.balance + 60);
    const unlockedJob = await waitForJobUnlocked(page, lockedJobId);
    expect(unlockedJob.job.artifactStatus).toBe('downloadable');
    expect(unlockedJob.job.settlementStatus).toBe('settled');

    const subscriptionPeriod = '2026-06-01T00:00:00.000Z';
    const beforeSubscription = await getCredits(page);
    const subscriptionResponse = await page.request.post('/api/reelflow/credits/dev-complete-subscription-grant', {
      data: {
        planId: 'monthly',
        subscriptionId: `sub_${purchase.orderId}`,
        periodStart: subscriptionPeriod,
      },
    });
    expect(subscriptionResponse.status(), `Subscription grant failed: ${subscriptionResponse.status()} ${await subscriptionResponse.text()}`).toBe(201);
    const subscription = await subscriptionResponse.json();
    expect(subscription.credits).toBe(300);

    const afterSubscription = await waitForLedgerType(page, 'subscription_grant', beforeSubscription.account.balance + 300);
    expect(afterSubscription.account.balance).toBeGreaterThanOrEqual(beforeSubscription.account.balance + 300);
    expect(afterSubscription.ledger.some((item) => item.type === 'subscription_grant')).toBeTruthy();

    await page.reload({ timeout: TIMEOUTS.navigation });
    await expect(page.getByTestId('reelflow-credits-page')).toBeVisible();
    await expect(page.getByTestId('reelflow-credit-ledger')).toBeVisible();
    await expect(page.getByTestId('reelflow-credit-ledger-purchase').first()).toBeVisible();

    await waitForCreditNotification(page, purchase.orderId);
    await page.goto(PAGES.reelflowNotifications, { timeout: TIMEOUTS.navigation });
    await expect(page.getByTestId('reelflow-notifications-page')).toBeVisible();
    await expect(page.getByTestId('reelflow-notification-credits_granted').first()).toBeVisible();
  });
});

type CreditsPayload = {
  account: {
    balance: number;
    frozenBalance: number;
    debtBalance: number;
    totalGranted: number;
    totalConsumed: number;
  };
  ledger: Array<{
    type: string;
    orderId: string | null;
    amount: number;
  }>;
};

type NotificationsPayload = {
  notifications: Array<{
    type: string;
    data: Record<string, unknown> | null;
    deliveries: Array<{ channel: string; status: string }>;
  }>;
};

type ReelflowJobDetailPayload = {
  job: {
    artifactStatus: string;
    settlementStatus: string;
  };
};

async function getCredits(page: import('@playwright/test').Page): Promise<CreditsPayload> {
  const response = await page.request.get('/api/reelflow/credits');
  expect(response.ok(), `Credits API failed: ${response.status()}`).toBeTruthy();
  return response.json();
}

async function waitForCreditPurchase(
  page: import('@playwright/test').Page,
  orderId: string,
  expectedMinimumBalance: number,
): Promise<CreditsPayload> {
  const deadline = Date.now() + 30_000;
  let lastPayload: CreditsPayload | null = null;

  while (Date.now() < deadline) {
    lastPayload = await getCredits(page);
    const hasLedger = lastPayload.ledger.some((item) => item.type === 'purchase' && item.orderId === orderId);
    if (hasLedger && lastPayload.account.balance >= expectedMinimumBalance) return lastPayload;
    await page.waitForTimeout(500);
  }

  throw new Error(`Timed out waiting for Reelflow credit purchase ${orderId}. Last balance: ${lastPayload?.account.balance ?? 'unknown'}`);
}

async function waitForDebtBalance(page: import('@playwright/test').Page, expectedDebt: number): Promise<CreditsPayload> {
  const deadline = Date.now() + 30_000;
  let lastPayload: CreditsPayload | null = null;

  while (Date.now() < deadline) {
    lastPayload = await getCredits(page);
    if (lastPayload.account.debtBalance === expectedDebt) return lastPayload;
    await page.waitForTimeout(500);
  }

  throw new Error(`Timed out waiting for Reelflow debt balance ${expectedDebt}. Last debt: ${lastPayload?.account.debtBalance ?? 'unknown'}`);
}

async function waitForLedgerType(
  page: import('@playwright/test').Page,
  type: string,
  expectedMinimumBalance: number,
): Promise<CreditsPayload> {
  const deadline = Date.now() + 30_000;
  let lastPayload: CreditsPayload | null = null;

  while (Date.now() < deadline) {
    lastPayload = await getCredits(page);
    if (
      lastPayload.account.balance >= expectedMinimumBalance &&
      lastPayload.ledger.some((item) => item.type === type)
    ) {
      return lastPayload;
    }
    await page.waitForTimeout(500);
  }

  throw new Error(`Timed out waiting for Reelflow ledger type ${type}. Last balance: ${lastPayload?.account.balance ?? 'unknown'}`);
}

async function waitForJobUnlocked(page: import('@playwright/test').Page, jobId: string): Promise<ReelflowJobDetailPayload> {
  const deadline = Date.now() + 30_000;
  let lastPayload: ReelflowJobDetailPayload | null = null;

  while (Date.now() < deadline) {
    const response = await page.request.get(`/api/reelflow/jobs/${jobId}`);
    expect(response.ok(), `Job detail failed: ${response.status()} ${await response.text()}`).toBeTruthy();
    lastPayload = await response.json();
    if (lastPayload.job.artifactStatus === 'downloadable' && lastPayload.job.settlementStatus === 'settled') {
      return lastPayload;
    }
    await page.waitForTimeout(500);
  }

  throw new Error(`Timed out waiting for Reelflow debt job ${jobId} to unlock. Last status: ${lastPayload?.job.artifactStatus ?? 'unknown'}`);
}

async function waitForCreditNotification(page: import('@playwright/test').Page, orderId: string) {
  const deadline = Date.now() + 30_000;

  while (Date.now() < deadline) {
    const response = await page.request.get('/api/reelflow/notifications');
    expect(response.ok(), `Notifications API failed: ${response.status()}`).toBeTruthy();
    const payload: NotificationsPayload = await response.json();
    const notification = payload.notifications.find((item) =>
      item.type === 'credits_granted' &&
      item.data?.orderId === orderId &&
      item.deliveries.some((delivery) => delivery.channel === 'email'),
    );
    if (notification) return notification;
    await page.waitForTimeout(500);
  }

  throw new Error(`Timed out waiting for credits_granted notification for order ${orderId}`);
}

async function createLockedDebtJob(email: string, debtCredits: number): Promise<string> {
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    const context = await client.query<{
      user_id: string;
      workspace_id: string;
      template_id: string;
    }>(
      `
        select u.id as user_id,
               w.id as workspace_id,
               t.id as template_id
        from "user" u
        inner join workspace w on w.owner_user_id = u.id
        inner join template t on t.code = $2
        where u.email = $1
        limit 1
      `,
      [email, 'psychology_stickman_001'],
    );
    const row = context.rows[0];
    if (!row) throw new Error(`Missing Reelflow billing context for ${email}`);

    const jobId = randomUUID();
    await client.query('begin');
    await client.query(
      `
        insert into job (
          id,
          workspace_id,
          created_by_user_id,
          template_id,
          status,
          quality_status,
          priority,
          input_params,
          estimated_credits,
          frozen_credits,
          actual_credits,
          debt_credits,
          settlement_status,
          artifact_status,
          render_mp4_requested,
          attempt_count,
          completed_at,
          created_at,
          updated_at
        )
        values (
          $1, $2, $3, $4,
          'completed', 'needs_fix', 0, $5::jsonb,
          '35', '0', '35', $6,
          'debt', 'locked', false, 1,
          now(), now(), now()
        )
      `,
      [
        jobId,
        row.workspace_id,
        row.user_id,
        row.template_id,
        JSON.stringify({ topic: 'locked debt job for top up unlock verification' }),
        String(debtCredits),
      ],
    );
    await client.query(
      `
        update credit_account
        set debt_balance = debt_balance + $2,
            updated_at = now()
        where workspace_id = $1
      `,
      [row.workspace_id, debtCredits],
    );
    await client.query('commit');
    return jobId;
  } catch (error) {
    await client.query('rollback').catch(() => undefined);
    throw error;
  } finally {
    await client.end();
  }
}

async function getLatestMockOrder(email: string): Promise<{ id: string; provider_order_id: string }> {
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    const result = await client.query<{ id: string; provider_order_id: string }>(
      `
        select o.id,
               o.provider_order_id
        from "order" o
        inner join "user" u on u.id = o.user_id
        where u.email = $1
          and o.provider_order_id like 'reelflow_mock_%'
        order by o.created_at desc
        limit 1
      `,
      [email],
    );
    const order = result.rows[0];
    if (!order) throw new Error(`Missing mock payment order for ${email}`);
    return order;
  } finally {
    await client.end();
  }
}
