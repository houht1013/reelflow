import { test, expect } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { PAGES, TIMEOUTS, uniqueEmail } from '../helpers/constants';
import { signUpViaAPI } from '../helpers/auth';

test.describe('Reelflow MVP core flow', () => {
  test('unauthenticated users are redirected from the Reelflow creator to signin', async ({ page }) => {
    await page.goto(PAGES.reelflow, { timeout: TIMEOUTS.navigation });
    await expect(page).toHaveURL(/\/signin/);
  });

  test('landing page shows Reelflow conversion entry points', async ({ page }) => {
    await page.goto(PAGES.home, { timeout: TIMEOUTS.navigation });
    await expect(page.getByTestId('reelflow-landing-page')).toBeVisible();
    await expect(page.getByTestId('reelflow-landing-preview')).toBeVisible();
    await expect(page.getByTestId('reelflow-landing-primary-cta')).toBeVisible();
    await expect(page.getByTestId('reelflow-landing-secondary-cta')).toBeVisible();

    await page.getByTestId('reelflow-landing-primary-cta').click();
    await expect(page).toHaveURL(/\/signin/);
  });

  test('user can create and receive a downloadable video workflow draft from an official template', async ({ page }) => {
    test.skip(!process.env.DATABASE_URL, 'DATABASE_URL is required to run the local Reelflow worker in E2E.');

    const email = uniqueEmail('reelflow-mvp');
    const password = 'TestPassword123!';

    const signUpRes = await signUpViaAPI(page, {
      name: 'Reelflow MVP User',
      email,
      password,
    });
    expect(signUpRes.ok(), `Sign-up failed: ${signUpRes.status()}`).toBeTruthy();

    const templatesResponsePromise = page.waitForResponse((response) =>
      response.url().includes('/api/reelflow/templates') &&
      response.request().method() === 'GET',
      { timeout: TIMEOUTS.navigation },
    );

    await page.goto(PAGES.reelflow, { timeout: TIMEOUTS.navigation });
    const templatesResponse = await templatesResponsePromise;
    expect(templatesResponse.ok(), `Template API failed: ${templatesResponse.status()}`).toBeTruthy();

    await expect(page.getByTestId('reelflow-generate-page')).toBeVisible();
    await expect(page.getByTestId('reelflow-template-psychology_stickman_001')).toBeVisible({
      timeout: TIMEOUTS.navigation,
    });

    await page.getByTestId('reelflow-template-psychology_stickman_001').click();
    await page.locator('#reelflow-topic').fill('why people overthink before sleep');

    const [createJobResponse] = await Promise.all([
      page.waitForResponse((response) =>
        response.url().includes('/api/reelflow/jobs') &&
        response.request().method() === 'POST',
      ),
      page.getByTestId('reelflow-submit-job').click(),
    ]);

    if (createJobResponse.status() !== 201) {
      throw new Error(`Create job failed: ${createJobResponse.status()} ${await createJobResponse.text()}`);
    }
    await page.waitForURL(/\/reelflow\/jobs\/[^/]+$/, { timeout: TIMEOUTS.navigation });
    const jobId = page.url().split('/').pop();
    expect(jobId).toBeTruthy();

    await expect(page).toHaveURL(new RegExp(`/reelflow/jobs/${jobId}`));
    await expect(page.getByTestId('reelflow-job-detail-page')).toBeVisible();
    await expect(page.getByTestId('reelflow-job-progress')).toBeVisible();

    const detailResponse = await page.request.get(`/api/reelflow/jobs/${jobId}`);
    expect(detailResponse.ok(), `Job detail failed: ${detailResponse.status()}`).toBeTruthy();
    const detailPayload = await detailResponse.json();
    expect(detailPayload.job.status).toBe('queued');
    expect(detailPayload.job.templateCode).toBe('psychology_stickman_001');
    expect(Number(detailPayload.job.estimatedCredits)).toBeGreaterThan(0);
    expect(detailPayload.job.frozenCredits).toBe(detailPayload.job.estimatedCredits);
    expect(detailPayload.stages.length).toBeGreaterThanOrEqual(4);

    const completedPayload = await runWorkerUntilJobCompletes(page, jobId!);
    expect(completedPayload.job.status).toBe('completed');
    expect(completedPayload.job.artifactStatus).toBe('downloadable');
    expect(completedPayload.job.settlementStatus).toBe('settled');
    expect(Number(completedPayload.job.actualCredits)).toBeGreaterThan(0);
    expect(completedPayload.assets.some((asset: { assetType: string; status: string }) =>
      asset.assetType === 'draft_package' && asset.status === 'available',
    )).toBeTruthy();

    await page.reload({ timeout: TIMEOUTS.navigation });
    await expect(page.getByTestId('reelflow-job-detail-page')).toBeVisible();
    await expect(page.getByTestId('reelflow-job-progress')).toBeVisible();
    await expect(page.getByTestId('reelflow-job-asset-draft_package')).toBeVisible();

    await page.getByTestId('reelflow-preview-asset-draft_package').click();
    await expect(page.getByTestId('reelflow-asset-preview-dialog')).toBeVisible();
    await page.keyboard.press('Escape');

    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: TIMEOUTS.navigation }),
      page.getByTestId('reelflow-download-draft').click(),
    ]);
    expect(download.suggestedFilename()).toMatch(/^reelflow-draft-.+\.zip$/);

    await page.goto(PAGES.reelflowAssets, { timeout: TIMEOUTS.navigation });
    await expect(page.getByTestId('reelflow-assets-page')).toBeVisible();
    await expect(page.getByTestId('reelflow-asset-card-draft_package')).toBeVisible();
    await page.getByTestId('reelflow-asset-preview-draft_package').click();
    await expect(page.getByTestId('reelflow-asset-library-preview-dialog')).toBeVisible();
    await page.keyboard.press('Escape');

    await waitForJobCompletedNotification(page, jobId!);
    await page.goto(PAGES.reelflowNotifications, { timeout: TIMEOUTS.navigation });
    await expect(page.getByTestId('reelflow-notifications-page')).toBeVisible();
    await expect(page.getByTestId('reelflow-notification-job_completed')).toBeVisible();
    await page.getByTestId('reelflow-notification-open-job_completed').click();
    await expect(page).toHaveURL(new RegExp(`/reelflow/jobs/${jobId}`));

    await page.goto(PAGES.reelflowJobs, { timeout: TIMEOUTS.navigation });
    await expect(page.getByTestId('reelflow-jobs-page')).toBeVisible();
    await expect(page.getByTestId('reelflow-jobs-table')).toBeVisible();
    await expect(page.getByTestId(`reelflow-job-row-${jobId}`)).toBeVisible();
  });
});

