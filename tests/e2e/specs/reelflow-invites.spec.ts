import { test, expect, type Page } from '@playwright/test';
import { E2E_BASE_URL, PAGES, TIMEOUTS, uniqueEmail } from '../helpers/constants';
import { signUpViaAPI } from '../helpers/auth';

test.describe('Reelflow invite rewards', () => {
  test('unauthenticated users are redirected from invite dashboard', async ({ page }) => {
    await page.goto(PAGES.reelflowInvites, { timeout: TIMEOUTS.navigation });
    await expect(page).toHaveURL(/\/signin/);
  });

  test('invite link rewards both workspaces and prevents duplicate claims', async ({ page, browser }) => {
    const referrerEmail = uniqueEmail('reelflow-invite-referrer');
    const referredEmail = uniqueEmail('reelflow-invite-referred');
    const password = 'TestPassword123!';

    const signUpRes = await signUpViaAPI(page, {
      name: 'Reelflow Invite Referrer',
      email: referrerEmail,
      password,
    });
    expect(signUpRes.ok(), `Referrer sign-up failed: ${signUpRes.status()}`).toBeTruthy();

    const dashboard = await getInviteDashboard(page);
    expect(dashboard.code).toMatch(/^[A-Z0-9]{8,}$/);
    expect(dashboard.inviteUrl).toContain(`/en/signup?ref=${dashboard.code}`);

    await page.context().grantPermissions(['clipboard-read', 'clipboard-write'], { origin: E2E_BASE_URL });
    await page.goto(PAGES.reelflowInvites, { timeout: TIMEOUTS.navigation });
    await expect(page.getByTestId('reelflow-invites-page')).toBeVisible();
    await expect(page.locator('#reelflow-invite-url')).toHaveValue(dashboard.inviteUrl);
    await expect(page.getByTestId('reelflow-invite-code')).toContainText(dashboard.code);
    await expect(page.getByTestId('reelflow-invite-referrer-reward')).toContainText(String(dashboard.bonuses.referrer));
    await expect(page.getByTestId('reelflow-invite-referred-reward')).toContainText(String(dashboard.bonuses.referred));

    await page.getByTestId('reelflow-copy-invite').click();
    await expect(page.getByTestId('reelflow-copy-invite')).toContainText(/copied/i);
    await expect(page.evaluate(() => navigator.clipboard.readText())).resolves.toBe(dashboard.inviteUrl);

    const beforeReferrerCredits = await getCredits(page);
    const referredContext = await browser.newContext({ baseURL: E2E_BASE_URL });
    const referredPage = await referredContext.newPage();

    try {
      const claimResponsePromise = referredPage.waitForResponse((response) =>
        response.url().includes('/api/reelflow/invites') &&
        response.request().method() === 'POST',
      );

      await referredPage.goto(dashboard.inviteUrl, { timeout: TIMEOUTS.navigation });
      await expect(referredPage.getByTestId('reelflow-signup-invite-reward')).toBeVisible();
      await referredPage.locator('#name').fill('Reelflow Invited User');
      await referredPage.locator('#email').fill(referredEmail);
      await referredPage.locator('#password').fill(password);
      await referredPage.getByRole('button', { name: /sign up|create|注册|创建/i }).click();

      const claimResponse = await claimResponsePromise;
      expect(claimResponse.ok(), `Invite claim failed: ${claimResponse.status()} ${await claimResponse.text()}`).toBeTruthy();
      const claim: InviteClaimPayload = await claimResponse.json();
      expect(claim.status).toBe('rewarded');
      expect(claim.referrerBonusCredits).toBe(dashboard.bonuses.referrer);
      expect(claim.referredBonusCredits).toBe(dashboard.bonuses.referred);

      const referredCredits = await waitForInviteCredit(referredPage, dashboard.bonuses.referred);
      expect(referredCredits.ledger.some((item) => item.type === 'invite_bonus' && item.amount === dashboard.bonuses.referred)).toBeTruthy();

      const duplicateClaimResponse = await referredPage.request.post('/api/reelflow/invites', {
        data: { code: dashboard.code },
      });
      expect(duplicateClaimResponse.ok(), `Duplicate invite claim failed: ${duplicateClaimResponse.status()}`).toBeTruthy();
      const duplicateClaim: InviteClaimPayload = await duplicateClaimResponse.json();
      expect(duplicateClaim.status).toBe('already_claimed');

      const referredCreditsAfterDuplicate = await getCredits(referredPage);
      const referredInviteLedgers = referredCreditsAfterDuplicate.ledger.filter((item) => item.type === 'invite_bonus');
      expect(referredInviteLedgers).toHaveLength(1);
      expect(referredCreditsAfterDuplicate.account.balance).toBe(referredCredits.account.balance);
    } finally {
      await referredContext.close();
    }

    const afterReferrerCredits = await waitForInviteCredit(page, beforeReferrerCredits.account.balance + dashboard.bonuses.referrer);
    expect(afterReferrerCredits.ledger.some((item) => item.type === 'invite_bonus' && item.amount === dashboard.bonuses.referrer)).toBeTruthy();

    const afterDashboard = await getInviteDashboard(page);
    expect(afterDashboard.bonuses.successfulInvites).toBe(1);
    expect(afterDashboard.bonuses.totalEarned).toBe(dashboard.bonuses.referrer);
    expect(afterDashboard.records.some((record) =>
      record.status === 'rewarded' &&
      record.referredUserEmail === referredEmail &&
      record.referrerBonusCredits === dashboard.bonuses.referrer,
    )).toBeTruthy();

    await page.goto(PAGES.reelflowInvites, { timeout: TIMEOUTS.navigation });
    await expect(page.getByTestId('reelflow-invite-successful-count')).toContainText('1');
    await expect(page.getByTestId('reelflow-invite-records')).toContainText(referredEmail);
  });
});

