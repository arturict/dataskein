import { spawn, spawnSync } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const docsAssets = path.join(root, 'docs', 'assets');
const baseUrl = 'http://127.0.0.1:4183';
const packageManagerScript = process.env.npm_execpath;
if (!packageManagerScript) {
  throw new Error('Run this script through pnpm.');
}

const build = spawnSync(process.execPath, [packageManagerScript, 'build'], {
  cwd: root,
  stdio: 'inherit',
});
if (build.status !== 0) {
  process.exit(build.status ?? 1);
}

await mkdir(docsAssets, { recursive: true });
const server = spawn(
  process.execPath,
  [packageManagerScript, 'preview', '--host', '127.0.0.1', '--port', '4183', '--strictPort'],
  {
    cwd: root,
    stdio: 'ignore',
  },
);

async function waitForServer() {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const response = await fetch(baseUrl);
      if (response.ok) {
        return;
      }
    } catch {
      // The preview server is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error('The preview server did not start.');
}

let browser;
try {
  await waitForServer();
  browser = await chromium.launch();

  const landing = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await landing.goto(baseUrl, { waitUntil: 'networkidle' });
  await landing.screenshot({ path: path.join(docsAssets, 'landing.png'), fullPage: true });

  const workspace = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await workspace.goto(`${baseUrl}/app?sample=1`, { waitUntil: 'networkidle' });
  await workspace
    .getByRole('status')
    .filter({ hasText: 'Previewing 12 of 12 rows' })
    .waitFor({ timeout: 45_000 });
  await workspace.getByRole('tab', { name: /Recipe/ }).click();
  const filter = workspace.locator('details').filter({ hasText: 'Filter rows' });
  await filter.getByLabel('Column').selectOption('status');
  await filter.getByLabel('Value').fill('won');
  await filter.getByRole('button', { name: 'Add filter' }).click();
  await workspace.getByRole('status').filter({ hasText: 'Previewing 9 of 9 rows' }).waitFor();
  const join = workspace.locator('details').filter({ hasText: 'Join another source' });
  await join.locator('summary').click();
  await join.getByLabel('Source').selectOption({ label: 'region-targets.csv' });
  await join.getByLabel('Current key').selectOption('region');
  await join.getByLabel('Other key').selectOption('region');
  await join.getByRole('button', { name: 'Add join' }).click();
  await workspace.getByRole('status').filter({ hasText: 'Previewing 9 of 9 rows' }).waitFor();
  await workspace.screenshot({ path: path.join(docsAssets, 'workspace.png'), fullPage: true });

  const databaseCatalog = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await databaseCatalog.goto(`${baseUrl}/app`, { waitUntil: 'networkidle' });
  await databaseCatalog
    .locator('input[type=file]')
    .setInputFiles(path.join(root, 'tests', 'fixtures', 'catalog.duckdb'));
  await databaseCatalog.getByText('Attached read-only').waitFor({ timeout: 45_000 });
  await databaseCatalog.screenshot({
    path: path.join(docsAssets, 'duckdb-catalog.png'),
    fullPage: true,
  });

  const social = await browser.newPage({ viewport: { width: 1200, height: 630 } });
  await social.goto(baseUrl, { waitUntil: 'networkidle' });
  await social.screenshot({ path: path.join(root, 'public', 'og.png') });
} finally {
  await browser?.close();
  server.kill();
}
