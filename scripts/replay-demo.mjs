import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as duckdb from '@duckdb/duckdb-wasm/blocking';

// Replay in a fresh engine, independently of the workspace's tables and worker.
const require = createRequire(import.meta.url);
const demoRoot = fileURLToPath(new URL('../docs/demo/', import.meta.url));
const sqlPath = resolve(process.argv[2] ?? `${demoRoot}/paid-revenue.dataskein.sql`);
const sourceDirectory = resolve(process.argv[3] ?? `${demoRoot}/2026-09`);
const sql = await readFile(sqlPath, 'utf8');
const expected = JSON.parse(await readFile(`${sourceDirectory}/expected.json`, 'utf8'));
const db = await duckdb.createDuckDB(
  { mvp: { mainModule: require.resolve('@duckdb/duckdb-wasm/dist/duckdb-mvp.wasm') } },
  new duckdb.VoidLogger(),
  duckdb.NODE_RUNTIME,
);
await db.instantiate();
db.open({ maximumThreads: 1 });
const connection = db.connect();

try {
  for (const [name, fingerprint] of Object.entries(expected.sources)) {
    const bytes = await readFile(`${sourceDirectory}/${name}`);
    assert.equal(createHash('sha256').update(bytes).digest('hex'), fingerprint, `${name} changed`);
    db.registerFileBuffer(name, bytes);
  }
  const chartMarker = '-- Current chart answer';
  const chartStart = sql.indexOf(chartMarker);
  assert.ok(chartStart >= 0, 'The SQL export must include the current chart answer.');
  const rows = connection.query(sql.slice(0, chartStart)).toArray();
  assert.equal(rows.length, expected.rowCount, 'Shaped row count differs');
  const answer = connection
    .query(sql.slice(chartStart))
    .toArray()
    .map((row) => row.toJSON());
  assert.deepEqual(answer, expected.answer, 'Grouped chart answer differs');
  console.log(JSON.stringify({ rowCount: rows.length, answer }));
} finally {
  connection.close();
  db.reset();
}
