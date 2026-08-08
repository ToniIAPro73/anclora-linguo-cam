import { expect, test } from '@playwright/test';

const VIEWPORTS = [
  { width: 939, height: 625, label: '939×625 (DevTools responsive)' },
  { width: 1280, height: 900, label: '1280×900 (laptop)' },
  { width: 1920, height: 840, label: '1920×840 (desktop browser chrome)' },
  { width: 1920, height: 1080, label: '1920×1080 (full HD)' },
];

for (const vp of VIEWPORTS) {
  test(`setup screen has no vertical scroll at ${vp.label}`, async ({ page }) => {
    await page.setViewportSize({ width: vp.width, height: vp.height });

    // Mock session validation so the app skips the auth form and shows the IDLE setup screen
    await page.route('**/api/auth/validate', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          valid: true,
          user_id: 'e2e-user',
          display_name: 'E2E Tester',
          role: 'agent',
          expires_at: Date.now() + 3_600_000,
        }),
      }),
    );
    await page.route('**/api/sessions/usage', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          translation_chars_used: 0,
          translation_chars_limit: 20_000,
          tts_chars_used: 0,
          tts_chars_limit: 12_000,
        }),
      }),
    );

    await page.goto('/');

    // Seed auth session so app restores it on load
    await page.evaluate(() => {
      const session = {
        token: 'e2e-test-token',
        userId: 'e2e-user',
        displayName: 'E2E Tester',
        role: 'agent',
        expiresAt: Date.now() + 3_600_000,
      };
      localStorage.setItem('anclora_linguo_session', JSON.stringify(session));
    });

    // Reload — the mocked validate call returns valid:true, so the IDLE screen renders
    await page.goto('/');

    // IDLE screen landmark: the "Iniciar llamada" button
    await expect(
      page.getByRole('button', { name: /iniciar llamada|start translation call/i }).first(),
    ).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole('heading', { name: /anclora linguo cam/i })).toBeInViewport({ ratio: 1 });
    await expect(page.getByTestId('app-logo')).toBeInViewport({ ratio: 1 });
    await expect(page.getByTestId('setup-card')).toBeInViewport({ ratio: 1 });
    await expect(page.getByTestId('qa-telemetry-panel')).toHaveCount(0);

    const cardFooterGap = await page.evaluate(() => {
      const card = document.querySelector('[data-testid="setup-card"]');
      const footer = document.querySelector('[data-testid="legal-footer"]');
      if (!card || !footer) return -1;
      return footer.getBoundingClientRect().top - card.getBoundingClientRect().bottom;
    });

    expect(cardFooterGap, `Card/footer gap is too small at ${vp.width}×${vp.height}`).toBeGreaterThanOrEqual(20);

    // Attempt to scroll the page; if scrollY increases the browser is actually scrollable
    const isActuallyScrollable = await page.evaluate(() => {
      const before = window.scrollY;
      window.scrollBy(0, 200);
      const after = window.scrollY;
      window.scrollBy(0, -200); // restore
      return after > before;
    });

    expect(isActuallyScrollable, `Page is scrollable at ${vp.width}×${vp.height}`).toBe(false);
  });
}
