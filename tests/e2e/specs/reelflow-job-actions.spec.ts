import { test, expect, type Page } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import pg from 'pg';
import { TIMEOUTS, uniqueEmail } from '../helpers/constants';
import { signUpViaAPI } from '../helpers/auth';

test.describe('Reelflow job recovery actions', () => {
  test('failed job can retry from failed point and worker skips completed stages', async ({ page }) => {
    test.skip(!process.env.DATABASE_URL, 'DATABASE_URL is required to verify Reelflow retry actions.');

    await createSignedInUser(page, 'reelflow-retry');
    const jobId = await createWorkflowJob(page, 'retry from a failed workflow stage');
    const failedState = await markJobFailedAtSecondStage(jobId);

    await page.goto(`/en/reelflow/jobs/${jobId}`, { timeout: TIMEOUTS.navigation });
    await expect(page.getByTestId('reelflow-job-detail-page')).toBeVisible();
    await expect(page.getByTestId('reelflow-job-retry')).toBeVisible();
    await expect(page.getByTestId('reelflow-job-rerun')).toBeVisible();

    const [retryResponse] = await Promise.all([
      page.waitForResponse((response) =>
        response.url().includes(`/api/reelflow/jobs/${jobId}/retry`) &&
        response.request().method() === 'POST',
      ),
      page.getByTestId('reelflow-job-retry').click(),
    ]);
    expect(retryResponse.ok(), `Retry failed: ${retryResponse.status()} ${await retryResponse.text()}`).toBeTruthy();

    const queuedDetail = await getJobDetail(page, jobId);
    expect(queuedDetail.job.status).toBe('queued');
    expect(queuedDetail.job.lastErrorMessage).toBeNull();
    expect(queuedDetail.events.some((event) => event.eventType === 'job_retry_requested')).toBeTruthy();
    expect(stageByCode(queuedDetail, failedState.completedStageCode).status).toBe('completed');
    expect(stageByCode(queuedDetail, failedState.failedStageCode).status).toBe('pending');

    const completedDetail = await runWorkerUntilJobCompletes(page, jobId);
    expect(completedDetail.job.status).toBe('completed');
    expect(completedDetail.job.artifactStatus).toBe('downloadable');
    expect(stageByCode(completedDetail, failedState.completedStageCode).attemptCount).toBe(1);
    expect(stageByCode(completedDetail, failedState.failedStageCode).attemptCount).toBeGreaterThanOrEqual(2);
  });

  test('completed job can be rerun with a new freeze and same input params', async ({ page }) => {
    test.skip(!process.env.DATABASE_URL, 'DATABASE_URL is required to verify Reelflow rerun actions.');

    await createSignedInUser(page, 'reelflow-rerun');
    const originalJobId = await createWorkflowJob(page, 'rerun keeps the same inputs');
    const completedOriginal = await runWorkerUntilJobCompletes(page, originalJobId);
    const creditsBefore = await getCredits(page);

    await page.goto(`/en/reelflow/jobs/${originalJobId}`, { timeout: TIMEOUTS.navigation });
    await expect(page.getByTestId('reelflow-job-detail-page')).toBeVisible();
    await expect(page.getByTestId('reelflow-job-rerun')).toBeVisible();

    const [rerunResponse] = await Promise.all([
      page.waitForResponse((response) =>
        response.url().includes(`/api/reelflow/jobs/${originalJobId}/rerun`) &&
        response.request().method() === 'POST',
      ),
      page.getByTestId('reelflow-job-rerun').click(),
    ]);
    expect(rerunResponse.status()).toBe(201);

    await page.waitForURL(/\/reelflow\/jobs\/[^/]+$/, { timeout: TIMEOUTS.navigation });
    const rerunJobId = page.url().split('/').pop();
    expect(rerunJobId).toBeTruthy();
    expect(rerunJobId).not.toBe(originalJobId);

    const newJobDetail = await getJobDetail(page, rerunJobId!);
    expect(newJobDetail.job.status).toBe('queued');
    expect(newJobDetail.job.inputParams.topic).toBe(completedOriginal.job.inputParams.topic);
    const rerunEstimatedCredits = Number(newJobDetail.job.frozenCredits);
    expect(rerunEstimatedCredits).toBeGreaterThan(0);

    const creditsAfter = await getCredits(page);
    expect(creditsAfter.account.balance).toBe(creditsBefore.account.balance - rerunEstimatedCredits);
    expect(creditsAfter.account.frozenBalance).toBe(creditsBefore.account.frozenBalance + rerunEstimatedCredits);
    expect(creditsAfter.ledger.some((item) =>
      item.type === 'freeze' &&
      item.jobId === rerunJobId &&
      item.amount === -rerunEstimatedCredits,
    )).toBeTruthy();

    const originalDetailAfter = await getJobDetail(page, originalJobId);
    expect(originalDetailAfter.events.some((event) => event.eventType === 'job_rerun_created')).toBeTruthy();
  });

  test('preflight failure blocks retry without mutating the failed job', async ({ page }) => {
    test.skip(!process.env.DATABASE_URL, 'DATABASE_URL is required to verify Reelflow recovery preflight.');

    let originalProvider: ProviderProfileState | null = null;
    await createSignedInUser(page, 'reelflow-retry-preflight');
    const jobId = await createWorkflowJob(page, 'retry should be blocked by disabled provider');
    await markJobFailedAtSecondStage(jobId);
    const before = await getJobDetail(page, jobId);

    try {
      originalProvider = await setProviderEnabled('draft:capcut-mate', false);
      await page.goto(`/en/reelflow/jobs/${jobId}`, { timeout: TIMEOUTS.navigation });
      await expect(page.getByTestId('reelflow-job-detail-page')).toBeVisible();

      const [retryResponse] = await Promise.all([
        page.waitForResponse((response) =>
          response.url().includes(`/api/reelflow/jobs/${jobId}/retry`) &&
          response.request().method() === 'POST',
        ),
        page.getByTestId('reelflow-job-retry').click(),
      ]);
      expect(retryResponse.status()).toBe(409);
      const rejected: ReelflowPreflightRejectedPayload = await retryResponse.json();
      expect(rejected.preflight.errors.some((item) => item.code === 'provider_disabled')).toBeTruthy();
      await expect(page.getByTestId('reelflow-job-action-error')).toBeVisible();

      const after = await getJobDetail(page, jobId);
      expect(after.job.status).toBe('failed');
      expect(after.job.lastErrorMessage).toBe(before.job.lastErrorMessage);
      expect(after.stages.map((stage) => `${stage.stageCode}:${stage.status}`)).toEqual(
        before.stages.map((stage) => `${stage.stageCode}:${stage.status}`),
      );
    } finally {
      if (originalProvider) {
        await setProviderEnabled(originalProvider.id, originalProvider.enabled);
      }
    }
  });
});

