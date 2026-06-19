import { test, expect } from '@playwright/test';
import pg from 'pg';
import { PAGES, TIMEOUTS, uniqueEmail } from '../helpers/constants';
import { signUpViaAPI } from '../helpers/auth';

test.describe('Reelflow MVP preflight guardrails', () => {
  test('blocked content is rejected before job creation or credit freeze', async ({ page }) => {
    test.skip(!process.env.DATABASE_URL, 'DATABASE_URL is required to verify Reelflow safety checks.');

    const email = uniqueEmail('reelflow-preflight');
    const password = 'TestPassword123!';

    const signUpRes = await signUpViaAPI(page, {
      name: 'Reelflow Preflight User',
      email,
      password,
    });
    expect(signUpRes.ok(), `Sign-up failed: ${signUpRes.status()}`).toBeTruthy();

    const creditsBeforeResponse = await page.request.get('/api/reelflow/credits');
    expect(creditsBeforeResponse.ok(), `Credits API before submit failed: ${creditsBeforeResponse.status()}`).toBeTruthy();
    const creditsBefore: ReelflowCreditsPayload = await creditsBeforeResponse.json();
    expect(creditsBefore.ledger.some((item) => item.type === 'freeze')).toBeFalsy();

    const jobsBeforeResponse = await page.request.get('/api/reelflow/jobs');
    expect(jobsBeforeResponse.ok(), `Jobs API before submit failed: ${jobsBeforeResponse.status()}`).toBeTruthy();
    const jobsBefore: ReelflowJobsPayload = await jobsBeforeResponse.json();

    const templatesResponsePromise = page.waitForResponse((response) =>
      response.url().includes('/api/reelflow/templates') &&
      response.request().method() === 'GET',
      { timeout: TIMEOUTS.navigation },
    );
    await page.goto(PAGES.reelflow, { timeout: TIMEOUTS.navigation });
    const templatesResponse = await templatesResponsePromise;
    expect(templatesResponse.ok(), `Template API failed: ${templatesResponse.status()}`).toBeTruthy();

    await expect(page.getByTestId('reelflow-generate-page')).toBeVisible();
    await page.getByTestId('reelflow-template-psychology_stickman_001').click();
    await page.locator('#reelflow-topic').fill('political violence explainer for a short video');

    const [createJobResponse] = await Promise.all([
      page.waitForResponse((response) =>
        response.url().includes('/api/reelflow/jobs') &&
        response.request().method() === 'POST',
      ),
      page.getByTestId('reelflow-submit-job').click(),
    ]);

    expect(createJobResponse.status()).toBe(409);
    const rejectedPayload: ReelflowPreflightRejectedPayload = await createJobResponse.json();
    expect(rejectedPayload.preflight.ok).toBe(false);
    expect(rejectedPayload.preflight.errors.some((item) => item.code === 'content_blocked')).toBeTruthy();

    await expect(page).toHaveURL(new RegExp(`${PAGES.reelflow}/?$`));
    await expect(page.getByTestId('reelflow-preflight-alert')).toBeVisible();

    const jobsAfterResponse = await page.request.get('/api/reelflow/jobs');
    expect(jobsAfterResponse.ok(), `Jobs API after submit failed: ${jobsAfterResponse.status()}`).toBeTruthy();
    const jobsAfter: ReelflowJobsPayload = await jobsAfterResponse.json();
    expect(jobsAfter.total).toBe(jobsBefore.total);
    expect(jobsAfter.jobs.length).toBe(jobsBefore.jobs.length);

    const creditsAfterResponse = await page.request.get('/api/reelflow/credits');
    expect(creditsAfterResponse.ok(), `Credits API after submit failed: ${creditsAfterResponse.status()}`).toBeTruthy();
    const creditsAfter: ReelflowCreditsPayload = await creditsAfterResponse.json();
    expect(creditsAfter.account.balance).toBe(creditsBefore.account.balance);
    expect(creditsAfter.account.frozenBalance).toBe(creditsBefore.account.frozenBalance);
    expect(creditsAfter.ledger.some((item) => item.type === 'freeze')).toBeFalsy();

    const safetyCheck = await findLatestSafetyCheck(creditsBefore.workspace.id);
    expect(safetyCheck?.status).toBe('blocked');
    expect(safetyCheck?.job_id).toBeNull();
    expect(JSON.stringify(safetyCheck?.matched_rules || [])).toContain('political violence');
  });

  test('workspace queue limit blocks another job without adding a second freeze', async ({ page }) => {
    test.skip(!process.env.DATABASE_URL, 'DATABASE_URL is required to verify Reelflow queue preflight.');

    const email = uniqueEmail('reelflow-queue');
    const password = 'TestPassword123!';

    const signUpRes = await signUpViaAPI(page, {
      name: 'Reelflow Queue User',
      email,
      password,
    });
    expect(signUpRes.ok(), `Sign-up failed: ${signUpRes.status()}`).toBeTruthy();

    const creditsBeforeResponse = await page.request.get('/api/reelflow/credits');
    expect(creditsBeforeResponse.ok(), `Credits API before queue setup failed: ${creditsBeforeResponse.status()}`).toBeTruthy();
    const creditsBefore: ReelflowCreditsPayload = await creditsBeforeResponse.json();
    await setWorkspaceQueueLimit(creditsBefore.workspace.id, 1);

    const firstJobResponse = await page.request.post('/api/reelflow/jobs', {
      data: {
        templateCode: 'psychology_stickman_001',
        inputParams: {
          topic: 'how to stop overthinking before sleep',
          audience: 'general',
          tone: 'warm',
          referenceAssetId: '',
        },
        renderMp4Requested: false,
      },
    });
    expect(firstJobResponse.status(), `First job failed: ${await firstJobResponse.text()}`).toBe(201);

    const creditsAfterFirstResponse = await page.request.get('/api/reelflow/credits');
    expect(creditsAfterFirstResponse.ok(), `Credits API after first job failed: ${creditsAfterFirstResponse.status()}`).toBeTruthy();
    const creditsAfterFirst: ReelflowCreditsPayload = await creditsAfterFirstResponse.json();
    const freezeCountAfterFirst = countLedgerType(creditsAfterFirst, 'freeze');
    expect(freezeCountAfterFirst).toBe(countLedgerType(creditsBefore, 'freeze') + 1);

    await page.goto(PAGES.reelflow, { timeout: TIMEOUTS.navigation });
    await expect(page.getByTestId('reelflow-generate-page')).toBeVisible();
    await page.getByTestId('reelflow-template-psychology_stickman_001').click();
    await page.locator('#reelflow-topic').fill('a calming habit for focus');

    const [createJobResponse] = await Promise.all([
      page.waitForResponse((response) =>
        response.url().includes('/api/reelflow/jobs') &&
        response.request().method() === 'POST',
      ),
      page.getByTestId('reelflow-submit-job').click(),
    ]);

    expect(createJobResponse.status()).toBe(409);
    const rejectedPayload: ReelflowPreflightRejectedPayload = await createJobResponse.json();
    expect(rejectedPayload.preflight.ok).toBe(false);
    expect(rejectedPayload.preflight.errors.some((item) => item.code === 'queue_limit_exceeded')).toBeTruthy();
    await expect(page.getByTestId('reelflow-preflight-alert')).toBeVisible();

    const creditsAfterRejectedResponse = await page.request.get('/api/reelflow/credits');
    expect(creditsAfterRejectedResponse.ok(), `Credits API after rejected job failed: ${creditsAfterRejectedResponse.status()}`).toBeTruthy();
    const creditsAfterRejected: ReelflowCreditsPayload = await creditsAfterRejectedResponse.json();
    expect(creditsAfterRejected.account.balance).toBe(creditsAfterFirst.account.balance);
    expect(creditsAfterRejected.account.frozenBalance).toBe(creditsAfterFirst.account.frozenBalance);
    expect(countLedgerType(creditsAfterRejected, 'freeze')).toBe(freezeCountAfterFirst);

    const jobsAfterResponse = await page.request.get('/api/reelflow/jobs');
    expect(jobsAfterResponse.ok(), `Jobs API after rejected queue job failed: ${jobsAfterResponse.status()}`).toBeTruthy();
    const jobsAfter: ReelflowJobsPayload = await jobsAfterResponse.json();
    expect(jobsAfter.total).toBe(1);
  });

  test('disabled provider blocks job creation before credits are frozen', async ({ page }) => {
    test.skip(!process.env.DATABASE_URL, 'DATABASE_URL is required to verify Reelflow provider preflight.');

    const email = uniqueEmail('reelflow-provider');
    const password = 'TestPassword123!';
    let originalProvider: ProviderProfileState | null = null;

    try {
      const signUpRes = await signUpViaAPI(page, {
        name: 'Reelflow Provider User',
        email,
        password,
      });
      expect(signUpRes.ok(), `Sign-up failed: ${signUpRes.status()}`).toBeTruthy();

      const creditsBeforeResponse = await page.request.get('/api/reelflow/credits');
      expect(creditsBeforeResponse.ok(), `Credits API before disabled provider failed: ${creditsBeforeResponse.status()}`).toBeTruthy();
      const creditsBefore: ReelflowCreditsPayload = await creditsBeforeResponse.json();
      originalProvider = await setProviderEnabled('draft:capcut-mate', false);

      const jobsBeforeResponse = await page.request.get('/api/reelflow/jobs');
      expect(jobsBeforeResponse.ok(), `Jobs API before disabled provider failed: ${jobsBeforeResponse.status()}`).toBeTruthy();
      const jobsBefore: ReelflowJobsPayload = await jobsBeforeResponse.json();

      await page.goto(PAGES.reelflow, { timeout: TIMEOUTS.navigation });
      await expect(page.getByTestId('reelflow-generate-page')).toBeVisible();
      await page.getByTestId('reelflow-template-psychology_stickman_001').click();
      await page.locator('#reelflow-topic').fill('a simple productivity story');

      const [createJobResponse] = await Promise.all([
        page.waitForResponse((response) =>
          response.url().includes('/api/reelflow/jobs') &&
          response.request().method() === 'POST',
        ),
        page.getByTestId('reelflow-submit-job').click(),
      ]);

      expect(createJobResponse.status()).toBe(409);
      const rejectedPayload: ReelflowPreflightRejectedPayload = await createJobResponse.json();
      expect(rejectedPayload.preflight.ok).toBe(false);
      expect(rejectedPayload.preflight.errors.some((item) => item.code === 'provider_disabled')).toBeTruthy();
      await expect(page.getByTestId('reelflow-preflight-alert')).toBeVisible();

      const creditsAfterResponse = await page.request.get('/api/reelflow/credits');
      expect(creditsAfterResponse.ok(), `Credits API after disabled provider failed: ${creditsAfterResponse.status()}`).toBeTruthy();
      const creditsAfter: ReelflowCreditsPayload = await creditsAfterResponse.json();
      expect(creditsAfter.account.balance).toBe(creditsBefore.account.balance);
      expect(creditsAfter.account.frozenBalance).toBe(creditsBefore.account.frozenBalance);
      expect(countLedgerType(creditsAfter, 'freeze')).toBe(countLedgerType(creditsBefore, 'freeze'));

      const jobsAfterResponse = await page.request.get('/api/reelflow/jobs');
      expect(jobsAfterResponse.ok(), `Jobs API after disabled provider failed: ${jobsAfterResponse.status()}`).toBeTruthy();
      const jobsAfter: ReelflowJobsPayload = await jobsAfterResponse.json();
      expect(jobsAfter.total).toBe(jobsBefore.total);
    } finally {
      if (originalProvider) {
        await setProviderEnabled(originalProvider.id, originalProvider.enabled);
      }
    }
  });
});

