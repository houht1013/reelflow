import { test, expect, type Page } from '@playwright/test';
import { PAGES, TIMEOUTS, uniqueEmail } from '../helpers/constants';
import { signUpViaAPI } from '../helpers/auth';

test.describe('Reelflow notifications', () => {
  test('unauthenticated users are redirected from Reelflow notifications to signin', async ({ page }) => {
    await page.goto(PAGES.reelflowNotifications, { timeout: TIMEOUTS.navigation });
    await expect(page).toHaveURL(/\/signin/);
  });

  test('user can mark all Reelflow notifications as read', async ({ page }) => {
    await createSignedInUser(page);

    const purchaseResponse = await page.request.post('/api/reelflow/credits/dev-complete-purchase', {
      data: { planId: 'credits100' },
    });
    expect(purchaseResponse.status(), `Dev credit purchase failed: ${purchaseResponse.status()} ${await purchaseResponse.text()}`).toBe(201);
    const purchase: { orderId: string } = await purchaseResponse.json();

    await waitForCreditNotification(page, purchase.orderId);

    await page.goto(PAGES.reelflowNotifications, { timeout: TIMEOUTS.navigation });
    await expect(page.getByTestId('reelflow-notifications-page')).toBeVisible();
    await expect(page.getByTestId('reelflow-notification-credits_granted')).toBeVisible();

    const before = await getNotifications(page);
    expect(before.unreadCount).toBeGreaterThan(0);

    const [markReadResponse] = await Promise.all([
      page.waitForResponse((response) =>
        response.url().includes('/api/reelflow/notifications') &&
        response.request().method() === 'POST',
      ),
      page.getByTestId('reelflow-notifications-mark-all-read').click(),
    ]);
    expect(markReadResponse.ok(), `Mark all read failed: ${markReadResponse.status()} ${await markReadResponse.text()}`).toBeTruthy();

    await expect.poll(async () => (await getNotifications(page)).unreadCount, {
      timeout: TIMEOUTS.navigation,
    }).toBe(0);

    await page.getByTestId('reelflow-notifications-filter-unread').click();
    await expect(page.getByTestId('reelflow-notifications-empty')).toBeVisible({ timeout: TIMEOUTS.navigation });
    await expect(page.getByTestId('reelflow-notification-credits_granted')).toHaveCount(0);
  });
});

type NotificationsPayload = {
  unreadCount: number;
  notifications: Array<{
    type: string;
    data: Record<string, unknown> | null;
    deliveries: Array<{ channel: string; status: string }>;
  }>;
};

async function createSignedInUser(page: Page) {
  const response = await signUpViaAPI(page, {
    name: 'Reelflow Notification User',
    email: uniqueEmail('reelflow-notifications'),
    password: 'TestPassword123!',
  });
  expect(response.ok(), `Sign-up failed: ${response.status()} ${await response.text()}`).toBeTruthy();
}

async function getNotifications(page: Page): Promise<NotificationsPayload> {
  const response = await page.request.get('/api/reelflow/notifications');
  expect(response.ok(), `Notifications API failed: ${response.status()} ${await response.text()}`).toBeTruthy();
  return response.json();
}

async function waitForCreditNotification(page: Page, orderId: string) {
  const deadline = Date.now() + 30_000;

  while (Date.now() < deadline) {
    const payload = await getNotifications(page);
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
