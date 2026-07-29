import {
  type ChangeEvent,
  type DragEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { dataEngine } from '../engine/duckdb';
import { buildDashboardHtml } from '../lib/dashboard';
import { detectFileKind, downloadBlob, formatBytes } from '../lib/files';
import { buildRecipeExport, compileChartQuery, compileRecipe } from '../lib/sql';
import type {
  ChartDatum,
  ChartSpec,
  ColumnInfo,
  DashboardCard,
  Dataset,
  FilterOperator,
  QueryRow,
  TransformStep,
} from '../types';
import { Brand } from './Brand';
import { ChartView } from './ChartView';
import { DataTable } from './DataTable';

type Tab = 'explore' | 'recipe' | 'chart' | 'dashboard';
type ErrorScope = 'import' | 'query' | 'export' | '';

type OperationProgress = {
  label: string;
  current: number;
  total: number;
};

const GUIDE_STORAGE_KEY = 'dataskein:quick-start:open:v1';

const SAMPLE_SALES = `order_id,ordered_at,region,category,revenue,status
1001,2026-01-03,North,Hardware,1820,won
1002,2026-01-06,West,Software,940,won
1003,2026-01-11,East,Services,2260,open
1004,2026-01-13,South,Hardware,1310,won
1005,2026-02-02,North,Software,1740,won
1006,2026-02-07,West,Services,830,lost
1007,2026-02-16,East,Hardware,2890,won
1008,2026-03-01,South,Software,1540,won
1009,2026-03-04,North,Services,2120,open
1010,2026-03-12,West,Hardware,2480,won
1011,2026-03-20,East,Software,1180,won
1012,2026-03-25,South,Services,1960,won`;

const SAMPLE_TARGETS = `region,target,owner
North,5000,Maya
West,4500,Leon
East,5200,Noah
South,4700,Ana`;

function errorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message.replace(/^.*?Error:\s*/i, '');
  }
  return 'Something went wrong while processing the file.';
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

function defaultChart(columns: ColumnInfo[]): ChartSpec {
  const dimension = columns.find((column) => /CHAR|TEXT|VARCHAR|DATE/i.test(column.type))?.name;
  const measure = columns.find((column) =>
    /INT|DECIMAL|DOUBLE|FLOAT|REAL/i.test(column.type),
  )?.name;
  return {
    id: crypto.randomUUID(),
    title: 'Grouped result',
    type: 'bar',
    dimension: dimension ?? columns[0]?.name ?? '',
    measure: measure ?? '',
    aggregation: measure ? 'sum' : 'count',
  };
}

function stepLabel(step: TransformStep, datasets: Dataset[]): { title: string; detail: string } {
  if (step.type === 'filter') {
    return { title: 'Filter', detail: `${step.column} · ${step.operator.replaceAll('_', ' ')}` };
  }
  if (step.type === 'sort') {
    return { title: 'Sort', detail: `${step.column} · ${step.direction}` };
  }
  if (step.type === 'select') {
    return { title: 'Keep columns', detail: `${step.columns.length} selected` };
  }
  return {
    title: `${step.mode === 'left' ? 'Left' : 'Inner'} join`,
    detail: `${datasets.find((dataset) => dataset.id === step.rightDatasetId)?.name ?? 'Missing source'} · ${step.leftColumn} = ${step.rightColumn}`,
  };
}

function errorTitle(scope: ErrorScope): string {
  if (scope === 'import') {
    return 'This file could not be opened.';
  }
  if (scope === 'query') {
    return 'The current recipe could not run.';
  }
  if (scope === 'export') {
    return 'The export could not be created.';
  }
  return 'DataSkein could not continue.';
}