type ReelflowCreditsPayload = {
  workspace: {
    id: string;
  };
  account: {
    balance: number;
    frozenBalance: number;
  };
  ledger: Array<{
    type: string;
  }>;
};

type ReelflowJobsPayload = {
  total: number;
  jobs: Array<{ id: string }>;
};

type ReelflowPreflightRejectedPayload = {
  preflight: {
    ok: boolean;
    errors: Array<{ code: string }>;
  };
};

type SafetyCheckRow = {
  status: string;
  job_id: string | null;
  matched_rules: unknown;
};

type ProviderProfileState = {
  id: string;
  enabled: boolean;
};

async function findLatestSafetyCheck(workspaceId: string) {
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    const result = await client.query<SafetyCheckRow>(
      `
        select status, job_id, matched_rules
        from safety_check
        where workspace_id = $1 and target_type = 'input'
        order by created_at desc
        limit 1
      `,
      [workspaceId],
    );
    return result.rows[0] || null;
  } finally {
    await client.end();
  }
}

async function setWorkspaceQueueLimit(workspaceId: string, queueLimit: number) {
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    await client.query(
      `
        update workspace
        set settings = coalesce(settings, '{}'::jsonb) || jsonb_build_object('queueLimit', $2::int),
            updated_at = now()
        where id = $1
      `,
      [workspaceId, queueLimit],
    );
  } finally {
    await client.end();
  }
}

function countLedgerType(payload: ReelflowCreditsPayload, type: string) {
  return payload.ledger.filter((item) => item.type === type).length;
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
