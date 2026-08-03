import type { Aggregation, ChartSpec, Dataset, FilterOperator, TransformStep } from '../types';

export function quoteIdentifier(value: string): string {
  return `"${value.replaceAll('"', '""')}"`;
}

export function quoteLiteral(value: string): string {
  return `'${value.replaceAll("'", "''")}'`;
}

const FILTER_SQL: Record<
  Exclude<FilterOperator, 'is_empty' | 'is_not_empty'>,
  (column: string, value: string) => string
> = {
  equals: (column, value) => `${column} = ${quoteLiteral(value)}`,
  not_equals: (column, value) => `${column} <> ${quoteLiteral(value)}`,
  contains: (column, value) => `CAST(${column} AS VARCHAR) ILIKE ${quoteLiteral(`%${value}%`)}`,
  greater_than: (column, value) => `${column} > TRY_CAST(${quoteLiteral(value)} AS DOUBLE)`,
  less_than: (column, value) => `${column} < TRY_CAST(${quoteLiteral(value)} AS DOUBLE)`,
};

function filterExpression(columnName: string, operator: FilterOperator, value: string): string {
  const column = quoteIdentifier(columnName);
  if (operator === 'is_empty') {
    return `(${column} IS NULL OR CAST(${column} AS VARCHAR) = '')`;
  }
  if (operator === 'is_not_empty') {
    return `(${column} IS NOT NULL AND CAST(${column} AS VARCHAR) <> '')`;
  }
  return FILTER_SQL[operator](column, value);
}

export function compileRecipe(
  baseDataset: Dataset,
  datasets: Dataset[],
  steps: TransformStep[],
): string {
  const ctes = [`recipe_0 AS (SELECT * FROM ${quoteIdentifier(baseDataset.tableName)})`];
  let previous = 'recipe_0';

  steps.forEach((step, index) => {
    const current = `recipe_${index + 1}`;
    if (step.type === 'filter') {
      ctes.push(
        `${current} AS (SELECT * FROM ${previous} WHERE ${filterExpression(
          step.column,
          step.operator,
          step.value,
        )})`,
      );
    }

    if (step.type === 'sort') {
      ctes.push(
        `${current} AS (SELECT * FROM ${previous} ORDER BY ${quoteIdentifier(
          step.column,
        )} ${step.direction.toUpperCase()})`,
      );
    }

    if (step.type === 'select') {
      const columns = step.columns.map(quoteIdentifier).join(', ');
      ctes.push(`${current} AS (SELECT ${columns} FROM ${previous})`);
    }

    if (step.type === 'join') {
      const right = datasets.find((dataset) => dataset.id === step.rightDatasetId);
      if (!right) {
        throw new Error('The dataset used by a join is no longer loaded.');
      }
      const rightColumns = right.columns
        .filter((column) => column.name !== step.rightColumn)
        .map(
          (column) =>
            `joined.${quoteIdentifier(column.name)} AS ${quoteIdentifier(
              `${right.name.replace(/\.[^.]+$/, '')} · ${column.name}`,
            )}`,
        );
      const projection = ['base.*', ...rightColumns].join(', ');
      ctes.push(
        `${current} AS (SELECT ${projection} FROM ${previous} AS base ${
          step.mode === 'left' ? 'LEFT' : 'INNER'
        } JOIN ${quoteIdentifier(right.tableName)} AS joined ON base.${quoteIdentifier(
          step.leftColumn,
        )} = joined.${quoteIdentifier(step.rightColumn)})`,
      );
    }

    previous = current;
  });

  return `WITH ${ctes.join(',\n')} SELECT * FROM ${previous}`;
}

const AGGREGATION_SQL: Record<Aggregation, (measure: string) => string> = {
  count: () => 'COUNT(*)',
  sum: (measure) => `SUM(TRY_CAST(${measure} AS DOUBLE))`,
  average: (measure) => `AVG(TRY_CAST(${measure} AS DOUBLE))`,
  minimum: (measure) => `MIN(TRY_CAST(${measure} AS DOUBLE))`,
  maximum: (measure) => `MAX(TRY_CAST(${measure} AS DOUBLE))`,
};

