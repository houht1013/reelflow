import { test, expect, type Browser, type BrowserContext, type Page } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import pg from 'pg';
import { signInViaAPI, signUpViaAPI } from '../helpers/auth';
import { TIMEOUTS, uniqueEmail } from '../helpers/constants';

const ADMIN_REELFLOW = '/en/admin/reelflow';
const DRAFT_PROVIDER_ID = 'draft:capcut-mate';
const TEMPLATE_CODE = 'psychology_stickman_001';

test.describe('Reelflow admin MVP', () => {
  test.setTimeout(120_000);

  test('non-admin users are redirected away from the Reelflow admin area', async ({ page }) => {
    await createSignedInUser(page, 'reelflow-admin-denied', 'Reelflow Normal User');

    await page.goto(ADMIN_REELFLOW, { timeout: TIMEOUTS.navigation });
    await expect(page).not.toHaveURL(/\/admin\/reelflow/);
  });

  test('admin can operate Reelflow overview and inspect a completed job', async ({ browser }) => {
    test.skip(!process.env.DATABASE_URL, 'DATABASE_URL is required for Reelflow admin E2E setup.');

    await setProviderEnabled(DRAFT_PROVIDER_ID, true);
    const userContext = await browser.newContext();
    const userPage = await userContext.newPage();
    await createSignedInUser(userPage, 'reelflow-admin-job', 'Reelflow Job User');
    const jobId = await createWorkflowJob(userPage);
    await runWorkerUntilJobCompletes(userPage, jobId);
    await userContext.close();

    const adminContext = await createAdminContext(browser);
    const adminPage = await adminContext.newPage();
    const overview = await getAdminOverview(adminPage);
    const template = overview.templates.find((item) => item.code === TEMPLATE_CODE);
    const provider = overview.providers.find((item) => item.id === DRAFT_PROVIDER_ID);
    expect(template, `Template ${TEMPLATE_CODE} should exist`).toBeTruthy();
    expect(provider, `Provider ${DRAFT_PROVIDER_ID} should exist`).toBeTruthy();

    try {
      await adminPage.goto(ADMIN_REELFLOW, { timeout: TIMEOUTS.navigation });
      await adminPage.waitForLoadState('networkidle');
      await expect(adminPage.getByTestId('reelflow-admin-page')).toBeVisible();
      await expect(adminPage.getByTestId('reelflow-admin-templates-section')).toBeVisible();
      await expect(adminPage.getByTestId('reelflow-admin-recent-jobs-section')).toBeVisible();
      await expect(adminPage.getByTestId('reelflow-admin-providers-section')).toBeVisible();
      await expect(adminPage.getByTestId('reelflow-admin-pricing-section')).toBeVisible();

      await toggleTemplatePublish(adminPage, template!);
      await toggleTemplateRecommendation(adminPage, template!);
      await toggleProvider(adminPage, provider!);
      await checkProviderHealth(adminPage, provider!);

      await adminPage.getByTestId(`reelflow-admin-open-job-${jobId}`).click();
      await expect(adminPage).toHaveURL(new RegExp(`/admin/reelflow/jobs/${jobId}`));
      await expect(adminPage.getByTestId('reelflow-admin-job-page')).toBeVisible();
      await expect(adminPage.getByTestId('reelflow-admin-job-stages-section')).toBeVisible();
      await expect(adminPage.getByTestId('reelflow-admin-job-events-section')).toBeVisible();
      await expect(adminPage.getByTestId('reelflow-admin-job-quality-section')).toBeVisible();
      await expect(adminPage.getByTestId('reelflow-admin-job-assets-section')).toBeVisible();
      await expect(adminPage.getByTestId('reelflow-admin-job-usage-section')).toBeVisible();

      const detailBefore = await getAdminJobDetail(adminPage, jobId);
      const nextPriority = detailBefore.job.priority + 1;
      await adminPage.getByTestId('reelflow-admin-job-priority-input').fill(String(nextPriority));
      const priorityResponsePromise = adminPage.waitForResponse((response) =>
        new URL(response.url()).pathname === `/api/admin/reelflow/jobs/${jobId}` &&
        response.request().method() === 'PATCH',
      );
      await adminPage.getByTestId('reelflow-admin-job-priority-save').click();
      const priorityResponse = await priorityResponsePromise;
      expect(priorityResponse.ok(), `Priority update failed: ${priorityResponse.status()}`).toBeTruthy();

      const detailAfter = await getAdminJobDetail(adminPage, jobId);
      expect(detailAfter.job.priority).toBe(nextPriority);
      expect(detailAfter.events.some((event) => event.eventType === 'job_priority_updated')).toBeTruthy();
    } finally {
      if (template) {
        await adminPage.request.patch(`/api/admin/reelflow/templates/${template.id}`, {
          data: {
            status: template.status,
            recommended: template.recommended,
            featuredOrder: template.featuredOrder,
            visibility: template.visibility,
          },
        });
      }
      if (provider) {
        await adminPage.request.patch(`/api/admin/reelflow/providers/${provider.id}`, {
          data: { enabled: provider.enabled, priority: provider.priority },
        });
      }
      await adminContext.close();
    }
  });
});

