import { test, expect, type Page } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import pg from 'pg';
import { PAGES, TIMEOUTS, uniqueEmail } from '../helpers/constants';
import { signUpViaAPI } from '../helpers/auth';

test.describe('Reelflow optional cloud MP4 render', () => {
  test.beforeEach(async () => {
    test.skip(!process.env.DATABASE_URL, 'DATABASE_URL is required to verify render provider state.');
    await setRenderProviderEnabled();
  });

  test('user can request a mock 1080P MP4 render with a local draft job', async ({ page }) => {
    test.skip(!process.env.DATABASE_URL, 'DATABASE_URL is required to run the local Reelflow worker in E2E.');

    await createSignedInUser(page, 'reelflow-cloud-render-success');
    const before = await getCredits(page);

    const templatesResponsePromise = page.waitForResponse((response) =>
      response.url().includes('/api/reelflow/templates') &&
      response.request().method() === 'GET',
      { timeout: TIMEOUTS.navigation },
    );

    await page.goto(PAGES.reelflow, { timeout: TIMEOUTS.navigation });
    const templatesResponse = await templatesResponsePromise;
    expect(templatesResponse.ok(), `Template API failed: ${templatesResponse.status()} ${await templatesResponse.text()}`).toBeTruthy();
    await expect(page.getByTestId('reelflow-generate-page')).toBeVisible();

    await page.getByTestId('reelflow-template-psychology_stickman_001').click();
    await page.locator('#reelflow-topic').fill('how to stop doomscrolling at night');
    await page.getByTestId('reelflow-render-mp4').click();

    const [createJobResponse] = await Promise.all([
      page.waitForResponse((response) =>
        response.url().includes('/api/reelflow/jobs') &&
        response.request().method() === 'POST',
      ),
      page.getByTestId('reelflow-submit-job').click(),
    ]);
    expect(createJobResponse.status(), `Create job failed with status ${createJobResponse.status()}`).toBe(201);
    await page.waitForURL(/\/reelflow\/jobs\/[^/]+$/, { timeout: TIMEOUTS.navigation });
    const jobId = page.url().split('/').pop();
    expect(jobId).toBeTruthy();

    const queued = await getJobDetail(page, jobId!);
    const estimatedCredits = Number(queued.job.estimatedCredits);
    expect(queued.job.renderMp4Requested).toBe(true);
    expect(estimatedCredits).toBeGreaterThan(35);
    expect(queued.stages.some((stage) => stage.stageCode === 'render_mp4')).toBeTruthy();

    const completed = await runWorkerUntilJobCompletes(page, jobId!, {
      REELFLOW_CLOUD_RENDER_MOCK: '1',
    });

    expect(completed.job.status).toBe('completed');
    expect(completed.job.artifactStatus).toBe('downloadable');
    expect(completed.job.settlementStatus).toBe('settled');
    expect(Number(completed.job.actualCredits)).toBe(estimatedCredits);
    expect(completed.stages.find((stage) => stage.stageCode === 'render_mp4')?.status).toBe('completed');

    const renderedAsset = completed.assets.find((asset) => asset.assetType === 'rendered_mp4');
    expect(renderedAsset?.status).toBe('available');
    expect(renderedAsset?.mimeType).toBe('video/mp4');
    expect(renderedAsset?.storageProvider).toBe('mock-cloud-render');
    expect(renderedAsset?.width).toBe(1080);
    expect(renderedAsset?.height).toBe(1920);

    const renderUsage = completed.usageRecords.find((record) => record.resourceType === 'render');
    expect(renderUsage?.assetId).toBe(renderedAsset?.id);
    expect(renderUsage?.model).toContain('cloud-render');
    expect(Number(renderUsage?.creditCost || 0)).toBeGreaterThan(0);

    await page.reload({ timeout: TIMEOUTS.navigation });
    await expect(page.getByTestId('reelflow-job-detail-page')).toBeVisible();
    await expect(page.getByTestId('reelflow-job-asset-rendered_mp4')).toBeVisible();

    const after = await getCredits(page);
    expect(after.account.balance).toBeCloseTo(before.account.balance - estimatedCredits, 5);
    expect(after.account.frozenBalance).toBe(0);
  });

  test('cloud render failure keeps the draft downloadable and refunds MP4 credits', async ({ page }) => {
    test.skip(!process.env.DATABASE_URL, 'DATABASE_URL is required to run the local Reelflow worker in E2E.');

    await createSignedInUser(page, 'reelflow-cloud-render-fail');
    const before = await getCredits(page);

    const createResponse = await page.request.post('/api/reelflow/jobs', {
      data: {
        templateCode: 'psychology_stickman_001',
        inputParams: { topic: 'why unfinished tasks feel so heavy' },
        renderMp4Requested: true,
      },
    });
    expect(createResponse.status(), `Create job failed: ${createResponse.status()} ${await createResponse.text()}`).toBe(201);
    const created: CreateJobResponse = await createResponse.json();

    const completed = await runWorkerUntilJobCompletes(page, created.jobId, {
      REELFLOW_CLOUD_RENDER_MOCK_FAIL: '1',
    });

    expect(completed.job.status).toBe('completed');
    expect(completed.job.artifactStatus).toBe('downloadable');
    expect(completed.job.settlementStatus).toBe('settled');
    expect(Number(completed.job.actualCredits)).toBe(created.estimatedCredits - 20);
    expect(completed.stages.find((stage) => stage.stageCode === 'render_mp4')?.status).toBe('needs_fix');
    expect(completed.assets.some((asset) => asset.assetType === 'draft_package' && asset.status === 'available')).toBeTruthy();
    expect(completed.assets.some((asset) => asset.assetType === 'rendered_mp4')).toBeFalsy();
    expect(completed.usageRecords.some((record) => record.resourceType === 'render')).toBeFalsy();

    const after = await getCredits(page);
    expect(after.account.balance).toBeCloseTo(before.account.balance - created.estimatedCredits + 20, 5);
    expect(after.account.frozenBalance).toBe(0);
    expect(after.ledger.some((item) =>
      item.jobId === created.jobId &&
      item.type === 'settlement' &&
      item.amount === -(created.estimatedCredits - 20),
    )).toBeTruthy();
    expect(after.ledger.some((item) =>
      item.jobId === created.jobId &&
      item.type === 'refund' &&
      item.amount === 20,
    )).toBeTruthy();

    await page.goto(`${PAGES.reelflow}/jobs/${created.jobId}`, { timeout: TIMEOUTS.navigation });
    await expect(page.getByTestId('reelflow-job-detail-page')).toBeVisible();
    await expect(page.getByTestId('reelflow-job-asset-draft_package')).toBeVisible();
  });
});

