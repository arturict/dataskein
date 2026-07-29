import * as duckdb from '@duckdb/duckdb-wasm';
import type { AsyncDuckDBConnection } from '@duckdb/duckdb-wasm';
import type { ColumnInfo, Dataset, FileKind, QueryRow } from '../types';
import { fingerprintFile } from '../lib/files';
import { quoteIdentifier, quoteLiteral, safeCsvProjection } from '../lib/sql';

const BUNDLES: duckdb.DuckDBBundles = {
  mvp: {
    mainModule: new URL('@duckdb/duckdb-wasm/dist/duckdb-mvp.wasm', import.meta.url).toString(),
    mainWorker: new URL(
      '@duckdb/duckdb-wasm/dist/duckdb-browser-mvp.worker.js',
      import.meta.url,
    ).toString(),
  },
};

export type LoadFileProgress = {
  label: string;
  current: number;
  total: number;
};

function normalizeValue(value: unknown): unknown {
  if (typeof value === 'bigint') {
    const asNumber = Number(value);
    return Number.isSafeInteger(asNumber) ? asNumber : value.toString();
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (value instanceof Uint8Array) {
    return `[${value.byteLength} bytes]`;
  }
  if (Array.isArray(value)) {
    return value.map(normalizeValue);
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, nested]) => [
        key,
        normalizeValue(nested),
      ]),
    );
  }
  return value;
}

function normalizeRows(table: Awaited<ReturnType<AsyncDuckDBConnection['query']>>): QueryRow[] {
  return table.toArray().map((row) => {
    const candidate: unknown = row;
    const jsonCandidate = candidate as { toJSON?: () => unknown };
    const plain = typeof jsonCandidate.toJSON === 'function' ? jsonCandidate.toJSON() : candidate;
    return normalizeValue(plain) as QueryRow;
  });
}

function readerFor(kind: FileKind, registeredName: string): string {
  const path = quoteLiteral(registeredName);
  if (kind === 'csv') {
    return `read_csv_auto(${path}, header = true, sample_size = -1)`;
  }
  if (kind === 'json') {
    return `read_json_auto(${path}, maximum_object_size = 67108864)`;
  }
  return `read_parquet(${path})`;
}

function asFiniteNumber(value: unknown): number {
  const number = typeof value === 'bigint' ? Number(value) : Number(value);
  return Number.isFinite(number) ? number : 0;
}

function scalarText(value: unknown, fallback: string): string {
  if (value == null) {
    return fallback;
  }
  if (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'bigint' ||
    typeof value === 'boolean'
  ) {
    return `${value}`;
  }
  return fallback;
}

export class DataEngine {
  private database: duckdb.AsyncDuckDB | null = null;
  private connection: AsyncDuckDBConnection | null = null;
  private initializing: Promise<void> | null = null;

  async initialize(): Promise<void> {
    if (this.connection) {
      return;
    }
    if (this.initializing) {
      return this.initializing;
    }

    this.initializing = (async () => {
      const bundle = await duckdb.selectBundle(BUNDLES);
      if (!bundle.mainWorker) {
        throw new Error('This browser cannot start the local query worker.');
      }
      const worker = new Worker(bundle.mainWorker);
      const logger = new duckdb.ConsoleLogger(duckdb.LogLevel.WARNING);
      this.database = new duckdb.AsyncDuckDB(logger, worker);
      await this.database.instantiate(bundle.mainModule, bundle.pthreadWorker);
      this.connection = await this.database.connect();
      await this.connection.query("SET memory_limit = '1GB'");
      await this.connection.query('SET threads = 1');
    })();

    try {
      await this.initializing;
    } finally {
      this.initializing = null;
    }
  }

  private async ready(): Promise<{
    database: duckdb.AsyncDuckDB;
    connection: AsyncDuckDBConnection;
  }> {
    await this.initialize();
    if (!this.database || !this.connection) {
      throw new Error('The local query engine did not initialize.');
    }
    return { database: this.database, connection: this.connection };
  }