type AdminOverview = {
  templates: Array<{
    id: string;
    code: string;
    status: string;
    recommended: boolean;
    featuredOrder: number | null;
    visibility: string;
  }>;
  providers: Array<{
    id: string;
    providerType: string;
    provider: string;
    enabled: boolean;
    priority: number;
  }>;
};

type AdminJobDetail = {
  job: {
    priority: number;
  };
  events: Array<{
    eventType: string;
  }>;
};

async function createSignedInUser(page: Page, prefix: string, name: string) {
  const response = await signUpViaAPI(page, {
    name,
    email: uniqueEmail(prefix),
    password: 'TestPassword123!',
  });
  expect(response.ok(), `Sign-up failed: ${response.status()} ${await response.text()}`).toBeTruthy();
}

async function createAdminContext(browser: Browser): Promise<BrowserContext> {
  const setupContext = await browser.newContext();
  const setupPage = await setupContext.newPage();
  const email = uniqueEmail('reelflow-admin');
  const password = 'TestPassword123!';
  const response = await signUpViaAPI(setupPage, {
    name: 'Reelflow Admin User',
    email,
    password,
  });
  expect(response.ok(), `Admin sign-up failed: ${response.status()} ${await response.text()}`).toBeTruthy();
  await promoteUserToAdmin(email);
  await setupContext.close();

  const adminContext = await browser.newContext();
  const adminPage = await adminContext.newPage();
  const signInResponse = await signInViaAPI(adminPage, { email, password });
  expect(signInResponse.ok(), `Admin sign-in failed: ${signInResponse.status()} ${await signInResponse.text()}`).toBeTruthy();
  await adminPage.close();
  return adminContext;
}

async function createWorkflowJob(page: Page): Promise<string> {
  const response = await page.request.post('/api/reelflow/jobs', {
    data: {
      templateCode: TEMPLATE_CODE,
      inputParams: {
        topic: 'admin traceability for a Reelflow workflow',
        audience: 'general',
        tone: 'warm',
        referenceAssetId: '',
      },
      renderMp4Requested: false,
    },
  });
  expect(response.status(), `Create job failed: ${response.status()} ${await response.text()}`).toBe(201);
  const payload = await response.json();
  expect(payload.jobId).toBeTruthy();
  return payload.jobId;
}

async function toggleTemplatePublish(page: Page, template: AdminOverview['templates'][number]) {
  const responsePromise = page.waitForResponse((response) =>
    new URL(response.url()).pathname === `/api/admin/reelflow/templates/${template.id}` &&
    response.request().method() === 'PATCH',
  );
  await page.getByTestId(`reelflow-admin-template-publish-${template.code}`).click();
  const response = await responsePromise;
  expect(response.ok(), `Template publish toggle failed: ${response.status()}`).toBeTruthy();
  const overview = await getAdminOverview(page);
  const updated = overview.templates.find((item) => item.id === template.id);
  expect(updated?.status).toBe(template.status === 'published' ? 'draft' : 'published');
}

async function toggleTemplateRecommendation(page: Page, template: AdminOverview['templates'][number]) {
  const responsePromise = page.waitForResponse((response) =>
    new URL(response.url()).pathname === `/api/admin/reelflow/templates/${template.id}` &&
    response.request().method() === 'PATCH',
  );
  await page.getByTestId(`reelflow-admin-template-recommend-${template.code}`).click();
  const response = await responsePromise;
  expect(response.ok(), `Template recommendation toggle failed: ${response.status()}`).toBeTruthy();
  const overview = await getAdminOverview(page);
  const updated = overview.templates.find((item) => item.id === template.id);
  expect(updated?.recommended).toBe(!template.recommended);
}