type CreateJobResponse = {
  jobId: string;
  estimatedCredits: number;
  frozenCredits: number;
};

type CreditPayload = {
  account: {
    balance: number;
    frozenBalance: number;
  };
  ledger: Array<{
    type: string;
    amount: number;
    jobId: string | null;
  }>;
};

type JobDetailPayload = {
  job: {
    status: string;
    artifactStatus: string;
    settlementStatus: string;
    estimatedCredits: string;
    actualCredits: string;
    renderMp4Requested: boolean;
  };
  stages: Array<{
    stageCode: string;
    status: string;
  }>;
  assets: Array<{
    id: string;
    assetType: string;
    status: string;
    mimeType: string | null;
    storageProvider: string | null;
    width: number | null;
    height: number | null;
  }>;
  usageRecords: Array<{
    assetId: string | null;
    resourceType: string;
    model: string | null;
    creditCost: string;
  }>;
};

async function createSignedInUser(page: Page, prefix: string) {
  const response = await signUpViaAPI(page, {
    name: 'Reelflow Cloud Render User',
    email: uniqueEmail(prefix),
    password: 'TestPassword123!',
  });
  expect(response.ok(), `Sign-up failed: ${response.status()} ${await response.text()}`).toBeTruthy();
}

async function getCredits(page: Page): Promise<CreditPayload> {
  const response = await page.request.get('/api/reelflow/credits');
  expect(response.ok(), `Credits API failed: ${response.status()} ${await response.text()}`).toBeTruthy();
  return response.json();
}

async function getJobDetail(page: Page, jobId: string): Promise<JobDetailPayload> {
  const response = await page.request.get(`/api/reelflow/jobs/${jobId}`);
  expect(response.ok(), `Job detail failed: ${response.status()} ${await response.text()}`).toBeTruthy();
  return response.json();
}

async function runWorkerUntilJobCompletes(
  page: Page,
  jobId: string,
  extraEnv: Record<string, string>,
): Promise<JobDetailPayload> {
  const deadline = Date.now() + 90_000;
  let lastPayload: JobDetailPayload | null = null;

  while (Date.now() < deadline) {
    runWorkerOnce(extraEnv);

    lastPayload = await getJobDetail(page, jobId);
    if (lastPayload.job.status === 'completed') return lastPayload;
    if (lastPayload.job.status === 'failed') {
      throw new Error(`Reelflow worker failed target job ${jobId}`);
    }

    await page.waitForTimeout(1000);
  }

  throw new Error(`Timed out waiting for Reelflow job ${jobId} to complete. Last status: ${lastPayload?.job.status ?? 'unknown'}`);
}

function runWorkerOnce(extraEnv: Record<string, string>) {
  const command = process.platform === 'win32' ? process.env.ComSpec || 'cmd.exe' : 'corepack';
  const args = process.platform === 'win32'
    ? ['/d', '/s', '/c', 'corepack pnpm --filter @reelflow/execution-worker once']
    : ['pnpm', '--filter', '@reelflow/execution-worker', 'once'];

  execFileSync(command, args, {
    cwd: resolve(__dirname, '../../..'),
    env: {
      ...process.env,
      ...extraEnv,
      DB_DIALECT: process.env.DB_DIALECT || 'pg',
      REELFLOW_WORKER_EXECUTION_MODE: 'local_draft',
    },
    stdio: 'pipe',
    timeout: 60_000,
  });
}

async function setRenderProviderEnabled() {
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    await client.query(
      `
        update provider_profile
        set enabled = true,
            updated_at = now()
        where provider_type = 'render'
      `,
    );
  } finally {
    await client.end();
  }
}
