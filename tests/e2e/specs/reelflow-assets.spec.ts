import { test, expect, type Page } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import pg from 'pg';
import { PAGES, TIMEOUTS, uniqueEmail } from '../helpers/constants';
import { signUpViaAPI } from '../helpers/auth';

test.describe('Reelflow MVP asset library', () => {
  test.setTimeout(90_000);

  test('unauthenticated users are redirected from the asset library', async ({ page }) => {
    await page.goto(PAGES.reelflowAssets, { timeout: TIMEOUTS.navigation });
    await expect(page).toHaveURL(/\/signin/);
  });

  test('personal reference asset can be selected when creating a workflow job', async ({ page }) => {
    const email = uniqueEmail('reelflow-assets');
    const password = 'TestPassword123!';

    const signUpRes = await signUpViaAPI(page, {
      name: 'Reelflow Asset User',
      email,
      password,
    });
    expect(signUpRes.ok(), `Sign-up failed: ${signUpRes.status()}`).toBeTruthy();

    const displayName = `Reference frame ${Date.now()}`;
    const createAssetResponse = await page.request.post('/api/reelflow/assets', {
      data: {
        assetType: 'reference_image',
        storageProvider: 'r2',
        storageKey: `e2e/reelflow/reference-${Date.now()}.png`,
        url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAFgwJ/lYgS5wAAAABJRU5ErkJggg==',
        mimeType: 'image/png',
        fileSize: 70,
        originalName: 'reference.png',
        displayName,
      },
    });
    expect(createAssetResponse.status(), `Create asset failed: ${await createAssetResponse.text()}`).toBe(201);
    const createdAsset: CreateAssetPayload = await createAssetResponse.json();
    expect(createdAsset.asset.id).toBeTruthy();

    await page.goto(PAGES.reelflowAssets, { timeout: TIMEOUTS.navigation });
    await expect(page.getByTestId('reelflow-assets-page')).toBeVisible();
    await expect(page.getByTestId('reelflow-asset-card-reference_image')).toBeVisible({
      timeout: TIMEOUTS.navigation,
    });
    await expect(page.getByText(displayName)).toBeVisible();

    const createJobResponsePromise = page.waitForResponse((response) =>
      response.url().includes('/api/reelflow/jobs') &&
      response.request().method() === 'POST',
      { timeout: TIMEOUTS.navigation },
    );
    await page.goto(PAGES.reelflow, { timeout: TIMEOUTS.navigation });
    await expect(page.getByTestId('reelflow-generate-page')).toBeVisible();
    await page.getByTestId('reelflow-template-psychology_stickman_001').click();
    await page.locator('#reelflow-topic').fill('using a personal visual reference in a short video');
    await expect(page.getByTestId('reelflow-asset-picker-referenceAssetId')).toBeVisible();
    await expect(page.getByTestId(`reelflow-asset-picker-option-${createdAsset.asset.id}`)).toBeVisible({
      timeout: TIMEOUTS.navigation,
    });
    await page.getByTestId(`reelflow-asset-picker-option-${createdAsset.asset.id}`).click();
    await expect(page.getByTestId('reelflow-asset-picker-referenceAssetId')).toContainText(displayName);
    await page.getByTestId('reelflow-submit-job').click();

    const createJobResponse = await createJobResponsePromise;
    expect(createJobResponse.status()).toBe(201);
    await page.waitForURL(/\/reelflow\/jobs\/[^/]+$/, { timeout: TIMEOUTS.navigation });
    const jobId = page.url().split('/').pop();
    expect(jobId).toBeTruthy();

    const detailResponse = await page.request.get(`/api/reelflow/jobs/${jobId}`);
    expect(detailResponse.ok(), `Job detail failed: ${detailResponse.status()}`).toBeTruthy();
    const detail: JobDetailPayload = await detailResponse.json();
    expect(detail.job.inputParams.referenceAssetId).toBe(createdAsset.asset.id);
    expect(detail.job.inputParams.topic).toBe('using a personal visual reference in a short video');
  });

  test('personal assets can be searched, previewed, and removed', async ({ page }) => {
    await createSignedInUser(page, 'reelflow-assets-manage');

    const displayName = `Searchable reference ${Date.now()}`;
    const targetAsset = await createReferenceAsset(page, {
      displayName,
      assetType: 'reference_image',
      storageKey: `e2e/reelflow/searchable-${Date.now()}.png`,
    });
    await createReferenceAsset(page, {
      displayName: `Other logo ${Date.now()}`,
      assetType: 'logo',
      storageKey: `e2e/reelflow/other-logo-${Date.now()}.png`,
    });

    await page.goto(PAGES.reelflowAssets, { timeout: TIMEOUTS.navigation });
    await page.waitForLoadState('networkidle');
    await expect(page.getByTestId('reelflow-assets-page')).toBeVisible();
    await page.getByTestId('reelflow-assets-source-personal').click();
    await page.getByTestId('reelflow-assets-search').click();
    await page.getByTestId('reelflow-assets-search').pressSequentially(displayName);
    await expect(page.getByTestId('reelflow-assets-search')).toHaveValue(displayName);

    const targetCard = page.getByTestId('reelflow-asset-card-reference_image').filter({ hasText: displayName });
    await expect(targetCard).toBeVisible({ timeout: TIMEOUTS.navigation });
    await expect(page.getByText('Other logo')).toHaveCount(0, { timeout: TIMEOUTS.navigation });

    await targetCard.getByTestId('reelflow-asset-preview-reference_image').click();
    await expect(page.getByTestId('reelflow-asset-library-preview-dialog')).toBeVisible();
    await page.keyboard.press('Escape');

    await targetCard.getByTestId('reelflow-asset-delete-reference_image').click();
    await page.getByTestId('reelflow-asset-confirm-delete-reference_image').click();
    await expect(page.getByTestId('reelflow-assets-empty')).toBeVisible({ timeout: TIMEOUTS.navigation });

    const assetsAfterDelete = await getAssets(page, 'personal');
    expect(assetsAfterDelete.assets.some((asset) => asset.id === targetAsset.asset.id)).toBeFalsy();
  });

  test('personal material can be uploaded and saved in the asset library', async ({ page }) => {
    await createSignedInUser(page, 'reelflow-assets-upload');

    const fileName = `uploaded-reference-${Date.now()}.png`;
    await page.goto(PAGES.reelflowAssets, { timeout: TIMEOUTS.navigation });
    await page.waitForLoadState('networkidle');
    await expect(page.getByTestId('reelflow-assets-page')).toBeVisible();

    await page.getByTestId('reelflow-asset-upload-input').setInputFiles({
      name: fileName,
      mimeType: 'image/png',
      buffer: Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAFgwJ/lYgS5wAAAABJRU5ErkJggg==',
        'base64',
      ),
    });
    await expect(page.getByTestId('reelflow-asset-upload-choose')).toContainText(fileName);
    await expect(page.getByTestId('reelflow-asset-upload-submit')).toBeEnabled();

    const uploadResponsePromise = page.waitForResponse((response) =>
      new URL(response.url()).pathname === '/api/upload' &&
      response.request().method() === 'POST',
    );
    const registerResponsePromise = page.waitForResponse((response) =>
      new URL(response.url()).pathname === '/api/reelflow/assets' &&
      response.request().method() === 'POST',
    );
    await page.getByTestId('reelflow-asset-upload-submit').click();

    const uploadResponse = await uploadResponsePromise;
    expect(uploadResponse.ok(), `Upload failed: ${uploadResponse.status()} ${await uploadResponse.text()}`).toBeTruthy();
    const registerResponse = await registerResponsePromise;
    expect(registerResponse.status(), `Register uploaded asset failed: ${await registerResponse.text()}`).toBe(201);
    await expect(page.getByText('Material saved')).toBeVisible({ timeout: TIMEOUTS.navigation });

    await page.getByTestId('reelflow-assets-source-personal').click();
    await expect(page.getByText(fileName)).toBeVisible({ timeout: TIMEOUTS.navigation });
  });

  test('task output assets stay read-only and link back to the source job', async ({ page }) => {
    test.skip(!process.env.DATABASE_URL, 'DATABASE_URL is required to run the local Reelflow worker in E2E.');

    await setProviderEnabled('draft:capcut-mate', true);
    await createSignedInUser(page, 'reelflow-assets-task');

    const createJobResponse = await page.request.post('/api/reelflow/jobs', {
      data: {
        templateCode: 'psychology_stickman_001',
        inputParams: {
          topic: 'task output should stay linked in the asset library',
          audience: 'general',
          tone: 'warm',
          referenceAssetId: '',
        },
        renderMp4Requested: false,
      },
    });
    expect(createJobResponse.status(), `Create job failed: ${createJobResponse.status()} ${await createJobResponse.text()}`).toBe(201);
    const createdJob: CreateJobPayload = await createJobResponse.json();
    await runWorkerUntilJobCompletes(page, createdJob.jobId);

    await page.goto(PAGES.reelflowAssets, { timeout: TIMEOUTS.navigation });
    await expect(page.getByTestId('reelflow-assets-page')).toBeVisible();
    await page.getByTestId('reelflow-assets-source-task').click();
    await expect(page.getByTestId('reelflow-asset-card-draft_package')).toBeVisible({ timeout: TIMEOUTS.navigation });
    await expect(page.getByTestId('reelflow-asset-delete-draft_package')).toHaveCount(0);

    await page.getByTestId('reelflow-asset-open-job-draft_package').click();
    await expect(page).toHaveURL(new RegExp(`/reelflow/jobs/${createdJob.jobId}`));
    await expect(page.getByTestId('reelflow-job-detail-page')).toBeVisible();
  });
});

