import { expect, test } from '@playwright/test';

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
