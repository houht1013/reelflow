import { test, expect, type Page } from '@playwright/test';
import pg from 'pg';
import { PAGES, TIMEOUTS, uniqueEmail } from '../helpers/constants';
import { signUpViaAPI } from '../helpers/auth';

test.describe('Reelflow AI tools', () => {
  test('unauthenticated users are redirected from image and voice tools', async ({ page }) => {
    await page.goto(PAGES.reelflowImage, { timeout: TIMEOUTS.navigation });
    await expect(page).toHaveURL(/\/signin/);

    await page.goto(PAGES.reelflowVoice, { timeout: TIMEOUTS.navigation });
    await expect(page).toHaveURL(/\/signin/);
  });

  test('mock image generation consumes credits, stores an asset, and writes usage', async ({ page }) => {
    test.skip(!isMockToolRun(), 'REELFLOW_IMAGE_MOCK=1 and REELFLOW_TTS_MOCK=1 are required for stable AI tool E2E.');

    await createSignedInUser(page, 'reelflow-image-tool');
    const before = await getCredits(page);
    const prompt = `E2E mock image frame ${Date.now()}`;

    await page.goto(PAGES.reelflowImage, { timeout: TIMEOUTS.navigation });
    await expect(page.getByTestId('reelflow-image-tool-page')).toBeVisible();
    await fillAndExpectEnabled(page, 'reelflow-image-prompt', prompt, 'reelflow-image-generate');

    const [generateResponse] = await Promise.all([
      page.waitForResponse((response) =>
        response.url().includes('/api/reelflow/tools/image') &&
        response.request().method() === 'POST',
      ),
      page.getByTestId('reelflow-image-generate').click(),
    ]);
    expect(generateResponse.ok(), `Image tool failed: ${generateResponse.status()} ${await generateResponse.text()}`).toBeTruthy();
    const payload: ImageToolResponse = await generateResponse.json();
    expect(payload.data.asset.id).toBeTruthy();
    expect(payload.data.image.imageUrl).toContain('data:image/png;base64');

    await expect(page.getByTestId('reelflow-image-result')).toBeVisible();

    const after = await getCredits(page);
    expect(after.account.balance).toBe(before.account.balance - payload.data.credits.consumed);
    expect(after.ledger.some((item) =>
      item.type === 'ai_image_generation' &&
      item.amount === -payload.data.credits.consumed,
    )).toBeTruthy();

    const usage = await findUsageRecord(payload.data.asset.id);
    expect(usage?.resource_type).toBe('image');
    expect(Number(usage?.credit_cost || 0)).toBe(payload.data.credits.consumed);

    const assets = await getAssets(page, 'personal');
    expect(assets.assets.some((asset) => asset.id === payload.data.asset.id && asset.sourceType === 'ai_generated')).toBeTruthy();

    await page.getByTestId('reelflow-image-view-assets').click();
    await expect(page).toHaveURL(/\/reelflow\/assets\?source=personal/);
    await expect(page.getByTestId('reelflow-asset-card-image')).toBeVisible({ timeout: TIMEOUTS.navigation });
    await expect(page.getByText(prompt)).toBeVisible();
  });

  test('mock voice generation consumes credits, stores an audio asset, and writes usage', async ({ page }) => {
    test.skip(!isMockToolRun(), 'REELFLOW_IMAGE_MOCK=1 and REELFLOW_TTS_MOCK=1 are required for stable AI tool E2E.');

    await createSignedInUser(page, 'reelflow-voice-tool');
    const before = await getCredits(page);
    const text = `E2E mock voice narration ${Date.now()}`;

    await page.goto(PAGES.reelflowVoice, { timeout: TIMEOUTS.navigation });
    await expect(page.getByTestId('reelflow-voice-tool-page')).toBeVisible();
    await fillAndExpectEnabled(page, 'reelflow-voice-text', text, 'reelflow-voice-generate');

    const generateResponse = await page.request.post('/api/reelflow/tools/voice', {
      data: { text, voice: 'alloy', speed: 1 },
    });
    expect(generateResponse.ok(), `Voice tool failed: ${generateResponse.status()} ${await generateResponse.text()}`).toBeTruthy();
    const payload: VoiceToolResponse = await generateResponse.json();
    expect(payload.data.asset.id).toBeTruthy();
    expect(payload.data.audio.audioUrl).toContain('data:audio/wav;base64');

    const after = await getCredits(page);
    expect(after.account.balance).toBe(before.account.balance - payload.data.credits.consumed);
    expect(after.ledger.some((item) =>
      item.type === 'ai_voice_generation' &&
      item.amount === -payload.data.credits.consumed,
    )).toBeTruthy();

    const usage = await findUsageRecord(payload.data.asset.id);
    expect(usage?.resource_type).toBe('tts');
    expect(Number(usage?.credit_cost || 0)).toBe(payload.data.credits.consumed);

    const assets = await getAssets(page, 'personal');
    expect(assets.assets.some((asset) => asset.id === payload.data.asset.id && asset.assetType === 'audio')).toBeTruthy();

    await page.goto(`${PAGES.reelflowAssets}?source=personal`, { timeout: TIMEOUTS.navigation });
    await expect(page).toHaveURL(/\/reelflow\/assets\?source=personal/);
    await expect(page.getByTestId('reelflow-asset-card-audio')).toBeVisible({ timeout: TIMEOUTS.navigation });
    await expect(page.getByText(text)).toBeVisible();
  });

  test('insufficient workspace credits block image and voice generation', async ({ page }) => {
    test.skip(!isMockToolRun(), 'REELFLOW_IMAGE_MOCK=1 and REELFLOW_TTS_MOCK=1 are required for stable AI tool E2E.');

    await createSignedInUser(page, 'reelflow-ai-insufficient');
    const credits = await getCredits(page);
    await setWorkspaceCreditBalance(credits.workspace.id, 0);

    await page.goto(PAGES.reelflowImage, { timeout: TIMEOUTS.navigation });
    await fillAndExpectEnabled(page, 'reelflow-image-prompt', 'image should not run without credits', 'reelflow-image-generate');
    const [imageResponse] = await Promise.all([
      page.waitForResponse((response) =>
        response.url().includes('/api/reelflow/tools/image') &&
        response.request().method() === 'POST',
      ),
      page.getByTestId('reelflow-image-generate').click(),
    ]);
    expect(imageResponse.status()).toBe(402);

    await page.goto(PAGES.reelflowVoice, { timeout: TIMEOUTS.navigation });
    await fillAndExpectEnabled(page, 'reelflow-voice-text', 'voice should not run without credits', 'reelflow-voice-generate');
    const voiceResponse = await page.request.post('/api/reelflow/tools/voice', {
      data: { text: 'voice should not run without credits', voice: 'alloy', speed: 1 },
    });
    expect(voiceResponse.status()).toBe(402);

    const after = await getCredits(page);
    expect(after.account.balance).toBe(0);
    expect(after.ledger.some((item) => item.type === 'ai_image_generation' || item.type === 'ai_voice_generation')).toBeFalsy();

    const assets = await getAssets(page, 'personal');
    expect(assets.assets).toHaveLength(0);
  });

  test('provider failures refund image and voice tool credits without creating assets', async ({ page }) => {
    test.skip(!isMockToolRun(), 'REELFLOW_IMAGE_MOCK=1 and REELFLOW_TTS_MOCK=1 are required for stable AI tool E2E.');

    await createSignedInUser(page, 'reelflow-ai-refund');
    const before = await getCredits(page);
    const assetsBefore = await getAssets(page, 'personal');

    const imageResponse = await page.request.post('/api/reelflow/tools/image', {
      data: {
        prompt: `__reelflow_mock_fail__ image refund ${Date.now()}`,
        provider: 'qwen',
        size: '1024x1024',
      },
    });
    expect(imageResponse.status()).toBe(500);
    expect((await imageResponse.json()).error).toBe('generation_failed');

    const afterImageFailure = await getCredits(page);
    expect(afterImageFailure.account.balance).toBeCloseTo(before.account.balance, 5);
    expect(afterImageFailure.ledger.some((item) => item.type === 'ai_image_generation' && item.amount < 0)).toBeTruthy();
    expect(afterImageFailure.ledger.some((item) => item.type === 'refund' && item.amount > 0)).toBeTruthy();

    const voiceResponse = await page.request.post('/api/reelflow/tools/voice', {
      data: {
        text: `__reelflow_mock_fail__ voice refund ${Date.now()}`,
        voice: 'alloy',
        speed: 1,
      },
    });
    expect(voiceResponse.status()).toBe(500);
    expect((await voiceResponse.json()).error).toBe('generation_failed');

    const afterVoiceFailure = await getCredits(page);
    expect(afterVoiceFailure.account.balance).toBeCloseTo(before.account.balance, 5);
    expect(afterVoiceFailure.ledger.some((item) => item.type === 'ai_voice_generation' && item.amount < 0)).toBeTruthy();
    expect(afterVoiceFailure.ledger.filter((item) => item.type === 'refund' && item.amount > 0).length).toBeGreaterThanOrEqual(2);

    const assetsAfter = await getAssets(page, 'personal');
    expect(assetsAfter.assets).toHaveLength(assetsBefore.assets.length);
  });
});

