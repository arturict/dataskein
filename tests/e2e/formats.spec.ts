import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const APACHE_ALLTYPES_DICTIONARY_PARQUET = `
UEFSMRUEFRAVEEwVBBUEAAAAAAAAAQAAABUAFRIVEiwVBBUEFQYVCAAAAgAA
AAQBAQMCJmYcFQIZNQYEABkYAmlkFQAWBBZeFl4mMiYIAAAVABUOFQ4sFQQV
ABUGFQgAAAIAAAAEAQEm0AEcFQAZNQYEABkYCGJvb2xfY29sFQAWBBYwFjAm
oAEAABUEFRAVEEwVBBUEAAAAAAAAAQAAABUAFRIVEiwVBBUEFQYVCAAAAgAA
AAQBAQMCJvQCHBUCGTUGBAAZGAt0aW55aW50X2NvbBUAFgQWXhZeJsACJpYC
AAAVBBUQFRBMFQQVBAAAAAAAAAEAAAAVABUSFRIsFQQVBBUGFQgAAAIAAAAE
AQEDAiakBBwVAhk1BgQAGRgMc21hbGxpbnRfY29sFQAWBBZeFl4m8AMmxgMA
ABUEFRAVEEwVBBUEAAAAAAAAAQAAABUAFRIVEiwVBBUEFQYVCAAAAgAAAAQB
AQMCJtYFHBUCGTUGBAAZGAdpbnRfY29sFQAWBBZeFl4mogUm+AQAABUEFSAV
IEwVBBUEAAAAAAAAAAAAAAoAAAAAAAAAFQAVEhUSLBUEFQQVBhUIAAACAAAA
BAEBAwImjgccFQQZNQYEABkYCmJpZ2ludF9jb2wVABYEFm4WbibaBiagBgAA
FQQVEBUQTBUEFQQAAAAAAADNzIw/FQAVEhUSLBUEFQQVBhUIAAACAAAABAEB
AwImvAgcFQgZNQYEABkYCWZsb2F0X2NvbBUAFgQWXhZeJogIJt4HAAAVBBUg
FSBMFQQVBAAAAAAAAAAAAAAzMzMzMzMkQBUAFRIVEiwVBBUEFQYVCAAAAgAA
AAQBAQMCJvgJHBUKGTUGBAAZGApkb3VibGVfY29sFQAWBBZuFm4mxAkmigkA
ABUEFRgVGEwVAhUEAAAIAAAAMDEvMDEvMDkVABUSFRIsFQQVBBUGFQgAAAIA
AAAEAQEEACauCxwVDBk1BgQAGRgPZGF0ZV9zdHJpbmdfY29sFQAWBBZmFmYm
+gomyAoAABUEFRQVFEwVBBUEAAABAAAAMAEAAAAxFQAVEhUSLBUEFQQVBhUI
AAACAAAABAEBAwIm6gwcFQwZNQYEABkYCnN0cmluZ19jb2wVABYEFmIWYia2
DCaIDAAAFQQVMBUwTBUEFQQAAAAAAAAAAAAAMXUlAABYR/gNAAAAMXUlABUA
FRIVEiwVBBUEFQYVCAAAAgAAAAQBAQMCJrgOHBUGGTUGBAAZGA10aW1lc3Rh
bXBfY29sFQAWBBZ+Fn4mhA4mug0AABUCGcxIBnNjaGVtYRUWABUCJQIYAmlk
ABUAJQIYCGJvb2xfY29sABUCJQIYC3RpbnlpbnRfY29sABUCJQIYDHNtYWxs
aW50X2NvbAAVAiUCGAdpbnRfY29sABUEJQIYCmJpZ2ludF9jb2wAFQglAhgJ
ZmxvYXRfY29sABUKJQIYCmRvdWJsZV9jb2wAFQwlAhgPZGF0ZV9zdHJpbmdf
Y29sABUMJQIYCnN0cmluZ19jb2wAFQYlAhgNdGltZXN0YW1wX2NvbAAWBBkc
GbwmZhwVAhk1BgQAGRgCaWQVABYEFl4WXiYyJggAACbQARwVABk1BgQAGRgI
Ym9vbF9jb2wVABYEFjAWMCagAQAAJvQCHBUCGTUGBAAZGAt0aW55aW50X2Nv
bBUAFgQWXhZeJsACJpYCAAAmpAQcFQIZNQYEABkYDHNtYWxsaW50X2NvbBUA
FgQWXhZeJvADJsYDAAAm1gUcFQIZNQYEABkYB2ludF9jb2wVABYEFl4WXiai
BSb4BAAAJo4HHBUEGTUGBAAZGApiaWdpbnRfY29sFQAWBBZuFm4m2gYmoAYA
ACa8CBwVCBk1BgQAGRgJZmxvYXRfY29sFQAWBBZeFl4miAgm3gcAACb4CRwV
Chk1BgQAGRgKZG91YmxlX2NvbBUAFgQWbhZuJsQJJooJAAAmrgscFQwZNQYE
ABkYD2RhdGVfc3RyaW5nX2NvbBUAFgQWZhZmJvoKJsgKAAAm6gwcFQwZNQYE
ABkYCnN0cmluZ19jb2wVABYEFmIWYia2DCaIDAAAJrgOHBUGGTUGBAAZGA10
aW1lc3RhbXBfY29sFQAWBBZ+Fn4mhA4mug0AABaoCBYEAChOaW1wYWxhIHZl
cnNpb24gMS4zLjAtSU5URVJOQUwgKGJ1aWxkIDhhNDhkZGIxZWZmODQ1OTJi
M2ZjMDZiYzZmNTFlYzEyMGUxZmZmYzkpANMCAABQQVIx
`.replace(/\s/g, '');