type ReelflowJobDetailPayload = {
  job: {
    status: string;
    artifactStatus: string;
    settlementStatus: string;
    inputParams: Record<string, string>;
    frozenCredits: string;
    lastErrorMessage: string | null;
  };
  stages: Array<{
    stageCode: string;
    status: string;
    attemptCount: number;
  }>;
  events: Array<{
    eventType: string;
  }>;
};

type ReelflowCreditsPayload = {
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

type FailedStageState = {
  completedStageCode: string;
  failedStageCode: string;
};

type ProviderProfileState = {
  id: string;
  enabled: boolean;
};

type ReelflowPreflightRejectedPayload = {
  preflight: {
    errors: Array<{ code: string }>;
  };
};

async function createSignedInUser(page: Page, prefix: string) {
  const response = await signUpViaAPI(page, {
    name: 'Reelflow Job Action User',
    email: uniqueEmail(prefix),
    password: 'TestPassword123!',
  });
  expect(response.ok(), `Sign-up failed: ${response.status()} ${await response.text()}`).toBeTruthy();
}

async function createWorkflowJob(page: Page, topic: string): Promise<string> {
  const response = await page.request.post('/api/reelflow/jobs', {
    data: {
      templateCode: 'psychology_stickman_001',
      inputParams: {
        topic,
        audience: 'general viewers',
        tone: 'warm',
        referenceAssetId: '',
      },
      renderMp4Requested: false,
    },
  });
  expect(response.status(), `Create job failed: ${await response.text()}`).toBe(201);
  const payload: { jobId: string } = await response.json();
  expect(payload.jobId).toBeTruthy();
  return payload.jobId;
}

async function getJobDetail(page: Page, jobId: string): Promise<ReelflowJobDetailPayload> {
  const response = await page.request.get(`/api/reelflow/jobs/${jobId}`);
  expect(response.ok(), `Job detail failed: ${response.status()} ${await response.text()}`).toBeTruthy();
  return response.json();
}

async function getCredits(page: Page): Promise<ReelflowCreditsPayload> {
  const response = await page.request.get('/api/reelflow/credits');
  expect(response.ok(), `Credits API failed: ${response.status()} ${await response.text()}`).toBeTruthy();
  return response.json();
}

function stageByCode(payload: ReelflowJobDetailPayload, stageCode: string) {
  const stage = payload.stages.find((item) => item.stageCode === stageCode);
  expect(stage, `Missing stage ${stageCode}`).toBeTruthy();
  return stage!;
}

async function markJobFailedAtSecondStage(jobId: string): Promise<FailedStageState> {
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    const stages = await client.query<{ id: string; stage_code: string }>(
      `
        select id, stage_code
        from job_stage
        where job_id = $1
        order by sort_order asc
        limit 2
      `,
      [jobId],
    );
    expect(stages.rows.length).toBeGreaterThanOrEqual(2);
    const completedStage = stages.rows[0];
    const failedStage = stages.rows[1];

    await client.query('begin');
    await client.query(
      `
        update job_stage
        set status = 'completed',
            attempt_count = 1,
            started_at = now() - interval '1 minute',
            completed_at = now(),
            error_code = null,
            error_message = null,
            updated_at = now()
        where id = $1
      `,
      [completedStage.id],
    );
    await client.query(
      `
        update job_stage
        set status = 'failed',
            attempt_count = 1,
            started_at = now() - interval '30 seconds',
            completed_at = null,
            error_code = 'e2e_stage_failure',
            error_message = 'E2E injected stage failure',
            updated_at = now()
        where id = $1
      `,
      [failedStage.id],
    );
    await client.query(
      `
        update job
        set status = 'failed',
            attempt_count = 1,
            last_error_code = 'e2e_worker_error',
            last_error_message = 'E2E injected worker failure',
            locked_by = null,
            locked_at = null,
            updated_at = now()
        where id = $1
      `,
      [jobId],
    );
    await client.query(
      `
        insert into job_event (id, job_id, stage_id, level, event_type, message, data, created_at)
        values ($1, $2, $3, 'error', 'job_failed', 'E2E injected worker failure', '{"code":"e2e_worker_error"}'::jsonb, now())
      `,
      [crypto.randomUUID(), jobId, failedStage.id],
    );
    await client.query('commit');

    return {
      completedStageCode: completedStage.stage_code,
      failedStageCode: failedStage.stage_code,
    };
  } catch (error) {
    await client.query('rollback').catch(() => undefined);
    throw error;
  } finally {
    await client.end();
  }
}