async function toggleProvider(page: Page, provider: AdminOverview['providers'][number]) {
  const key = `${provider.providerType}-${provider.provider}`;
  const responsePromise = page.waitForResponse((response) =>
    new URL(response.url()).pathname === `/api/admin/reelflow/providers/${provider.id}` &&
    response.request().method() === 'PATCH',
  );
  await page.getByTestId(`reelflow-admin-provider-toggle-${key}`).click();
  const response = await responsePromise;
  expect(response.ok(), `Provider toggle failed: ${response.status()}`).toBeTruthy();
  const overview = await getAdminOverview(page);
  const updated = overview.providers.find((item) => item.id === provider.id);
  expect(updated?.enabled).toBe(!provider.enabled);
}

async function checkProviderHealth(page: Page, provider: AdminOverview['providers'][number]) {
  const key = `${provider.providerType}-${provider.provider}`;
  await page.request.patch(`/api/admin/reelflow/providers/${provider.id}`, {
    data: { enabled: true, priority: provider.priority },
  });
  await page.reload({ waitUntil: 'networkidle' });
  const responsePromise = page.waitForResponse((response) =>
    new URL(response.url()).pathname === `/api/admin/reelflow/providers/${provider.id}/health` &&
    response.request().method() === 'POST',
  );
  await page.getByTestId(`reelflow-admin-provider-health-${key}`).click();
  const response = await responsePromise;
  expect(response.ok(), `Provider health check failed: ${response.status()} ${await response.text()}`).toBeTruthy();
  const body = await response.json();
  expect(body.healthCheck.providerProfileId).toBe(provider.id);
}

async function getAdminOverview(page: Page): Promise<AdminOverview> {
  const response = await page.request.get('/api/admin/reelflow/overview');
  expect(response.ok(), `Admin overview failed: ${response.status()} ${await response.text()}`).toBeTruthy();
  return response.json();
}

async function getAdminJobDetail(page: Page, jobId: string): Promise<AdminJobDetail> {
  const response = await page.request.get(`/api/admin/reelflow/jobs/${jobId}`);
  expect(response.ok(), `Admin job detail failed: ${response.status()} ${await response.text()}`).toBeTruthy();
  return response.json();
}

async function runWorkerUntilJobCompletes(page: Page, jobId: string) {
  const deadline = Date.now() + 90_000;
  let lastStatus = 'unknown';

  while (Date.now() < deadline) {
    runWorkerOnce();
    const response = await page.request.get(`/api/reelflow/jobs/${jobId}`);
    expect(response.ok(), `Job detail failed: ${response.status()} ${await response.text()}`).toBeTruthy();
    const payload = await response.json();
    lastStatus = payload.job.status;
    if (lastStatus === 'completed') return;
    if (lastStatus === 'failed') throw new Error(`Reelflow worker failed target job ${jobId}`);
    await page.waitForTimeout(1000);
  }

  throw new Error(`Timed out waiting for Reelflow job ${jobId} to complete. Last status: ${lastStatus}`);
}

function runWorkerOnce() {
  const command = process.platform === 'win32' ? process.env.ComSpec || 'cmd.exe' : 'corepack';
  const args = process.platform === 'win32'
    ? ['/d', '/s', '/c', 'corepack pnpm --filter @reelflow/execution-worker once']
    : ['pnpm', '--filter', '@reelflow/execution-worker', 'once'];

  execFileSync(command, args, {
    cwd: resolve(__dirname, '../../..'),
    env: {
      ...process.env,
      DB_DIALECT: process.env.DB_DIALECT || 'pg',
      REELFLOW_WORKER_EXECUTION_MODE: 'local_draft',
    },
    stdio: 'pipe',
    timeout: 60_000,
  });
}

async function promoteUserToAdmin(email: string) {
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    await client.query('update "user" set role = $2, updated_at = now() where email = $1', [email, 'admin']);
  } finally {
    await client.end();
  }
}

async function setProviderEnabled(providerProfileId: string, enabled: boolean) {
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    await client.query(
      `
        update provider_profile
        set enabled = $2,
            updated_at = now()
        where id = $1
      `,
      [providerProfileId, enabled],
    );
  } finally {
    await client.end();
  }
}