type CreateAssetPayload = {
  asset: {
    id: string;
  };
};

type CreateJobPayload = {
  jobId: string;
};

type AssetsPayload = {
  assets: Array<{
    id: string;
    assetType: string;
  }>;
};

type JobDetailPayload = {
  job: {
    inputParams: {
      topic?: string;
      referenceAssetId?: string;
    };
  };
};

async function createSignedInUser(page: Page, prefix: string) {
  const signUpRes = await signUpViaAPI(page, {
    name: 'Reelflow Asset User',
    email: uniqueEmail(prefix),
    password: 'TestPassword123!',
  });
  expect(signUpRes.ok(), `Sign-up failed: ${signUpRes.status()} ${await signUpRes.text()}`).toBeTruthy();
}

async function createReferenceAsset(
  page: Page,
  input: {
    displayName: string;
    assetType: 'reference_image' | 'logo' | 'image' | 'avatar';
    storageKey: string;
  },
): Promise<CreateAssetPayload> {
  const response = await page.request.post('/api/reelflow/assets', {
    data: {
      assetType: input.assetType,
      storageProvider: 'r2',
      storageKey: input.storageKey,
      url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAFgwJ/lYgS5wAAAABJRU5ErkJggg==',
      mimeType: 'image/png',
      fileSize: 70,
      originalName: 'reference.png',
      displayName: input.displayName,
    },
  });
  expect(response.status(), `Create asset failed: ${response.status()} ${await response.text()}`).toBe(201);
  return response.json();
}

async function getAssets(page: Page, source: 'all' | 'personal' | 'task'): Promise<AssetsPayload> {
  const response = await page.request.get(`/api/reelflow/assets?source=${source}`);
  expect(response.ok(), `Assets API failed: ${response.status()} ${await response.text()}`).toBeTruthy();
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
    if (lastStatus === 'completed') return payload;
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
