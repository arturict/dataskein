import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import path from 'node:path';

const wcagTags = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

test('landing page has no automatically detectable WCAG A or AA violations', async ({ page }) => {
  await page.goto('/');
  const results = await new AxeBuilder({ page }).withTags(wcagTags).analyze();
  expect(results.violations).toEqual([]);
  expect(results.incomplete.filter(({ id }) => id === 'aria-prohibited-attr')).toEqual([]);
});

test('loaded workspace has no automatically detectable WCAG A or AA violations', async ({
  page,
}) => {
  test.setTimeout(90_000);
  await page.goto('/app?sample=1');
  await expect(page.getByRole('status')).toContainText('Previewing 12 of 12 rows', {
    timeout: 45_000,
  });
  const results = await new AxeBuilder({ page }).withTags(wcagTags).analyze();
  expect(results.violations).toEqual([]);
});

test('DuckDB catalog has no automatically detectable WCAG A or AA violations', async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto('/app');
  await page
    .locator('input[type=file]')
    .setInputFiles(path.join(process.cwd(), 'tests', 'fixtures', 'catalog.duckdb'));
  await expect(page.getByText('Attached read-only')).toBeVisible({ timeout: 45_000 });
  const results = await new AxeBuilder({ page }).withTags(wcagTags).analyze();
  expect(results.violations).toEqual([]);
});