type ReelflowCreditsPayload = {
  workspace: {
    id: string;
  };
  account: {
    balance: number;
  };
  ledger: Array<{
    type: string;
    amount: number;
  }>;
};

type ReelflowAssetsPayload = {
  assets: Array<{
    id: string;
    assetType: string;
    sourceType: string;
  }>;
};

type ImageToolResponse = {
  data: {
    asset: { id: string };
    image: { imageUrl: string };
    credits: { consumed: number; balanceAfter: number };
  };
};

type VoiceToolResponse = {
  data: {
    asset: { id: string };
    audio: { audioUrl: string };
    credits: { consumed: number; balanceAfter: number };
  };
};

type UsageRow = {
  resource_type: string;
  credit_cost: string;
};

async function createSignedInUser(page: Page, prefix: string) {
  const response = await signUpViaAPI(page, {
    name: 'Reelflow AI Tool User',
    email: uniqueEmail(prefix),
    password: 'TestPassword123!',
  });
  expect(response.ok(), `Sign-up failed: ${response.status()} ${await response.text()}`).toBeTruthy();
}

async function getCredits(page: Page): Promise<ReelflowCreditsPayload> {
  const response = await page.request.get('/api/reelflow/credits');
  expect(response.ok(), `Credits API failed: ${response.status()} ${await response.text()}`).toBeTruthy();
  return response.json();
}

