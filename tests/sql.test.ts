import { describe, expect, it } from 'vitest';
import {
  buildRecipeExport,
  compileChartQuery,
  compileRecipe,
  quoteIdentifier,
  quoteLiteral,
  safeCsvProjection,
} from '../src/lib/sql';
import type { ChartSpec, Dataset, TransformStep } from '../src/types';

const sales: Dataset = {
  id: 'sales',
  name: "sales'2026.csv",
  registeredName: 'source_sales.csv',
  tableName: 'dataset_sales',
  kind: 'csv',
  size: 120,
  fingerprint: 'a'.repeat(64),
  rowCount: 3,
  rowCountExact: true,
  columns: [
    { name: 'region', type: 'VARCHAR' },
    { name: 'revenue', type: 'DOUBLE' },
  ],
  csvImport: {
    delimiter: ';',
    quote: '"',
    escape: '"',
    newLine: '\n',
    hasHeader: false,
    skipRows: 0,
    sampleSize: 20480,
    allVarchar: true,
    encoding: 'latin-1',
    overrides: { delimiter: ';', header: false, allVarchar: true, encoding: 'latin-1' },
  },
};

const targets: Dataset = {
  id: 'targets',
  name: 'targets.csv',
  registeredName: 'source_targets.csv',
  tableName: 'dataset_targets',
  kind: 'csv',
  size: 80,
  fingerprint: 'b'.repeat(64),
  rowCount: 2,
  rowCountExact: true,
  columns: [
    { name: 'region', type: 'VARCHAR' },
    { name: 'target', type: 'DOUBLE' },
  ],
};

