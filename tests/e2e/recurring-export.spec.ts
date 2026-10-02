import { execFile } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { promisify } from 'node:util';
import { expect, test } from '@playwright/test';
import september from '../../docs/demo/2026-09/expected.json' with { type: 'json' };
import october from '../../docs/demo/2026-10/expected.json' with { type: 'json' };

const run = promisify(execFile);

for (const [period, expected] of [
  ['2026-09', september],
  ['2026-10', october],
] as const) {
  test(`${period} CSV walkthrough exports an answer that replays in a fresh engine`, async ({
    page,
  }) => {
    test.setTimeout(120_000);
    const sourceDirectory = resolve('docs/demo', period);
    await page.goto('/app');
    await page
      .locator('input[type=file]')
      .setInputFiles([
        `${sourceDirectory}/monthly-orders.csv`,
        `${sourceDirectory}/region-teams.csv`,
      ]);
    await expect(page.getByRole('heading', { name: 'monthly-orders.csv' })).toBeVisible({
      timeout: 45_000,
    });
    await expect(page.getByRole('status')).toContainText('Previewing', { timeout: 45_000 });

    await page.getByRole('tab', { name: 'Recipe' }).click();
    const filter = page.locator('details').filter({ hasText: 'Filter rows' });
    await filter.getByLabel('Column').selectOption('status');
    await filter.getByLabel('Value').fill('paid');
    await filter.getByRole('button', { name: 'Add filter' }).click();
    await expect(page.getByRole('status')).toContainText(
      `Previewing ${expected.rowCount} of ${expected.rowCount} rows`,
      { timeout: 30_000 },
    );
    const join = page.locator('details').filter({ hasText: 'Join another source' });
    await join.locator('summary').click();
    await join.getByLabel('Source').selectOption({ label: 'region-teams.csv' });
    await join.getByLabel('Current key').selectOption('region');
    await join.getByLabel('Other key').selectOption('region');
    await join.getByRole('button', { name: 'Add join' }).click();
    await expect(page.getByRole('status')).toContainText(
      `Previewing ${expected.rowCount} of ${expected.rowCount} rows`,
      { timeout: 30_000 },
    );

    await page.getByRole('tab', { name: 'Chart' }).click();
    await page.getByLabel('Title').fill('Paid revenue by region');
    await page.getByLabel('Group by').selectOption('region');
    await page.getByLabel('Calculation').selectOption('sum');
    await page.getByLabel('Measure').selectOption('net_revenue');
    const chartRows = page.locator('.chart-figure tbody tr');
    await expect(chartRows).toHaveCount(expected.answer.length, { timeout: 20_000 });
    for (const [index, datum] of expected.answer.entries()) {
      await expect(chartRows.nth(index).locator('td')).toHaveText([
        datum.label,
        String(datum.value),
      ]);
    }

    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Export SQL' }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe('monthly-orders.dataskein.sql');
    const sqlPath = await download.path();
    if (!sqlPath) throw new Error('No path for the SQL download.');
    const exported = await readFile(sqlPath, 'utf8');
    for (const fingerprint of Object.values(expected.sources)) {
      expect(exported).toContain(`sha256 ${fingerprint}`);
    }
    const replay = await run(process.execPath, [
      'scripts/replay-demo.mjs',
      sqlPath,
      sourceDirectory,
    ]);
    expect(JSON.parse(replay.stdout)).toEqual({
      rowCount: expected.rowCount,
      answer: expected.answer,
    });
  });
}