const DUCKDB_CATALOG_FIXTURE = path.join(process.cwd(), 'tests', 'fixtures', 'catalog.duckdb');

test('lists a DuckDB catalog read-only and inspects a base table with bounded startup work', async ({
  page,
}) => {
  test.setTimeout(120_000);
  const externalRequests: string[] = [];
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (url.origin !== 'http://127.0.0.1:4184') {
      externalRequests.push(request.url());
    }
  });

  await page.goto('/app');
  await page.locator('input[type=file]').setInputFiles(DUCKDB_CATALOG_FIXTURE);

  await expect(page.getByRole('heading', { name: 'catalog.duckdb' })).toBeVisible({
    timeout: 45_000,
  });
  await expect(page.getByText('Attached read-only')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'orders', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'targets', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'order_summary', exact: true })).toBeVisible();
  const listedView = page.locator('.relation-card').filter({ hasText: 'order_summary' });
  await expect(listedView.getByRole('button', { name: 'View listed only' })).toBeDisabled();

  const orders = page.locator('.relation-card').filter({ hasText: 'orders' });
  await expect(orders).toContainText('4 columns');
  await orders.getByRole('button', { name: 'Inspect table' }).click();

  await expect(page.getByRole('heading', { name: 'catalog.duckdb · main.orders' })).toBeVisible({
    timeout: 45_000,
  });
  await expect(page.getByRole('status')).toContainText('Previewing the first 250 rows');
  await expect(page.getByText(/row count not scanned/)).toBeVisible();
  await expect(page.getByRole('columnheader', { name: 'order_id' })).toBeVisible();
  await expect(page.getByRole('columnheader', { name: 'ordered_at' })).toBeVisible();
  await expect(page.getByRole('cell', { name: '1.25', exact: true })).toBeVisible();
  await expect(page.getByText('not profiled', { exact: true })).toHaveCount(8);
  await expect(page.getByRole('table')).not.toHaveAttribute('aria-rowcount');
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export SQL' }).click();
  const download = await downloadPromise;
  const downloadPath = await download.path();
  if (!downloadPath) {
    throw new Error('The browser did not provide a path for the DuckDB recipe download.');
  }
  const exportedSql = await readFile(downloadPath, 'utf8');
  expect(exportedSql).toContain("ATTACH 'catalog.duckdb' AS \"database_");
  expect(exportedSql).toContain('(TYPE DUCKDB, READ_ONLY);');
  expect(exportedSql).toContain('."main"."orders"');
  expect(externalRequests).toEqual([]);
});

test('rejects a spoofed DuckDB file before opening the catalog', async ({ page }) => {
  await page.goto('/app');
  await page.locator('input[type=file]').setInputFiles({
    name: 'attack.duckdb',
    mimeType: 'application/octet-stream',
    buffer: Buffer.from('not a DuckDB database'),
  });

  await expect(page.getByRole('alert')).toContainText('valid DuckDB signature');
  await expect(page.getByRole('heading', { name: 'Open a file. See its shape.' })).toBeVisible();
});

test('DuckDB catalog stays usable at a compact mobile viewport without console errors', async ({
  page,
}) => {
  const consoleErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') {
      consoleErrors.push(message.text());
    }
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/app');
  await page.locator('input[type=file]').setInputFiles(DUCKDB_CATALOG_FIXTURE);
  await expect(page.getByText('Attached read-only')).toBeVisible({ timeout: 45_000 });
  await expect(page.getByRole('button', { name: 'Inspect table' }).first()).toBeVisible();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
  expect(consoleErrors).toEqual([]);
});

test('opens JSON, JSONL, and an Apache Parquet interoperability fixture', async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto('/app');
  await page.locator('input[type=file]').setInputFiles([
    {
      name: 'records.json',
      mimeType: 'application/json',
      buffer: Buffer.from('[{"id":1,"team":"green"},{"id":2,"team":"orange"}]'),
    },
    {
      name: 'events.jsonl',
      mimeType: 'application/x-ndjson',
      buffer: Buffer.from('{"event":"open","value":3}\n{"event":"close","value":4}\n'),
    },
    {
      name: 'alltypes_dictionary.parquet',
      mimeType: 'application/vnd.apache.parquet',
      buffer: Buffer.from(APACHE_ALLTYPES_DICTIONARY_PARQUET, 'base64'),
    },
  ]);

  await expect(page.getByRole('button', { name: /records\.json 2 rows/ })).toBeVisible({
    timeout: 45_000,
  });
  await expect(page.getByRole('button', { name: /events\.jsonl 2 rows/ })).toBeVisible();
  await expect(
    page.getByRole('button', { name: /alltypes_dictionary\.parquet 2 rows/ }),
  ).toBeVisible();
});