  async loadFile(
    file: File,
    kind: FileKind,
    reportProgress?: (progress: LoadFileProgress) => void,
  ): Promise<Dataset> {
    const { database, connection } = await this.ready();
    const id = crypto.randomUUID();
    const registeredName = `source_${id.replaceAll('-', '_')}.${kind}`;
    const tableName = `dataset_${id.replaceAll('-', '_')}`;

    reportProgress?.({ label: 'Register file with the local worker', current: 1, total: 4 });
    await database.registerFileHandle(
      registeredName,
      file,
      duckdb.DuckDBDataProtocol.BROWSER_FILEREADER,
      true,
    );

    try {
      reportProgress?.({ label: 'Read rows and validate structure', current: 2, total: 4 });
      await connection.query(
        `CREATE VIEW ${quoteIdentifier(tableName)} AS SELECT * FROM ${readerFor(
          kind,
          registeredName,
        )}`,
      );
      const countRows = normalizeRows(
        await connection.query(`SELECT COUNT(*) AS row_count FROM ${quoteIdentifier(tableName)}`),
      );
      reportProgress?.({ label: 'Detect schema and column types', current: 3, total: 4 });
      const described = normalizeRows(
        await connection.query(`DESCRIBE SELECT * FROM ${quoteIdentifier(tableName)}`),
      );
      reportProgress?.({ label: 'Fingerprint source for reproducibility', current: 4, total: 4 });
      const fingerprint = await fingerprintFile(file);

      const columns = described.map((row) => ({
        name: scalarText(row.column_name, ''),
        type: scalarText(row.column_type, 'UNKNOWN'),
      }));

      if (columns.length === 0) {
        throw new Error('No columns were detected.');
      }

      return {
        id,
        name: file.name,
        registeredName,
        tableName,
        kind,
        size: file.size,
        fingerprint,
        rowCount: asFiniteNumber(countRows[0]?.row_count),
        columns,
      };
    } catch (error) {
      await database.dropFile(registeredName).catch(() => null);
      throw error;
    }
  }

  async query(sql: string, limit?: number): Promise<QueryRow[]> {
    const { connection } = await this.ready();
    const wrapped = limit ? `SELECT * FROM (${sql}) AS limited_result LIMIT ${limit}` : sql;
    return normalizeRows(await connection.query(wrapped));
  }

  async describe(sql: string): Promise<ColumnInfo[]> {
    const { connection } = await this.ready();
    const rows = normalizeRows(await connection.query(`DESCRIBE SELECT * FROM (${sql}) AS result`));
    return rows.map((row) => ({
      name: scalarText(row.column_name, ''),
      type: scalarText(row.column_type, 'UNKNOWN'),
    }));
  }

  async profile(sql: string, columns: ColumnInfo[]): Promise<ColumnInfo[]> {
    const { connection } = await this.ready();
    const profiledColumns = columns.slice(0, 80);
    const expressions = profiledColumns.flatMap((column, index) => {
      const identifier = quoteIdentifier(column.name);
      const comparable = !/BLOB|STRUCT|LIST|MAP|UNION/i.test(column.type);
      return [
        `COUNT(*) FILTER (WHERE ${identifier} IS NULL) AS ${quoteIdentifier(`null_${index}`)}`,
        `APPROX_COUNT_DISTINCT(${identifier}) AS ${quoteIdentifier(`distinct_${index}`)}`,
        comparable
          ? `CAST(MIN(${identifier}) AS VARCHAR) AS ${quoteIdentifier(`min_${index}`)}`
          : `NULL AS ${quoteIdentifier(`min_${index}`)}`,
        comparable
          ? `CAST(MAX(${identifier}) AS VARCHAR) AS ${quoteIdentifier(`max_${index}`)}`
          : `NULL AS ${quoteIdentifier(`max_${index}`)}`,
      ];
    });

    const result = normalizeRows(
      await connection.query(`SELECT ${expressions.join(', ')} FROM (${sql}) AS profile_source`),
    )[0];

    return columns.map((column, index) => {
      if (index >= profiledColumns.length || !result) {
        return column;
      }
      return {
        ...column,
        nullCount: asFiniteNumber(result[`null_${index}`]),
        distinctCount: asFiniteNumber(result[`distinct_${index}`]),
        minimum: result[`min_${index}`] == null ? undefined : String(result[`min_${index}`]),
        maximum: result[`max_${index}`] == null ? undefined : String(result[`max_${index}`]),
      };
    });
  }

  async exportCsv(sql: string, columns: ColumnInfo[]): Promise<Uint8Array> {
    const { database, connection } = await this.ready();
    const filename = `dataskein_export_${crypto.randomUUID().replaceAll('-', '_')}.csv`;
    const projection = safeCsvProjection(columns);
    await connection.query(
      `COPY (SELECT ${projection} FROM (${sql}) AS export_source) TO ${quoteLiteral(
        filename,
      )} (FORMAT CSV, HEADER TRUE, FORCE_QUOTE *)`,
    );
    try {
      return await database.copyFileToBuffer(filename);
    } finally {
      await database.dropFile(filename).catch(() => null);
    }
  }

  async dispose(): Promise<void> {
    await this.connection?.close();
    await this.database?.terminate();
    this.connection = null;
    this.database = null;
  }
}

export const dataEngine = new DataEngine();
