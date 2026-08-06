import { expect, test } from '@playwright/test';

test('landing page presents the focused product and working navigation', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText(
    'From awkward files to reproducible answers',
  );
  await expect(page.getByRole('listitem').filter({ hasText: 'Zero file uploads' })).toBeVisible();
  await expect(page.getByRole('banner').getByRole('link', { name: 'Open app' })).toHaveAttribute(
    'href',
    '/app',
  );
  await expect(
    page.getByRole('img', {
      name: 'DataSkein workspace showing a visible filter and join recipe for quarterly sales data',
    }),
  ).toBeVisible();
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    'href',
    'https://dataskein.vercel.app/',
  );
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
    'content',
    'https://dataskein.vercel.app/og.png',
  );
  const structuredData = await page
    .locator('script[type="application/ld+json"]')
    .evaluate((element) => element.textContent ?? '');
  expect(structuredData).toContain('SoftwareApplication');
  const llms = await page.request.get('/llms.txt');
  expect(llms.ok()).toBe(true);
  expect(await llms.text()).toContain('local-first data exploration and reproducible analysis');
});

test('landing page remains usable at a narrow mobile viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Explore the sample' }).first()).toBeVisible();
  const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
  expect(bodyWidth).toBeLessThanOrEqual(390);
});