test('reports malformed JSON without leaving the empty workspace', async ({ page }) => {
  await page.goto('/app');
  await page.locator('input[type=file]').setInputFiles({
    name: 'broken.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{"id": 1,\n{"id": 2}'),
  });

  await expect(page.getByRole('alert')).toContainText('broken.json', { timeout: 20_000 });
});

test('shows the detected CSV dialect for semicolon and headerless files', async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto('/app');
  const fileInput = page.locator('input[type=file]');
  await fileInput.setInputFiles({
    name: 'semicolon.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from('name;amount\nAlpha;12\nBeta;14\n'),
  });

  await expect(page.getByRole('heading', { name: 'semicolon.csv' })).toBeVisible({
    timeout: 45_000,
  });
  const importDetails = page.locator('details.import-xray');
  await importDetails.getByText('CSV import details').click();
  await expect(importDetails.getByText(';', { exact: true })).toBeVisible();
  await expect(importDetails.getByText('First row', { exact: true })).toBeVisible();
  await expect(importDetails.getByText('Detected', { exact: true })).toBeVisible();

  await fileInput.setInputFiles({
    name: 'headerless.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from('1;North;101\n2;South;102\n3;East;103\n'),
  });
  await expect(page.getByRole('button', { name: /headerless\.csv 3 rows/ })).toBeVisible({
    timeout: 45_000,
  });
  await page.getByRole('button', { name: /headerless\.csv 3 rows/ }).click();
  const headerlessDetails = page.locator('details.import-xray');
  if ((await headerlessDetails.getAttribute('open')) == null) {
    await headerlessDetails.getByText('CSV import details').click();
  }
  await expect(headerlessDetails.getByText('No header', { exact: true })).toBeVisible();
  await expect(page.getByRole('columnheader', { name: 'column0' })).toBeVisible();
});

test('recovers a Latin-1 CSV explicitly without silently skipping rows', async ({ page }) => {
  await page.goto('/app');
  await page.locator('input[type=file]').setInputFiles({
    name: 'latin-one.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from([
      0x6e, 0x61, 0x6d, 0x65, 0x2c, 0x76, 0x61, 0x6c, 0x75, 0x65, 0x0a, 0x63, 0x61, 0x66, 0xe9,
      0x2c, 0x31, 0x0a, 0x74, 0x68, 0xe9, 0x2c, 0x32, 0x0a,
    ]),
  });

  const alert = page.getByRole('alert');
  await expect(alert).toContainText('latin-one.csv', { timeout: 30_000 });
  await expect(alert.getByText('Retry with explicit CSV settings')).toBeVisible();
  await expect(alert.getByLabel('Delimiter')).toBeVisible();
  await expect(alert.getByLabel('Header row')).toBeVisible();
  await alert.getByLabel('Encoding').selectOption('latin-1');
  await expect(alert.getByLabel('Keep every column as text')).toBeVisible();
  await alert.getByRole('button', { name: 'Retry locally' }).click();
  await expect(page.getByRole('heading', { name: 'latin-one.csv' })).toBeVisible({
    timeout: 45_000,
  });
  await expect(page.getByRole('status')).toContainText('Previewing 2 of 2 rows');
  const importDetails = page.locator('details.import-xray');
  await importDetails.getByText('CSV import details').click();
  await expect(importDetails.getByText('LATIN-1', { exact: true })).toBeVisible();
});

test('profiles a 64 MiB CSV while keeping the rendered preview capped', async ({ page }) => {
  test.setTimeout(180_000);
  await page.goto('/app');
  await page.locator('input[type=file]').evaluate((input: HTMLInputElement) => {
    const row = '1000001,North,1499.50,won\n';
    const bytesPerRow = new TextEncoder().encode(row).byteLength;
    const targetBytes = 64 * 1024 * 1024;
    const rowsPerChunk = 20_000;
    const chunk = row.repeat(rowsPerChunk);
    const chunkCount = Math.ceil((targetBytes - 32) / (bytesPerRow * rowsPerChunk));
    const file = new File(
      ['order_id,region,revenue,status\n', ...Array<string>(chunkCount).fill(chunk)],
      'large-recurring-export.csv',
      { type: 'text/csv' },
    );
    const transfer = new DataTransfer();
    transfer.items.add(file);
    input.files = transfer.files;
    input.dispatchEvent(new Event('change', { bubbles: true }));
  });

  await expect(page.getByRole('heading', { name: 'large-recurring-export.csv' })).toBeVisible({
    timeout: 120_000,
  });
  await expect(page.getByRole('status')).toContainText('Previewing 250 of', {
    timeout: 120_000,
  });
  const totalRows = Number(await page.getByRole('table').getAttribute('aria-rowcount'));
  expect(totalRows).toBeGreaterThan(250);
  await expect(page.getByText(/64\.\d MB/)).toBeVisible();
});