async function runWorkerUntilJobCompletes(page: Page, jobId: string): Promise<ReelflowJobDetailPayload> {
  const deadline = Date.now() + 90_000;
  let lastPayload: ReelflowJobDetailPayload | null = null;

  while (Date.now() < deadline) {
    runWorkerOnce();

    lastPayload = await getJobDetail(page, jobId);
    if (lastPayload.job.status === 'completed') return lastPayload;
    if (lastPayload.job.status === 'failed') {
      throw new Error(`Reelflow worker failed target job ${jobId}: ${lastPayload.job.lastErrorMessage || 'unknown error'}`);
    }

    await page.waitForTimeout(1000);
  }

  throw new Error(`Timed out waiting for Reelflow job ${jobId} to complete. Last status: ${lastPayload?.job.status ?? 'unknown'}`);
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
      DATABASE_URL: process.env.DATABASE_URL,
      REELFLOW_WORKER_EXECUTION_MODE: 'local_draft',
    },
    stdio: 'pipe',
    timeout: 60_000,
  });
}

async function setProviderEnabled(providerProfileId: string, enabled: boolean): Promise<ProviderProfileState | null> {
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    const existing = await client.query<ProviderProfileState>(
      `
        select id, enabled
        from provider_profile
        where id = $1
        limit 1
      `,
      [providerProfileId],
    );
    await client.query(
      `
        update provider_profile
        set enabled = $2,
            updated_at = now()
        where id = $1
      `,
      [providerProfileId, enabled],
    );
    return existing.rows[0] || null;
  } finally {
    await client.end();
  }
}
