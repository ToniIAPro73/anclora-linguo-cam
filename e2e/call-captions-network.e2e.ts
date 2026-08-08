import { expect, test, type BrowserContext, type Page } from '@playwright/test';

const COOKIE_STORAGE_KEY = 'anclora-cookie-consent-v2';

const seedCookieConsent = {
  necessary: true,
  session: true,
  preferences: false,
  updatedAt: '2026-06-06T00:00:00.000Z',
  version: 'v2',
};

const clickFirstVisible = async (page: Page, texts: string[]) => {
  for (const text of texts) {
    const locator = page.getByRole('button', { name: text });
    if (await locator.count()) {
      await locator.first().click();
      return;
    }
  }
  throw new Error(`No button found for labels: ${texts.join(', ')}`);
};

const applyConstrainedNetwork = async (context: BrowserContext, page: Page) => {
  const session = await context.newCDPSession(page);
  await session.send('Network.enable');
  await session.send('Network.emulateNetworkConditions', {
    offline: false,
    latency: 90,
    downloadThroughput: 350_000,
    uploadThroughput: 180_000,
    connectionType: 'cellular4g',
  });
};

test('network profile gate: subtitle commit after constrained network', async ({ browser, browserName }) => {
  test.skip(!process.env.E2E_NETWORK_PROFILE, 'Run only when E2E_NETWORK_PROFILE=true');
  test.skip(browserName !== 'chromium', 'Network emulation requires Chromium CDP');

  const contextA = await browser.newContext({ permissions: ['camera', 'microphone'] });
  const contextB = await browser.newContext({ permissions: ['camera', 'microphone'] });

  await Promise.all([
    contextA.addInitScript(
      ({ key, value }) => window.localStorage.setItem(key, JSON.stringify(value)),
      { key: COOKIE_STORAGE_KEY, value: seedCookieConsent },
    ),
    contextB.addInitScript(
      ({ key, value }) => window.localStorage.setItem(key, JSON.stringify(value)),
      { key: COOKIE_STORAGE_KEY, value: seedCookieConsent },
    ),
  ]);

  const pageA = await contextA.newPage();
  const pageB = await contextB.newPage();

  await Promise.all([pageA.goto('/'), pageB.goto('/')]);

  await pageA.locator('input').first().fill('E2E Net Agent');
  await pageB.locator('input').first().fill('E2E Net Investor');
  await clickFirstVisible(pageA, ['Unirse a la reunión', 'Join meeting', 'Entrar al workspace', 'Enter workspace']);
  await clickFirstVisible(pageB, ['Unirse a la reunión', 'Join meeting', 'Entrar al workspace', 'Enter workspace']);

  const roomInputA = pageA.locator('input[type="text"]').first();
  await expect(roomInputA).toHaveValue(/ROOM-/i, { timeout: 15_000 });
  const roomCode = await roomInputA.inputValue();
  await pageB.locator('input[type="text"]').first().fill(roomCode);

  await Promise.all([
    clickFirstVisible(pageA, ['Iniciar llamada con traducción', 'Start translation call']),
    clickFirstVisible(pageB, ['Iniciar llamada con traducción', 'Start translation call']),
  ]);

  await expect(pageA.getByText(/SIGNAL CONNECTED|SIGNAL RECONNECTING/i).first()).toBeVisible({ timeout: 30_000 });
  await expect(pageB.getByText(/SIGNAL CONNECTED|SIGNAL RECONNECTING/i).first()).toBeVisible({ timeout: 30_000 });

  await Promise.all([applyConstrainedNetwork(contextA, pageA), applyConstrainedNetwork(contextB, pageB)]);

  await pageB.evaluate(() => (window as any).__E2E_SEND_SUBTITLE('chunk_e2e_net_profile'));
  await expect(pageA.getByText(/chunk_e2e_net_profile/i).first()).toBeVisible({ timeout: 45_000 });

  await contextA.close();
  await contextB.close();
});