type ReelflowJobDetailPayload = {
  job: {
    status: string;
    artifactStatus: string;
    settlementStatus: string;
    actualCredits: string;
  };
  assets: Array<{ assetType: string; status: string }>;
};

type ReelflowNotificationPayload = {
  notifications: Array<{
    type: string;
    data: Record<string, unknown> | null;
    deliveries: Array<{ channel: string; status: string }>;
  }>;
};

async function runWorkerUntilJobCompletes(page: import('@playwright/test').Page, jobId: string): Promise<ReelflowJobDetailPayload> {
  const deadline = Date.now() + 90_000;
  let lastPayload: ReelflowJobDetailPayload | null = null;

  while (Date.now() < deadline) {
    runWorkerOnce();

    const detailResponse = await page.request.get(`/api/reelflow/jobs/${jobId}`);
    expect(detailResponse.ok(), `Job detail after worker failed: ${detailResponse.status()}`).toBeTruthy();
    lastPayload = await detailResponse.json();

    if (lastPayload.job.status === 'completed') return lastPayload;
    if (lastPayload.job.status === 'failed') {
      throw new Error(`Reelflow worker failed target job ${jobId}`);
    }

    await page.waitForTimeout(1000);
  }

  throw new Error(`Timed out waiting for Reelflow job ${jobId} to complete. Last status: ${lastPayload?.job.status ?? 'unknown'}`);
}

async function waitForJobCompletedNotification(page: import('@playwright/test').Page, jobId: string) {
  const deadline = Date.now() + 30_000;

  while (Date.now() < deadline) {
    const response = await page.request.get('/api/reelflow/notifications');
    expect(response.ok(), `Notifications API failed: ${response.status()}`).toBeTruthy();
    const payload: ReelflowNotificationPayload = await response.json();
    const notification = payload.notifications.find((item) =>
      item.type === 'job_completed' &&
      item.data?.jobId === jobId &&
      item.deliveries.some((delivery) => delivery.channel === 'email'),
    );
    if (notification) return notification;
    await page.waitForTimeout(500);
  }

  throw new Error(`Timed out waiting for job_completed notification for Reelflow job ${jobId}`);
}

function runWorkerOnce() {
  // No-op: the in-process task queue (libs/reelflow/task-queue) processes jobs in
  // the app server automatically. Tests wait on the job_completed notification.
}