export function compileChartQuery(recipeSql: string, spec: ChartSpec): string {
  const dimension = quoteIdentifier(spec.dimension);
  const measure = spec.measure ? quoteIdentifier(spec.measure) : '*';
  const aggregate = AGGREGATION_SQL[spec.aggregation](measure);
  const ordering = spec.type === 'bar' ? 'value DESC NULLS LAST' : 'label ASC';
  return `SELECT CAST(${dimension} AS VARCHAR) AS label, ${aggregate} AS value
FROM (${recipeSql}) AS chart_source
WHERE ${dimension} IS NOT NULL
GROUP BY ${dimension}
ORDER BY ${ordering}
LIMIT 100`;
}

export function buildRecipeExport(
  dataset: Dataset,
  datasets: Dataset[],
  steps: TransformStep[],
): string {
  const sourceLines = datasets.map(
    (source) =>
      `-- source: ${source.name} | ${source.kind} | ${source.size} bytes | sha256 ${source.fingerprint}`,
  );
  const databaseAttachments = Array.from(
    new Map(
      datasets
        .filter((source) => source.databaseRelation)
        .map((source) => [source.databaseRelation!.databaseId, source.databaseRelation!]),
    ).values(),
  ).map(
    (source) =>
      `ATTACH ${quoteLiteral(source.databaseName)} AS ${quoteIdentifier(source.catalogName)} (TYPE DUCKDB, READ_ONLY);`,
  );
  return [
    '-- DataSkein reproducible recipe',
    '-- Generated locally. Keep the source files beside this SQL file or update the view paths.',
    ...sourceLines,
    '',
    ...databaseAttachments,
    ...(databaseAttachments.length > 0 ? [''] : []),
    ...datasets.map((source) => {
      const csvArguments = source.csvImport
        ? [
            `sample_size = ${source.csvImport.sampleSize}`,
            source.csvImport.overrides.delimiter
              ? `delim = ${quoteLiteral(source.csvImport.overrides.delimiter)}`
              : '',
            source.csvImport.overrides.header == null
              ? ''
              : `header = ${source.csvImport.overrides.header ? 'true' : 'false'}`,
            source.csvImport.allVarchar ? 'all_varchar = true' : '',
            source.csvImport.overrides.encoding
              ? `encoding = ${quoteLiteral(source.csvImport.overrides.encoding)}`
              : '',
          ].filter(Boolean)
        : ['sample_size = 20480'];
      const reader = source.databaseRelation
        ? [
            source.databaseRelation.catalogName,
            source.databaseRelation.schema,
            source.databaseRelation.relation,
          ]
            .map(quoteIdentifier)
            .join('.')
        : source.kind === 'csv'
          ? `read_csv_auto(${quoteLiteral(source.name)}, ${csvArguments.join(', ')})`
          : source.kind === 'json'
            ? `read_json_auto(${quoteLiteral(source.name)})`
            : `read_parquet(${quoteLiteral(source.name)})`;
      return `CREATE OR REPLACE VIEW ${quoteIdentifier(source.tableName)} AS SELECT * FROM ${reader};`;
    }),
    '',
    `${compileRecipe(dataset, datasets, steps)};`,
    '',
  ].join('\n');
}

export function safeCsvProjection(columns: { name: string; type: string }[]): string {
  return columns
    .map((column) => {
      const identifier = quoteIdentifier(column.name);
      const isText = /VARCHAR|CHAR|TEXT|JSON|UUID|ENUM/i.test(column.type);
      if (!isText) {
        return identifier;
      }
      return `CASE WHEN regexp_matches(COALESCE(CAST(${identifier} AS VARCHAR), ''), '^[\\t\\r ]*[=+@-]') THEN '''' || CAST(${identifier} AS VARCHAR) ELSE CAST(${identifier} AS VARCHAR) END AS ${identifier}`;
    })
    .join(', ');
}
