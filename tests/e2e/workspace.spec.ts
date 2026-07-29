import { expect, test } from '@playwright/test';

test('sample journey profiles, filters, joins, charts, and exports a dashboard', async ({
  page,
}) => {
  test.setTimeout(120_000);
  await page.goto('/app?sample=1');
  await expect(page.getByRole('heading', { name: 'quarterly-sales.csv' })).toBeVisible({
    timeout: 45_000,
  });
  await expect(page.getByRole('status')).toContainText('Previewing 12 of 12 rows', {
    timeout: 45_000,
  });
  await expect(page.getByRole('table')).toHaveAttribute('aria-rowcount', '12');
  await expect(page.getByText('1/3 complete')).toBeVisible();

  await page.getByRole('tab', { name: /Recipe/ }).click();
  const filterControl = page.locator('details').filter({ hasText: 'Filter rows' });
  await filterControl.getByLabel('Column').selectOption('status');
  await filterControl.getByLabel('Condition').selectOption('equals');
  await filterControl.getByLabel('Value').fill('won');
  await filterControl.getByRole('button', { name: 'Add filter' }).click();
  await expect(page.getByRole('status')).toContainText('Previewing 9 of 9 rows', {
    timeout: 30_000,
  });
  await expect(page.getByText('2/3 complete')).toBeVisible();

  const joinControl = page.locator('details').filter({ hasText: 'Join another source' });
  await joinControl.locator('summary').click();
  await joinControl.getByLabel('Source').selectOption({ label: 'region-targets.csv' });
  await joinControl.getByLabel('Current key').selectOption('region');
  await joinControl.getByLabel('Other key').selectOption('region');
  await joinControl.getByRole('button', { name: 'Add join' }).click();
  await expect(page.getByRole('status')).toContainText('Previewing 9 of 9 rows', {
    timeout: 30_000,
  });
  await expect(
    page.getByText('region-targets.csv · region = region', { exact: true }),
  ).toBeVisible();

  await page.getByRole('tab', { name: 'Chart' }).click();
  await page.getByLabel('Title').fill('Won revenue by region');
  await page.getByLabel('Group by').selectOption('region');
  await page.getByLabel('Calculation').selectOption('sum');
  await page.getByLabel('Measure').selectOption('revenue');
  await expect(page.getByText('4 groups')).toBeVisible({ timeout: 20_000 });
  await page.getByRole('button', { name: 'Pin to dashboard' }).click();
  await expect(page.getByRole('heading', { name: 'Won revenue by region' })).toBeVisible();
  await expect(page.getByText('3/3 complete')).toBeVisible();

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export standalone HTML' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('dataskein-dashboard.html');
});

test('safe CSV export neutralizes spreadsheet formulas', async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto('/app');
  await page.locator('input[type=file]').setInputFiles({
    name: 'formula.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from('name,amount\n=2+2,1\n@SUM(A1),2\nsafe,3\n'),
  });
  await expect(page.getByRole('status')).toContainText('Previewing 3 of 3 rows', {
    timeout: 45_000,
  });

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export safe CSV' }).click();
  const download = await downloadPromise;
  const path = await download.path();
  if (!path) {
    throw new Error('The browser did not provide a path for the CSV download.');
  }
  const content = await import('node:fs/promises').then((fs) => fs.readFile(path, 'utf8'));
  expect(content).toContain(`"'=2+2"`);
  expect(content).toContain(`"'@SUM(A1)"`);
  expect(content).toContain('"safe"');
});

test('spoofed file type is rejected before DuckDB opens it', async ({ page }) => {
  await page.goto('/app');
  await page.locator('input[type=file]').setInputFiles({
    name: 'not-data.parquet',
    mimeType: 'application/octet-stream',
    buffer: Buffer.from('PAR1<script>alert(1)</script>'),
  });
  await expect(page.getByRole('alert')).toContainText('does not contain a valid Parquet signature');
  await expect(page.getByRole('button', { name: 'Choose another file' })).toBeVisible();
});

test('source-file workflow makes no cross-origin requests', async ({ page }) => {
  test.setTimeout(90_000);
  const externalRequests: string[] = [];
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (url.origin !== 'http://127.0.0.1:4184') {
      externalRequests.push(request.url());
    }
  });
  await page.goto('/app?sample=1');
  await expect(page.getByRole('status')).toContainText('Previewing 12 of 12 rows', {
    timeout: 45_000,
  });
  expect(externalRequests).toEqual([]);
});

test('loaded workspace explains offline state without losing the local result', async ({
  context,
  page,
}) => {
  await page.goto('/app?sample=1');
  await expect(page.getByRole('status')).toContainText('Previewing 12 of 12 rows', {
    timeout: 45_000,
  });
  await context.setOffline(true);
  await expect(page.getByText('You are offline.')).toBeVisible();
  await expect(
    page.getByText('Sources already open in this tab can still be explored locally.'),
  ).toBeVisible();
  await expect(page.getByRole('table')).toHaveAttribute('aria-rowcount', '12');
  await context.setOffline(false);
});

test('compact mobile workspace stays usable without overflow or console errors', async ({
  page,
}) => {
  const consoleErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') {
      consoleErrors.push(message.text());
    }
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/app?sample=1');
  await expect(page.getByRole('status')).toContainText('Previewing 12 of 12 rows', {
    timeout: 45_000,
  });
  await expect(page.getByRole('heading', { name: 'quarterly-sales.csv' })).toBeVisible();
  await page.getByRole('tab', { name: /Recipe/ }).click();
  await expect(page.locator('details').filter({ hasText: 'Filter rows' })).toBeVisible();
  const dimensions = await page.evaluate(() => ({
    body: document.body.scrollWidth,
    document: document.documentElement.scrollWidth,
    viewport: window.innerWidth,
  }));
  expect(dimensions.body).toBeLessThanOrEqual(dimensions.viewport);
  expect(dimensions.document).toBeLessThanOrEqual(dimensions.viewport);
  expect(consoleErrors).toEqual([]);
});
