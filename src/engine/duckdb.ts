import * as duckdb from '@duckdb/duckdb-wasm';
import type { AsyncDuckDBConnection } from '@duckdb/duckdb-wasm';
import type {
  ColumnInfo,
  CsvImportDetails,
  CsvImportOptions,
  DatabaseRelation,
  DatabaseSource,
  Dataset,
  FileKind,
  QueryRow,
} from '../types';
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

const ARROW_BIG_NUMBER = Symbol.for('isArrowBigNum');

function scaledDecimal(rawValue: string, scale: number): string {
  if (scale <= 0) {
    return rawValue;
  }
  const negative = rawValue.startsWith('-');
  const digits = (negative ? rawValue.slice(1) : rawValue).padStart(scale + 1, '0');
  const whole = digits.slice(0, -scale);
  const fraction = digits.slice(-scale);
  return `${negative ? '-' : ''}${whole}.${fraction}`;
}

function normalizeValue(value: unknown, decimalScale?: number): unknown {
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
  if (
    value &&
    typeof value === 'object' &&
    Boolean((value as Record<PropertyKey, unknown>)[ARROW_BIG_NUMBER])
  ) {
    const rawValue = (value as { [Symbol.toPrimitive](hint: 'string'): string })[
      Symbol.toPrimitive
    ]('string');
    return decimalScale == null ? rawValue : scaledDecimal(rawValue, decimalScale);
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
  const decimalScales = new Map(
    table.schema.fields.flatMap((field) => {
      const type = field.type as { scale?: unknown; toString(): string };
      return typeof type.scale === 'number' && type.toString().startsWith('Decimal')
        ? ([[field.name, type.scale]] as const)
        : [];
    }),
  );
  return table.toArray().map((row) => {
    const candidate: unknown = row;
    const jsonCandidate = candidate as { toJSON?: () => unknown };
    const plain = typeof jsonCandidate.toJSON === 'function' ? jsonCandidate.toJSON() : candidate;
    if (!plain || typeof plain !== 'object' || Array.isArray(plain)) {
      return normalizeValue(plain) as QueryRow;
    }
    return Object.fromEntries(
      Object.entries(plain as Record<string, unknown>).map(([key, value]) => [
        key,
        normalizeValue(value, decimalScales.get(key)),
      ]),
    );
  });
}

const CSV_SAMPLE_SIZE = 20_480;

function csvArguments(options: CsvImportOptions): string[] {
  const argumentsList = [`sample_size = ${CSV_SAMPLE_SIZE}`];
  if (options.delimiter) {
    argumentsList.push(`delim = ${quoteLiteral(options.delimiter)}`);
  }
  if (options.header != null) {
    argumentsList.push(`header = ${options.header ? 'true' : 'false'}`);
  }
  if (options.allVarchar) {
    argumentsList.push('all_varchar = true');
  }
  if (options.encoding) {
    argumentsList.push(`encoding = ${quoteLiteral(options.encoding)}`);
  }
  return argumentsList;
}

function readerFor(
  kind: FileKind,
  registeredName: string,
  csvOptions: CsvImportOptions = {},
): string {
  const path = quoteLiteral(registeredName);
  if (kind === 'csv') {
    return `read_csv_auto(${path}, ${csvArguments(csvOptions).join(', ')})`;
  }
  if (kind === 'json') {
    return `read_json_auto(${path}, maximum_object_size = 67108864)`;
  }
  if (kind === 'parquet') {
    return `read_parquet(${path})`;
  }
  throw new Error('DuckDB database files must be opened through the read-only catalog flow.');
}

function asFiniteNumber(value: unknown): number {
  const number = typeof value === 'bigint' ? Number(value) : Number(value);
  return Number.isFinite(number) ? number : 0;
}

function optionalFiniteNumber(value: unknown): number | undefined {
  const number = typeof value === 'bigint' ? Number(value) : Number(value);
  return Number.isFinite(number) ? number : undefined;
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
    csvOptions: CsvImportOptions = {},
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
      let csvImport: CsvImportDetails | undefined;
      if (kind === 'csv') {
        const sniffed = normalizeRows(
          await connection.query(
            `SELECT Delimiter, Quote, Escape, NewLineDelimiter, SkipRows, HasHeader
             FROM sniff_csv(${quoteLiteral(registeredName)}, ${csvArguments(csvOptions).join(', ')})`,
          ),
        )[0];
        if (!sniffed) {
          throw new Error('DuckDB could not detect a readable CSV dialect.');
        }
        csvImport = {
          delimiter: scalarText(sniffed.Delimiter, csvOptions.delimiter ?? ''),
          quote: scalarText(sniffed.Quote, ''),
          escape: scalarText(sniffed.Escape, ''),
          newLine: scalarText(sniffed.NewLineDelimiter, ''),
          hasHeader: csvOptions.header ?? Boolean(sniffed.HasHeader),
          skipRows: asFiniteNumber(sniffed.SkipRows),
          sampleSize: CSV_SAMPLE_SIZE,
          allVarchar: Boolean(csvOptions.allVarchar),
          encoding: csvOptions.encoding ?? 'utf-8',
          overrides: { ...csvOptions },
        };
      }
      await connection.query(
        `CREATE VIEW ${quoteIdentifier(tableName)} AS SELECT * FROM ${readerFor(
          kind,
          registeredName,
          csvOptions,
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
        rowCountExact: true,
        columns,
        csvImport,
      };
    } catch (error) {
      await database.dropFile(registeredName).catch(() => null);
      throw error;
    }
  }

  async loadDatabase(
    file: File,
    reportProgress?: (progress: LoadFileProgress) => void,
  ): Promise<DatabaseSource> {
    const { database, connection } = await this.ready();
    const id = crypto.randomUUID();
    const suffix = id.replaceAll('-', '_');
    const registeredName = `source_${suffix}.duckdb`;
    const catalogName = `database_${suffix}`;
    let attached = false;

    reportProgress?.({ label: 'Register database with the local worker', current: 1, total: 4 });
    await database.registerFileHandle(
      registeredName,
      file,
      duckdb.DuckDBDataProtocol.BROWSER_FILEREADER,
      true,
    );

    try {
      reportProgress?.({ label: 'Attach database in read-only mode', current: 2, total: 4 });
      await connection.query(
        `ATTACH ${quoteLiteral(registeredName)} AS ${quoteIdentifier(catalogName)} (TYPE DUCKDB, READ_ONLY)`,
      );
      attached = true;
      const attachment = normalizeRows(
        await connection.query(
          `SELECT readonly FROM duckdb_databases() WHERE database_name = ${quoteLiteral(catalogName)}`,
        ),
      )[0];
      if (attachment?.readonly !== true) {
        throw new Error('DuckDB did not confirm the database as read-only.');
      }

      reportProgress?.({ label: 'Read schemas, tables, and views', current: 3, total: 4 });
      const relationRows = normalizeRows(
        await connection.query(
          `SELECT t.table_schema, t.table_name, t.table_type, COUNT(c.column_name) AS column_count
           FROM information_schema.tables AS t
           LEFT JOIN information_schema.columns AS c
             ON c.table_catalog = t.table_catalog
            AND c.table_schema = t.table_schema
            AND c.table_name = t.table_name
           WHERE t.table_catalog = ${quoteLiteral(catalogName)}
             AND t.table_type IN ('BASE TABLE', 'VIEW')
           GROUP BY t.table_schema, t.table_name, t.table_type
           ORDER BY t.table_schema, t.table_name`,
        ),
      );
      const estimateRows = normalizeRows(
        await connection.query(
          `SELECT schema_name, table_name, estimated_size
           FROM duckdb_tables()
           WHERE database_name = ${quoteLiteral(catalogName)} AND NOT internal`,
        ),
      );
      const estimates = new Map(
        estimateRows.map((row) => [
          `${scalarText(row.schema_name, '')}\u0000${scalarText(row.table_name, '')}`,
          optionalFiniteNumber(row.estimated_size),
        ]),
      );
      const relations: DatabaseRelation[] = relationRows.map((row) => {
        const schema = scalarText(row.table_schema, 'main');
        const name = scalarText(row.table_name, '');
        const type = scalarText(row.table_type, '') === 'VIEW' ? 'view' : 'table';
        return {
          id: `${id}:${schema}:${name}`,
          schema,
          name,
          type,
          columnCount: asFiniteNumber(row.column_count),
          estimatedRows: type === 'table' ? estimates.get(`${schema}\u0000${name}`) : undefined,
        };
      });

      reportProgress?.({ label: 'Fingerprint source for reproducibility', current: 4, total: 4 });
      const fingerprint = await fingerprintFile(file);

      return {
        id,
        name: file.name,
        registeredName,
        catalogName,
        size: file.size,
        fingerprint,
        relations,
      };
    } catch (error) {
      if (attached) {
        await connection.query(`DETACH ${quoteIdentifier(catalogName)}`).catch(() => null);
      }
      await database.dropFile(registeredName).catch(() => null);
      throw error;
    }
  }

  async inspectDatabaseRelation(
    source: DatabaseSource,
    relation: DatabaseRelation,
    reportProgress?: (progress: LoadFileProgress) => void,
  ): Promise<Dataset> {
    if (relation.type !== 'table') {
      throw new Error(
        'Views are listed for context but are not executed because stored view SQL can reference external sources.',
      );
    }
    const { connection } = await this.ready();
    const id = crypto.randomUUID();
    const tableName = `dataset_${id.replaceAll('-', '_')}`;
    const qualifiedRelation = [source.catalogName, relation.schema, relation.name]
      .map(quoteIdentifier)
      .join('.');

    reportProgress?.({ label: 'Create a local read-only relation view', current: 1, total: 2 });
    await connection.query(
      `CREATE VIEW ${quoteIdentifier(tableName)} AS SELECT * FROM ${qualifiedRelation}`,
    );
    reportProgress?.({ label: 'Read relation columns', current: 2, total: 2 });
    const described = normalizeRows(
      await connection.query(`DESCRIBE SELECT * FROM ${quoteIdentifier(tableName)}`),
    );
    const columns = described.map((row) => ({
      name: scalarText(row.column_name, ''),
      type: scalarText(row.column_type, 'UNKNOWN'),
    }));
    if (columns.length === 0) {
      throw new Error('No columns were detected in this database relation.');
    }

    return {
      id,
      name: `${source.name} · ${relation.schema}.${relation.name}`,
      registeredName: source.registeredName,
      tableName,
      kind: 'duckdb',
      size: source.size,
      fingerprint: source.fingerprint,
      rowCount: relation.estimatedRows ?? null,
      rowCountExact: false,
      columns,
      databaseRelation: {
        databaseId: source.id,
        databaseName: source.name,
        catalogName: source.catalogName,
        schema: relation.schema,
        relation: relation.name,
        relationType: relation.type,
      },
    };
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
