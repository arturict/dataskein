export type FileKind = 'csv' | 'json' | 'parquet';

export interface CsvImportOptions {
  delimiter?: ',' | ';' | '\t' | '|';
  header?: boolean;
  allVarchar?: boolean;
  encoding?: 'utf-8' | 'latin-1' | 'utf-16';
}

export interface CsvImportDetails {
  delimiter: string;
  quote: string;
  escape: string;
  newLine: string;
  hasHeader: boolean;
  skipRows: number;
  sampleSize: number;
  allVarchar: boolean;
  encoding: string;
  overrides: CsvImportOptions;
}

export interface ColumnInfo {
  name: string;
  type: string;
  nullCount?: number;
  distinctCount?: number;
  minimum?: string;
  maximum?: string;
}

export interface Dataset {
  id: string;
  name: string;
  registeredName: string;
  tableName: string;
  kind: FileKind;
  size: number;
  fingerprint: string;
  rowCount: number;
  columns: ColumnInfo[];
  csvImport?: CsvImportDetails;
}

export type FilterOperator =
  'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than' | 'is_empty' | 'is_not_empty';

export interface FilterStep {
  id: string;
  type: 'filter';
  column: string;
  operator: FilterOperator;
  value: string;
}

export interface SortStep {
  id: string;
  type: 'sort';
  column: string;
  direction: 'asc' | 'desc';
}

export interface JoinStep {
  id: string;
  type: 'join';
  rightDatasetId: string;
  leftColumn: string;
  rightColumn: string;
  mode: 'left' | 'inner';
}

export interface SelectStep {
  id: string;
  type: 'select';
  columns: string[];
}

export type TransformStep = FilterStep | SortStep | JoinStep | SelectStep;

export type ChartType = 'bar' | 'line' | 'area';
export type Aggregation = 'count' | 'sum' | 'average' | 'minimum' | 'maximum';

export interface ChartSpec {
  id: string;
  title: string;
  type: ChartType;
  dimension: string;
  measure: string;
  aggregation: Aggregation;
}

export interface ChartDatum {
  label: string;
  value: number;
}

export interface DashboardCard {
  id: string;
  spec: ChartSpec;
  data: ChartDatum[];
  sourceName: string;
  query: string;
}

export type QueryRow = Record<string, unknown>;