async function getAssets(page: Page, source: 'all' | 'personal' | 'task'): Promise<ReelflowAssetsPayload> {
  const response = await page.request.get(`/api/reelflow/assets?source=${source}`);
  expect(response.ok(), `Assets API failed: ${response.status()} ${await response.text()}`).toBeTruthy();
  return response.json();
}

async function findUsageRecord(assetId: string): Promise<UsageRow | null> {
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    const result = await client.query<UsageRow>(
      `
        select resource_type, credit_cost
        from usage_record
        where asset_id = $1
        order by created_at desc
        limit 1
      `,
      [assetId],
    );
    return result.rows[0] || null;
  } finally {
    await client.end();
  }
}

async function setWorkspaceCreditBalance(workspaceId: string, balance: number) {
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    await client.query(
      `
        update credit_account
        set balance = $2,
            frozen_balance = 0,
            updated_at = now()
        where workspace_id = $1
      `,
      [workspaceId, balance],
    );
  } finally {
    await client.end();
  }
}

async function fillAndExpectEnabled(page: Page, inputTestId: string, value: string, buttonTestId: string) {
  const input = page.getByTestId(inputTestId);
  const button = page.getByTestId(buttonTestId);

  for (let attempt = 0; attempt < 3; attempt += 1) {
    await input.fill(value);
    try {
      await expect(input).toHaveValue(value, { timeout: 5_000 });
      await expect(button).toBeEnabled({ timeout: 5_000 });
      return;
    } catch (error) {
      if (attempt === 2) throw error;
      await page.waitForTimeout(1_000);
    }
  }
}

function isMockToolRun() {
  return Boolean(process.env.DATABASE_URL) &&
    process.env.REELFLOW_IMAGE_MOCK === '1' &&
    process.env.REELFLOW_TTS_MOCK === '1';
}