function OperationStatus({
  operation,
  message,
}: {
  operation: OperationProgress;
  message: string;
}) {
  const progress = Math.max(0, Math.min(100, (operation.current / operation.total) * 100));
  return (
    <div className="operation-status" role="status" aria-live="polite">
      <div className="operation-heading">
        <span className="spinner" aria-hidden="true" />
        <div>
          <strong>{message}</strong>
          <small>{operation.label}</small>
        </div>
        <span>
          {operation.current}/{operation.total}
        </span>
      </div>
      <div
        className="operation-track"
        role="progressbar"
        aria-label={operation.label}
        aria-valuemin={0}
        aria-valuemax={operation.total}
        aria-valuenow={operation.current}
      >
        <i style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}

export function Workspace() {
  const inputRef = useRef<HTMLInputElement>(null);
  const runRef = useRef(0);
  const sampleStarted = useRef(false);
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [activeId, setActiveId] = useState('');
  const [steps, setSteps] = useState<TransformStep[]>([]);
  const [tab, setTab] = useState<Tab>('explore');
  const [rows, setRows] = useState<QueryRow[]>([]);
  const [columns, setColumns] = useState<ColumnInfo[]>([]);
  const [profile, setProfile] = useState<ColumnInfo[]>([]);
  const [resultCount, setResultCount] = useState(0);
  const [chartSpec, setChartSpec] = useState<ChartSpec>(() => defaultChart([]));
  const [chartData, setChartData] = useState<ChartDatum[]>([]);
  const [dashboard, setDashboard] = useState<DashboardCard[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('Ready. Files stay in this browser.');
  const [error, setError] = useState('');
  const [errorScope, setErrorScope] = useState<ErrorScope>('');
  const [operation, setOperation] = useState<OperationProgress | null>(null);
  const [online, setOnline] = useState(() => navigator.onLine);
  const [guideOpen, setGuideOpen] = useState(
    () => window.localStorage.getItem(GUIDE_STORAGE_KEY) !== 'false',
  );
  const [dragging, setDragging] = useState(false);
  const [filterColumn, setFilterColumn] = useState('');
  const [filterOperator, setFilterOperator] = useState<FilterOperator>('equals');
  const [filterValue, setFilterValue] = useState('');
  const [sortColumn, setSortColumn] = useState('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [joinDatasetId, setJoinDatasetId] = useState('');
  const [joinLeft, setJoinLeft] = useState('');
  const [joinRight, setJoinRight] = useState('');
  const [joinMode, setJoinMode] = useState<'left' | 'inner'>('left');

  const activeDataset = datasets.find((dataset) => dataset.id === activeId);
  const recipeSql = useMemo(
    () => (activeDataset ? compileRecipe(activeDataset, datasets, steps) : ''),
    [activeDataset, datasets, steps],
  );

  const loadFiles = useCallback(
    async (files: File[]) => {
      if (files.length === 0) {
        return;
      }
      setBusy(true);
      setError('');
      setErrorScope('');
      let firstLoaded = '';
      const loaded: Dataset[] = [];
      for (const file of files) {
        try {
          setMessage(`Checking ${file.name}…`);
          setOperation({ label: 'Validate file type and size', current: 1, total: 5 });
          const kind = await detectFileKind(file);
          setMessage(`Opening ${file.name} locally…`);
          const dataset = await dataEngine.loadFile(file, kind, (progress) => {
            setOperation({
              label: progress.label,
              current: progress.current + 1,
              total: progress.total + 1,
            });
          });
          loaded.push(dataset);
          firstLoaded ||= dataset.id;
        } catch (loadError) {
          setError(`${file.name}: ${errorMessage(loadError)}`);
          setErrorScope('import');
        }
      }
      if (loaded.length > 0) {
        setDatasets((current) => [...current, ...loaded]);
        if (!activeId) {
          setActiveId(firstLoaded);
        }
        setMessage(`${loaded.length} source${loaded.length === 1 ? '' : 's'} loaded locally.`);
      }
      setBusy(false);
      setOperation(null);
    },
    [activeId],
  );

  const loadSample = useCallback(async () => {
    const files = [
      new File([SAMPLE_SALES], 'quarterly-sales.csv', { type: 'text/csv' }),
      new File([SAMPLE_TARGETS], 'region-targets.csv', { type: 'text/csv' }),
    ];
    await loadFiles(files);
  }, [loadFiles]);

  useEffect(() => {
    if (
      !sampleStarted.current &&
      datasets.length === 0 &&
      new URLSearchParams(window.location.search).get('sample') === '1'
    ) {
      sampleStarted.current = true;
      void loadSample();
    }
  }, [datasets.length, loadSample]);

  useEffect(() => {
    if (!activeDataset || !recipeSql) {
      return;
    }
    const run = ++runRef.current;
    setBusy(true);
    setError('');
    setErrorScope('');
    setMessage('Running the visible recipe in the local worker…');
    setOperation({ label: 'Prepare result query', current: 0, total: 4 });

    void (async () => {
      try {
        let completed = 0;
        const track = async <T,>(label: string, task: Promise<T>): Promise<T> => {
          const value = await task;
          completed += 1;
          if (run === runRef.current) {
            setOperation({ label, current: completed, total: 4 });
          }
          return value;
        };
        const [nextColumns, nextRows, countRows] = await Promise.all([
          track('Schema detected', dataEngine.describe(recipeSql)),
          track('Preview rows ready', dataEngine.query(recipeSql, 250)),
          track(
            'Result rows counted',
            dataEngine.query(`SELECT COUNT(*) AS count FROM (${recipeSql}) AS counted`),
          ),
        ]);
        const nextProfile = await dataEngine.profile(recipeSql, nextColumns);
        setOperation({ label: 'Column profile ready', current: 4, total: 4 });
        if (run !== runRef.current) {
          return;
        }
        setColumns(nextColumns);
        setRows(nextRows);
        setProfile(nextProfile);
        setResultCount(Number(countRows[0]?.count ?? 0));
        setChartSpec((current) => {
          const stillValid = nextColumns.some((column) => column.name === current.dimension);
          return stillValid ? current : defaultChart(nextColumns);
        });
        setFilterColumn((current) => current || nextColumns[0]?.name || '');
        setSortColumn((current) => current || nextColumns[0]?.name || '');
        setJoinLeft((current) => current || nextColumns[0]?.name || '');
        setMessage(
          `Ready. Previewing ${Math.min(nextRows.length, 250)} of ${Number(
            countRows[0]?.count ?? 0,
          ).toLocaleString()} rows.`,
        );
      } catch (queryError) {
        if (run === runRef.current) {
          setError(errorMessage(queryError));
          setErrorScope('query');
          setMessage('The recipe could not be applied.');
        }
      } finally {
        if (run === runRef.current) {
          setBusy(false);
          setOperation(null);
        }
      }
    })();
  }, [activeDataset, recipeSql]);

  useEffect(() => {
    const right = datasets.find((dataset) => dataset.id === joinDatasetId);
    setJoinRight(right?.columns[0]?.name ?? '');
  }, [datasets, joinDatasetId]);

  useEffect(() => {
    if (!recipeSql || !chartSpec.dimension) {
      setChartData([]);
      return;
    }
    if (chartSpec.aggregation !== 'count' && !chartSpec.measure) {
      setChartData([]);
      return;
    }
    const query = compileChartQuery(recipeSql, chartSpec);
    void dataEngine
      .query(query)
      .then((chartRows) => {
        setChartData(
          chartRows.map((row) => ({
            label: scalarText(row.label, 'Unknown'),
            value: Number(row.value ?? 0),
          })),
        );
      })
      .catch((chartError) => {
        setError(errorMessage(chartError));
        setErrorScope('query');
      });
  }, [chartSpec, recipeSql]);

  useEffect(
    () => () => {
      void dataEngine.dispose();
    },
    [],
  );

  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    window.localStorage.setItem(GUIDE_STORAGE_KEY, String(guideOpen));
  }, [guideOpen]);

  const handleFiles = (event: ChangeEvent<HTMLInputElement>) => {
    void loadFiles(Array.from(event.target.files ?? []));
    event.target.value = '';
  };

  const dropFiles = (event: DragEvent<HTMLElement>) => {
    event.preventDefault();
    setDragging(false);
    void loadFiles(Array.from(event.dataTransfer.files));
  };

  const selectDataset = (id: string) => {
    if (id === activeId) {
      return;
    }
    setActiveId(id);
    setSteps([]);
    setDashboard([]);
    setTab('explore');
  };

  const addFilter = () => {
    if (!filterColumn) {
      return;
    }
    setSteps((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        type: 'filter',
        column: filterColumn,
        operator: filterOperator,
        value: filterValue,
      },
    ]);
    setFilterValue('');
  };

  const addSort = () => {
    if (!sortColumn) {
      return;
    }
    setSteps((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        type: 'sort',
        column: sortColumn,
        direction: sortDirection,
      },
    ]);
  };

  const addJoin = () => {
    if (!joinDatasetId || !joinLeft || !joinRight) {
      return;
    }
    setSteps((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        type: 'join',
        rightDatasetId: joinDatasetId,
        leftColumn: joinLeft,
        rightColumn: joinRight,
        mode: joinMode,
      },
    ]);
  };

  const exportSql = () => {
    if (!activeDataset) {
      return;
    }
    downloadBlob(
      buildRecipeExport(activeDataset, datasets, steps),
      `${activeDataset.name.replace(/\.[^.]+$/, '')}.dataskein.sql`,
      'text/sql;charset=utf-8',
    );
  };

  const exportCsv = async () => {
    if (!activeDataset) {
      return;
    }
    setBusy(true);
    setError('');
    setErrorScope('');
    setMessage('Writing a formula-safe CSV in the local worker…');
    setOperation({ label: 'Run safe export projection', current: 1, total: 2 });
    try {
      const bytes = await dataEngine.exportCsv(recipeSql, columns);
      setOperation({ label: 'Write CSV back to this device', current: 2, total: 2 });
      downloadBlob(
        Uint8Array.from(bytes).buffer,
        `${activeDataset.name.replace(/\.[^.]+$/, '')}-dataskein.csv`,
        'text/csv;charset=utf-8',
      );
      setMessage('CSV exported. Spreadsheet formula prefixes were neutralized.');
    } catch (exportError) {
      setError(errorMessage(exportError));
      setErrorScope('export');
    } finally {
      setBusy(false);
      setOperation(null);
    }
  };

  const pinChart = () => {
    if (!activeDataset || chartData.length === 0) {
      return;
    }
    const query = compileChartQuery(recipeSql, chartSpec);
    setDashboard((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        spec: { ...chartSpec, id: crypto.randomUUID() },
        data: chartData,
        sourceName: activeDataset.name,
        query,
      },
    ]);
    setTab('dashboard');
  };

  const exportDashboard = () => {
    downloadBlob(
      buildDashboardHtml(dashboard),
      'dataskein-dashboard.html',
      'text/html;charset=utf-8',
    );
  };

  const nonActiveDatasets = datasets.filter((dataset) => dataset.id !== activeId);
  const currentRightDataset = datasets.find((dataset) => dataset.id === joinDatasetId);
  const quickStartSteps = [
    {
      label: 'Open and profile a source',
      detail: activeDataset ? `${activeDataset.name} is ready` : 'Choose a local file',
      complete: Boolean(activeDataset),
      tab: 'explore' as Tab,
    },
    {
      label: 'Shape a useful result',
      detail:
        steps.length > 0
          ? `${steps.length} visible recipe step${steps.length === 1 ? '' : 's'}`
          : 'Add a filter, sort, or join',
      complete: steps.length > 0,
      tab: 'recipe' as Tab,
    },
    {
      label: 'Pin a view to the dashboard',
      detail:
        dashboard.length > 0
          ? `${dashboard.length} chart${dashboard.length === 1 ? '' : 's'} pinned`
          : 'Build a chart from the result',
      complete: dashboard.length > 0,
      tab: dashboard.length > 0 ? ('dashboard' as Tab) : ('chart' as Tab),
    },
  ];
  const quickStartComplete = quickStartSteps.filter((step) => step.complete).length;

  const clearError = () => {
    setError('');
    setErrorScope('');
  };

  const undoFailedStep = () => {
    setSteps((current) => current.slice(0, -1));
    clearError();
  };

  return (
    <div
      className={`workspace-shell${dragging ? ' is-dragging' : ''}`}
      onDragEnter={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragOver={(event) => event.preventDefault()}
      onDragLeave={(event) => {
        if (event.currentTarget === event.target) {
          setDragging(false);
        }
      }}
      onDrop={dropFiles}
    >
      {dragging && (
        <div className="drop-overlay" aria-hidden="true">
          <div>
            <span>＋</span>
            <strong>Drop files to open locally</strong>
            <small>CSV · TSV · JSON · JSONL · Parquet</small>
          </div>
        </div>
      )}

      <header className="workspace-header">
        <a href="/" className="brand-link">
          <Brand />
        </a>
        <div
          className={`privacy-pill${online ? '' : ' is-offline'}`}
          title="Source files stay in this browser session and are not uploaded."
        >
          <span aria-hidden="true" />
          {online ? 'Local session' : 'Offline · local session'}
        </div>
        <nav aria-label="Workspace actions">
          <a href="https://github.com/arturict/dataskein" target="_blank" rel="noreferrer">
            Docs
          </a>
          <button
            className="button button-small button-dark"
            onClick={() => inputRef.current?.click()}
          >
            Open files
          </button>
        </nav>
      </header>

      <input
        ref={inputRef}
        className="sr-only"
        type="file"
        aria-label="Open data files"
        multiple
        accept=".csv,.tsv,.txt,.json,.jsonl,.ndjson,.parquet"
        onChange={handleFiles}
      />

      <aside className="source-sidebar" aria-label="Data sources">
        <div className="sidebar-heading">
          <p className="eyebrow">Sources</p>
          <button
            aria-label="Open data files"
            className="icon-button"
            onClick={() => inputRef.current?.click()}
          >
            +
          </button>
        </div>
        {datasets.length === 0 ? (
          <button className="sidebar-dropzone" onClick={() => inputRef.current?.click()}>
            <span aria-hidden="true">⇣</span>
            <strong>Open your first file</strong>
            <small>or drop it anywhere</small>
          </button>
        ) : (
          <ul className="source-list">
            {datasets.map((dataset) => (
              <li key={dataset.id}>
                <button
                  className={dataset.id === activeId ? 'active' : ''}
                  onClick={() => selectDataset(dataset.id)}
                >
                  <span className={`file-kind kind-${dataset.kind}`}>{dataset.kind}</span>
                  <span>
                    <strong title={dataset.name}>{dataset.name}</strong>
                    <small>
                      {dataset.rowCount.toLocaleString()} rows · {formatBytes(dataset.size)}
                    </small>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="sidebar-privacy">
          <span aria-hidden="true">⌁</span>
          <p>
            <strong>Your files are not uploaded.</strong>
            Queries run in a browser worker.
          </p>
        </div>
      </aside>

      <main className="workspace-main" id="main-content">
        {!online && (
          <div className="offline-banner" role="status">
            <span aria-hidden="true">⌁</span>
            <div>
              <strong>You are offline.</strong>
              <p>
                {datasets.length > 0
                  ? 'Sources already open in this tab can still be explored locally.'
                  : 'You can try a local file. A first-time browser may still need the connection to load the query engine.'}
              </p>
            </div>
          </div>
        )}
        {datasets.length === 0 ? (
          <section className="workspace-empty">
            <div className="empty-privacy-signal">
              <span aria-hidden="true">●</span>
              Local by default · files are not uploaded
            </div>
            <p className="eyebrow">Your local data workbench</p>
            <h1>Open a file. See its shape. Find the first useful answer.</h1>
            <p>
              Start with CSV, TSV, JSON, JSONL, NDJSON, or Parquet. DataSkein checks the file,
              profiles its columns, and prepares a bounded preview in this browser.
            </p>
            {operation ? (
              <OperationStatus operation={operation} message={message} />
            ) : (
              <button className="empty-dropzone" onClick={() => inputRef.current?.click()}>
                <span aria-hidden="true">⇣</span>
                <strong>Drop files here or choose from this device</strong>
                <small>Multiple files are supported for local joins · up to 1 GB each</small>
              </button>
            )}
            <div className="empty-actions">
              <button
                className="button button-primary"
                onClick={() => inputRef.current?.click()}
                disabled={busy}
              >
                Choose local files
              </button>
              <span>or</span>
              <button
                className="button button-ghost"
                onClick={() => void loadSample()}
                disabled={busy}
              >
                Explore safe sample data
              </button>
            </div>
            {error && (
              <div className="error-banner error-recovery" role="alert">
                <div>
                  <strong>{errorTitle(errorScope)}</strong>
                  <p>{error}</p>
                </div>
                <div>
                  <button className="text-button" onClick={() => inputRef.current?.click()}>
                    Choose another file
                  </button>
                  <button className="text-button" onClick={() => void loadSample()}>
                    Use sample instead
                  </button>
                  <button className="text-button error-dismiss" onClick={clearError}>
                    Dismiss
                  </button>
                </div>
              </div>
            )}
            <div className="empty-outcomes" aria-label="What happens after opening a file">
              <div>
                <span>01</span>
                <strong>Schema</strong>
                <small>Types, nulls, ranges</small>
              </div>
              <div>
                <span>02</span>
                <strong>Preview</strong>
                <small>Up to 250 visible rows</small>
              </div>
              <div>
                <span>03</span>
                <strong>Next action</strong>
                <small>Filter, join, or chart</small>
              </div>
            </div>
            <p className="empty-limit">
              <span aria-hidden="true">i</span>
              Browser-safe boundary: 1 GB per file and a 1 GB query memory cap. Oversized work stops
              with a recovery message instead of consuming the whole tab.
            </p>
          </section>
        ) : (
          <>
            <section className="workspace-titlebar">
              <div>
                <p className="eyebrow">{activeDataset?.kind} source</p>
                <h1>{activeDataset?.name}</h1>
                <p>
                  {resultCount.toLocaleString()} result rows · {columns.length} columns ·{' '}
                  {steps.length} recipe {steps.length === 1 ? 'step' : 'steps'}
                </p>
              </div>
              <div className="export-menu">
                <button className="button button-ghost button-small" onClick={exportSql}>
                  Export SQL
                </button>
                <button
                  className="button button-dark button-small"
                  onClick={() => void exportCsv()}
                  disabled={busy}
                >
                  Export safe CSV
                </button>
              </div>
            </section>

            <div className="status-area">
              {operation ? (
                <OperationStatus operation={operation} message={message} />
              ) : (
                <p
                  className={error ? 'status-message has-error' : 'status-message is-ready'}
                  role="status"
                  aria-live="polite"
                >
                  <span aria-hidden="true">{error ? '!' : '✓'}</span>
                  {message}
                </p>
              )}
              {error && (
                <div className="error-banner error-recovery" role="alert">
                  <div>
                    <strong>{errorTitle(errorScope)}</strong>
                    <p>{error}</p>
                  </div>
                  <div>
                    {errorScope === 'query' && steps.length > 0 && (
                      <button className="text-button" onClick={undoFailedStep}>
                        Undo last recipe step
                      </button>
                    )}
                    {errorScope === 'import' && (
                      <button className="text-button" onClick={() => inputRef.current?.click()}>
                        Choose another file
                      </button>
                    )}
                    {errorScope === 'export' && (
                      <button className="text-button" onClick={() => void exportCsv()}>
                        Try export again
                      </button>
                    )}
                    <button className="text-button error-dismiss" onClick={clearError}>
                      Dismiss
                    </button>
                  </div>
                </div>
              )}
            </div>

            <section className={`quick-start${guideOpen ? '' : ' is-collapsed'}`}>
              <div className="quick-start-heading">
                <div>
                  <p className="eyebrow">First useful result</p>
                  <h2>
                    {quickStartComplete === quickStartSteps.length
                      ? 'Your first view is ready to export.'
                      : 'Keep the next useful step obvious.'}
                  </h2>
                </div>
                <div>
                  <span>
                    {quickStartComplete}/{quickStartSteps.length} complete
                  </span>
                  <button
                    className="text-button"
                    onClick={() => setGuideOpen((current) => !current)}
                    aria-expanded={guideOpen}
                  >
                    {guideOpen ? 'Hide guide' : 'Resume guide'}
                  </button>
                </div>
              </div>
              {guideOpen && (
                <>
                  <div
                    className="quick-start-track"
                    role="progressbar"
                    aria-label="First useful result progress"
                    aria-valuemin={0}
                    aria-valuemax={quickStartSteps.length}
                    aria-valuenow={quickStartComplete}
                  >
                    <i
                      style={{
                        width: `${(quickStartComplete / quickStartSteps.length) * 100}%`,
                      }}
                    />
                  </div>
                  <ol>
                    {quickStartSteps.map((step, index) => (
                      <li className={step.complete ? 'is-complete' : ''} key={step.label}>
                        <span aria-hidden="true">{step.complete ? '✓' : index + 1}</span>
                        <div>
                          <strong>{step.label}</strong>
                          <small>{step.detail}</small>
                        </div>
                        <button
                          className="text-button"
                          onClick={() => setTab(step.tab)}
                          aria-label={`${step.complete ? 'Review' : 'Start'}: ${step.label}`}
                        >
                          {step.complete ? 'Review' : 'Start'} →
                        </button>
                      </li>
                    ))}
                  </ol>
                </>
              )}
            </section>

            <div className="workspace-tabs" role="tablist" aria-label="Workspace sections">
              {(['explore', 'recipe', 'chart', 'dashboard'] as Tab[]).map((item) => (
                <button
                  key={item}
                  role="tab"
                  aria-selected={tab === item}
                  className={tab === item ? 'active' : ''}
                  onClick={() => setTab(item)}
                >
                  {item[0]?.toUpperCase()}
                  {item.slice(1)}
                  {item === 'recipe' && steps.length > 0 && <span>{steps.length}</span>}
                  {item === 'dashboard' && dashboard.length > 0 && <span>{dashboard.length}</span>}
                </button>
              ))}
            </div>

            {tab === 'explore' && (
              <section className="workspace-panel" role="tabpanel">
                <div className="panel-heading">
                  <div>
                    <p className="eyebrow">Profile</p>
                    <h2>What is actually in this result?</h2>
                  </div>
                  <p>Statistics use approximate distinct counts to keep scans bounded.</p>
                </div>
                <div className="profile-grid">
                  {profile.map((column) => (
                    <article key={column.name}>
                      <div className="profile-card-heading">
                        <strong title={column.name}>{column.name}</strong>
                        <span>{column.type}</span>
                      </div>
                      <dl>
                        <div>
                          <dt>missing</dt>
                          <dd>{(column.nullCount ?? 0).toLocaleString()}</dd>
                        </div>
                        <div>
                          <dt>distinct</dt>
                          <dd>≈{(column.distinctCount ?? 0).toLocaleString()}</dd>
                        </div>
                      </dl>
                      {(column.minimum != null || column.maximum != null) && (
                        <p title={`${column.minimum ?? '∅'} to ${column.maximum ?? '∅'}`}>
                          {column.minimum ?? '∅'} <span>→</span> {column.maximum ?? '∅'}
                        </p>
                      )}
                    </article>
                  ))}
                </div>
                <div className="preview-heading">
                  <div>
                    <p className="eyebrow">Preview</p>
                    <h2>First {Math.min(rows.length, 250)} rows</h2>
                  </div>
                  <p>Sorting and filtering are executed by DuckDB, not in the rendered table.</p>
                </div>
                <DataTable rows={rows} columns={columns} totalRows={resultCount} />
              </section>
            )}

            {tab === 'recipe' && (
              <section className="workspace-panel recipe-panel" role="tabpanel">
                <div className="recipe-builder">
                  <div className="panel-heading">
                    <div>
                      <p className="eyebrow">Recipe builder</p>
                      <h2>Make one explicit change at a time.</h2>
                    </div>
                    {steps.length > 0 && (
                      <button
                        className="text-button"
                        onClick={() => setSteps((current) => current.slice(0, -1))}
                      >
                        Undo last
                      </button>
                    )}
                  </div>

                  <details className="transform-control" open>
                    <summary>Filter rows</summary>
                    <div className="control-grid">
                      <label>
                        Column
                        <select
                          value={filterColumn}
                          onChange={(e) => setFilterColumn(e.target.value)}
                        >
                          {columns.map((column) => (
                            <option key={column.name}>{column.name}</option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Condition
                        <select
                          value={filterOperator}
                          onChange={(e) => setFilterOperator(e.target.value as FilterOperator)}
                        >
                          <option value="equals">equals</option>
                          <option value="not_equals">does not equal</option>
                          <option value="contains">contains</option>
                          <option value="greater_than">greater than</option>
                          <option value="less_than">less than</option>
                          <option value="is_empty">is empty</option>
                          <option value="is_not_empty">is not empty</option>
                        </select>
                      </label>
                      <label>
                        Value
                        <input
                          value={filterValue}
                          onChange={(e) => setFilterValue(e.target.value)}
                          disabled={
                            filterOperator === 'is_empty' || filterOperator === 'is_not_empty'
                          }
                        />
                      </label>
                      <button className="button button-dark button-small" onClick={addFilter}>
                        Add filter
                      </button>
                    </div>
                  </details>

                  <details className="transform-control">
                    <summary>Sort result</summary>
                    <div className="control-grid control-grid-short">
                      <label>
                        Column
                        <select value={sortColumn} onChange={(e) => setSortColumn(e.target.value)}>
                          {columns.map((column) => (
                            <option key={column.name}>{column.name}</option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Direction
                        <select
                          value={sortDirection}
                          onChange={(e) => setSortDirection(e.target.value as 'asc' | 'desc')}
                        >
                          <option value="asc">ascending</option>
                          <option value="desc">descending</option>
                        </select>
                      </label>
                      <button className="button button-dark button-small" onClick={addSort}>
                        Add sort
                      </button>
                    </div>
                  </details>

                  <details className="transform-control">
                    <summary>Join another source</summary>
                    <div className="control-grid join-grid">
                      {nonActiveDatasets.length === 0 ? (
                        <p className="control-note">Open a second file before adding a join.</p>
                      ) : (
                        <>
                          <label>
                            Source
                            <select
                              value={joinDatasetId}
                              onChange={(e) => setJoinDatasetId(e.target.value)}
                            >
                              <option value="">Choose a source</option>
                              {nonActiveDatasets.map((dataset) => (
                                <option key={dataset.id} value={dataset.id}>
                                  {dataset.name}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label>
                            Current key
                            <select value={joinLeft} onChange={(e) => setJoinLeft(e.target.value)}>
                              {columns.map((column) => (
                                <option key={column.name}>{column.name}</option>
                              ))}
                            </select>
                          </label>
                          <label>
                            Other key
                            <select
                              value={joinRight}
                              onChange={(e) => setJoinRight(e.target.value)}
                            >
                              {currentRightDataset?.columns.map((column) => (
                                <option key={column.name}>{column.name}</option>
                              ))}
                            </select>
                          </label>
                          <label>
                            Mode
                            <select
                              value={joinMode}
                              onChange={(e) => setJoinMode(e.target.value as 'left' | 'inner')}
                            >
                              <option value="left">keep every current row</option>
                              <option value="inner">keep matching rows only</option>
                            </select>
                          </label>
                          <button className="button button-dark button-small" onClick={addJoin}>
                            Add join
                          </button>
                        </>
                      )}
                    </div>
                  </details>
                </div>

                <aside className="recipe-stack" aria-label="Current recipe">
                  <div className="recipe-stack-heading">
                    <p className="eyebrow">Current thread</p>
                    <span>{steps.length + 1} stages</span>
                  </div>
                  <ol>
                    <li className="source-step">
                      <span>0</span>
                      <div>
                        <strong>Open source</strong>
                        <small>{activeDataset?.name}</small>
                      </div>
                    </li>
                    {steps.map((step, index) => {
                      const label = stepLabel(step, datasets);
                      return (
                        <li key={step.id}>
                          <span>{index + 1}</span>
                          <div>
                            <strong>{label.title}</strong>
                            <small>{label.detail}</small>
                          </div>
                          <button
                            aria-label={`Remove ${label.title} step`}
                            onClick={() =>
                              setSteps((current) => current.filter((item) => item.id !== step.id))
                            }
                          >
                            ×
                          </button>
                        </li>
                      );
                    })}
                  </ol>
                  <details className="sql-disclosure">
                    <summary>Generated SQL</summary>
                    <pre>{recipeSql}</pre>
                  </details>
                </aside>
              </section>
            )}

            {tab === 'chart' && (
              <section className="workspace-panel chart-panel" role="tabpanel">
                <div className="chart-controls">
                  <div>
                    <p className="eyebrow">Chart builder</p>
                    <h2>Make one comparison readable.</h2>
                  </div>
                  <label>
                    Title
                    <input
                      value={chartSpec.title}
                      onChange={(e) =>
                        setChartSpec((current) => ({ ...current, title: e.target.value }))
                      }
                    />
                  </label>
                  <label>
                    Chart
                    <select
                      value={chartSpec.type}
                      onChange={(e) =>
                        setChartSpec((current) => ({
                          ...current,
                          type: e.target.value as ChartSpec['type'],
                        }))
                      }
                    >
                      <option value="bar">bar</option>
                      <option value="line">line</option>
                      <option value="area">area</option>
                      <option value="scatter">scatter</option>
                    </select>
                  </label>
                  <label>
                    Group by
                    <select
                      value={chartSpec.dimension}
                      onChange={(e) =>
                        setChartSpec((current) => ({ ...current, dimension: e.target.value }))
                      }
                    >
                      {columns.map((column) => (
                        <option key={column.name}>{column.name}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Calculation
                    <select
                      value={chartSpec.aggregation}
                      onChange={(e) =>
                        setChartSpec((current) => ({
                          ...current,
                          aggregation: e.target.value as ChartSpec['aggregation'],
                        }))
                      }
                    >
                      <option value="count">count rows</option>
                      <option value="sum">sum</option>
                      <option value="average">average</option>
                      <option value="minimum">minimum</option>
                      <option value="maximum">maximum</option>
                    </select>
                  </label>
                  <label>
                    Measure
                    <select
                      value={chartSpec.measure}
                      disabled={chartSpec.aggregation === 'count'}
                      onChange={(e) =>
                        setChartSpec((current) => ({ ...current, measure: e.target.value }))
                      }
                    >
                      <option value="">Choose a numeric column</option>
                      {columns.map((column) => (
                        <option key={column.name}>{column.name}</option>
                      ))}
                    </select>
                  </label>
                  <button
                    className="button button-primary"
                    onClick={pinChart}
                    disabled={chartData.length === 0}
                  >
                    Pin to dashboard
                  </button>
                </div>
                <div className="chart-preview">
                  <div className="chart-preview-heading">
                    <p>Live result</p>
                    <span>{chartData.length} groups</span>
                  </div>
                  {chartData.length > 0 ? (
                    <ChartView spec={chartSpec} data={chartData} />
                  ) : (
                    <div className="empty-inline">Choose compatible columns to render a chart.</div>
                  )}
                </div>
              </section>
            )}

            {tab === 'dashboard' && (
              <section className="workspace-panel dashboard-panel" role="tabpanel">
                <div className="panel-heading">
                  <div>
                    <p className="eyebrow">Dashboard snapshot</p>
                    <h2>Keep only the views that answer the question.</h2>
                  </div>
                  {dashboard.length > 0 && (
                    <button className="button button-dark button-small" onClick={exportDashboard}>
                      Export standalone HTML
                    </button>
                  )}
                </div>
                {dashboard.length === 0 ? (
                  <div className="dashboard-empty">
                    <span aria-hidden="true">⌗</span>
                    <h3>No pinned charts yet</h3>
                    <p>
                      Build a chart, then pin it here. The dashboard export includes aggregates and
                      SQL, not raw source rows.
                    </p>
                    <button className="text-button" onClick={() => setTab('chart')}>
                      Build a chart →
                    </button>
                  </div>
                ) : (
                  <div className="dashboard-grid">
                    {dashboard.map((card) => (
                      <article key={card.id}>
                        <div>
                          <p>{card.sourceName}</p>
                          <button
                            aria-label={`Remove ${card.spec.title} from dashboard`}
                            onClick={() =>
                              setDashboard((current) =>
                                current.filter((item) => item.id !== card.id),
                              )
                            }
                          >
                            ×
                          </button>
                        </div>
                        <h3>{card.spec.title}</h3>
                        <ChartView spec={card.spec} data={card.data} />
                      </article>
                    ))}
                  </div>
                )}
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
}