type InviteDashboardPayload = {
  code: string;
  inviteUrl: string;
  bonuses: {
    referrer: number;
    referred: number;
    totalEarned: number;
    successfulInvites: number;
  };
  records: Array<{
    status: string;
    referrerBonusCredits: number;
    referredUserEmail: string | null;
  }>;
};

type InviteClaimPayload =
  | { status: 'rewarded'; referrerBonusCredits: number; referredBonusCredits: number }
  | { status: 'already_claimed' }
  | { status: 'invalid_code' }
  | { status: 'self_invite' };

type CreditsPayload = {
  account: {
    balance: number;
  };
  ledger: Array<{
    type: string;
    amount: number;
  }>;
};

async function getInviteDashboard(page: Page): Promise<InviteDashboardPayload> {
  const response = await page.request.get('/api/reelflow/invites?locale=en');
  expect(response.ok(), `Invite dashboard API failed: ${response.status()} ${await response.text()}`).toBeTruthy();
  return response.json();
}

async function getCredits(page: Page): Promise<CreditsPayload> {
  const response = await page.request.get('/api/reelflow/credits');
  expect(response.ok(), `Credits API failed: ${response.status()} ${await response.text()}`).toBeTruthy();
  return response.json();
}

async function waitForInviteCredit(page: Page, expectedMinimumBalance: number): Promise<CreditsPayload> {
  const deadline = Date.now() + 30_000;
  let lastPayload: CreditsPayload | null = null;

  while (Date.now() < deadline) {
    lastPayload = await getCredits(page);
    if (lastPayload.account.balance >= expectedMinimumBalance && lastPayload.ledger.some((item) => item.type === 'invite_bonus')) {
      return lastPayload;
    }
    await page.waitForTimeout(500);
  }

  throw new Error(`Timed out waiting for invite bonus credits. Last balance: ${lastPayload?.account.balance ?? 'unknown'}`);
}