describe('SQL compiler', () => {
  it('quotes identifiers and literals without creating executable fragments', () => {
    expect(quoteIdentifier('a"b')).toBe('"a""b"');
    expect(quoteLiteral("x'; DROP TABLE users; --")).toBe("'x''; DROP TABLE users; --'");
  });

  it('compiles ordered filters, joins, and sorts into named CTEs', () => {
    const steps: TransformStep[] = [
      {
        id: '1',
        type: 'filter',
        column: 'region',
        operator: 'equals',
        value: "North' OR 1=1 --",
      },
      {
        id: '2',
        type: 'join',
        rightDatasetId: 'targets',
        leftColumn: 'region',
        rightColumn: 'region',
        mode: 'left',
      },
      { id: '3', type: 'sort', column: 'revenue', direction: 'desc' },
    ];

    const sql = compileRecipe(sales, [sales, targets], steps);
    expect(sql).toContain("WHERE \"region\" = 'North'' OR 1=1 --'");
    expect(sql).toContain('LEFT JOIN "dataset_targets"');
    expect(sql).toContain('"targets · target"');
    expect(sql).toContain('ORDER BY "revenue" DESC');
  });

  it('supports empty, contains, numeric comparison, and column-selection steps', () => {
    const operators: TransformStep[] = [
      { id: '1', type: 'filter', column: 'region', operator: 'is_empty', value: '' },
      { id: '2', type: 'filter', column: 'region', operator: 'is_not_empty', value: '' },
      { id: '3', type: 'filter', column: 'region', operator: 'contains', value: 'ort' },
      { id: '4', type: 'filter', column: 'revenue', operator: 'greater_than', value: '10' },
      { id: '5', type: 'filter', column: 'revenue', operator: 'less_than', value: '20' },
      { id: '6', type: 'select', columns: ['region', 'revenue'] },
    ];
    const sql = compileRecipe(sales, [sales], operators);
    expect(sql).toContain('IS NULL');
    expect(sql).toContain('IS NOT NULL');
    expect(sql).toContain("ILIKE '%ort%'");
    expect(sql).toContain("TRY_CAST('10' AS DOUBLE)");
    expect(sql).toContain("TRY_CAST('20' AS DOUBLE)");
    expect(sql).toContain('SELECT "region", "revenue"');
  });

  it('fails clearly if a joined source is no longer available', () => {
    expect(() =>
      compileRecipe(
        sales,
        [sales],
        [
          {
            id: 'join',
            type: 'join',
            rightDatasetId: 'missing',
            leftColumn: 'region',
            rightColumn: 'region',
            mode: 'inner',
          },
        ],
      ),
    ).toThrow('no longer loaded');
  });

  it('creates a bounded aggregate query for charts', () => {
    const spec: ChartSpec = {
      id: 'chart',
      title: 'Revenue',
      type: 'bar',
      dimension: 'region',
      measure: 'revenue',
      aggregation: 'sum',
    };
    const query = compileChartQuery('SELECT * FROM "dataset_sales"', spec);
    expect(query).toContain('SUM(TRY_CAST("revenue" AS DOUBLE))');
    expect(query).toContain('GROUP BY "region"');
    expect(query).toContain('ORDER BY value DESC NULLS LAST');
    expect(query).toContain('LIMIT 100');
  });

  it('creates count and average chart calculations', () => {
    const base: ChartSpec = {
      id: 'chart',
      title: 'Rows',
      type: 'line',
      dimension: 'region',
      measure: '',
      aggregation: 'count',
    };
    expect(compileChartQuery('SELECT 1', base)).toContain('COUNT(*)');
    expect(compileChartQuery('SELECT 1', base)).toContain('ORDER BY label ASC');
    expect(
      compileChartQuery('SELECT 1', {
        ...base,
        aggregation: 'average',
        measure: 'revenue',
      }),
    ).toContain('AVG(TRY_CAST("revenue" AS DOUBLE))');
    expect(
      compileChartQuery('SELECT 1', {
        ...base,
        aggregation: 'minimum',
        measure: 'revenue',
      }),
    ).toContain('MIN(TRY_CAST("revenue" AS DOUBLE))');
    expect(
      compileChartQuery('SELECT 1', {
        ...base,
        aggregation: 'maximum',
        measure: 'revenue',
      }),
    ).toContain('MAX(TRY_CAST("revenue" AS DOUBLE))');
  });

  it('neutralizes spreadsheet formula prefixes only on text-like columns', () => {
    const projection = safeCsvProjection([
      { name: 'comment', type: 'VARCHAR' },
      { name: 'amount', type: 'DOUBLE' },
    ]);
    expect(projection).toContain('regexp_matches(COALESCE(CAST("comment" AS VARCHAR), \'\')');
    expect(projection).toContain("THEN '''' || CAST(\"comment\" AS VARCHAR)");
    expect(projection).toMatch(/,\s*"amount"$/);
  });

  it('exports source fingerprints and executable views without hiding the recipe', () => {
    const exported = buildRecipeExport(sales, [sales], []);
    expect(exported).toContain(`sha256 ${'a'.repeat(64)}`);
    expect(exported).toContain("read_csv_auto('sales''2026.csv'");
    expect(exported).toContain("delim = ';'");
    expect(exported).toContain('header = false');
    expect(exported).toContain('all_varchar = true');
    expect(exported).toContain("encoding = 'latin-1'");
    expect(exported).toContain('CREATE OR REPLACE VIEW "dataset_sales"');
  });

  it('uses the matching DuckDB reader for JSON and Parquet exports', () => {
    const json = { ...sales, id: 'json', name: 'rows.json', kind: 'json' as const };
    const parquet = {
      ...sales,
      id: 'parquet',
      name: 'rows.parquet',
      kind: 'parquet' as const,
    };
    const exported = buildRecipeExport(json, [json, parquet], []);
    expect(exported).toContain("read_json_auto('rows.json')");
    expect(exported).toContain("read_parquet('rows.parquet')");
  });

  it('exports one read-only attachment for multiple qualified DuckDB tables', () => {
    const databaseRelation = {
      databaseId: 'db-source',
      databaseName: "local'source.duckdb",
      catalogName: 'catalog"name',
      schema: 'odd"schema',
      relation: 'orders',
      relationType: 'table' as const,
    };
    const orders: Dataset = {
      ...sales,
      id: 'orders',
      name: 'local source · odd schema.orders',
      tableName: 'dataset_orders',
      kind: 'duckdb',
      rowCount: 100_000,
      rowCountExact: false,
      csvImport: undefined,
      databaseRelation,
    };
    const targetsFromDatabase: Dataset = {
      ...orders,
      id: 'database-targets',
      tableName: 'dataset_database_targets',
      databaseRelation: { ...databaseRelation, relation: 'targets' },
    };

    const exported = buildRecipeExport(orders, [orders, targetsFromDatabase], []);
    expect(exported.match(/ATTACH /g)).toHaveLength(1);
    expect(exported).toContain(
      'ATTACH \'local\'\'source.duckdb\' AS "catalog""name" (TYPE DUCKDB, READ_ONLY);',
    );
    expect(exported).toContain('SELECT * FROM "catalog""name"."odd""schema"."orders"');
    expect(exported).toContain('SELECT * FROM "catalog""name"."odd""schema"."targets"');
  });
});
