# Architecture

## Overview

DataSkein is a static React application. There is no application backend.

```text
Browser File objects
        |
        v
Content sniffing and SHA-256 fingerprinting
        |
        v
Bounded CSV dialect and schema detection
        |
        v
DuckDB-Wasm single worker
        |
        +--> schema and bounded profile
        +--> generated SQL recipe
        +--> preview limited to 250 rows
        +--> chart aggregate limited to 100 groups
        |
        v
Explicit local downloads
```

The landing page and workspace are two routes in the same Vite build. Vercel
rewrites `/app` to the static entry document.

## Components

- `src/lib/files.ts`: size limits, signature and content checks, streaming
  SHA-256, downloads
- `src/engine/duckdb.ts`: worker lifecycle, browser file registration, bounded
  CSV dialect detection, queries, profiles, and safe CSV export
- `src/lib/sql.ts`: identifier and literal quoting, recipe compilation, chart
  queries, and formula neutralization
- `src/components/Workspace.tsx`: product state and explicit transformation
  controls
- `src/components/DataTable.tsx`: capped, virtualized preview
- `src/components/ChartView.tsx`: ECharts rendering with ARIA descriptions
- `src/lib/dashboard.ts`: standalone export with aggregate data and SQL only

## Data boundaries

Source rows live in the browser's File objects and DuckDB-Wasm worker. React
state receives at most 250 preview rows, column profiles, and up to 100
aggregated chart groups. A dashboard card stores its aggregate points and query,
not its raw source table.

The content security policy restricts connections to the same origin and blob
URLs. The app has no analytics SDK, remote connector, upload endpoint, or
dynamic extension installer. A browser extension, compromised device, malicious
dependency, or compromised hosting origin remains outside this guarantee; see
the threat model.

## Resource controls

- 1 GB maximum accepted size per file
- 1 GB DuckDB query memory setting
- single DuckDB worker and one query thread
- 250 preview rows
- 80 profiled columns
- 100 chart groups
- no arbitrary SQL input in the first release

These are fail-safe controls, not performance guarantees. WebAssembly memory is
browser-dependent and expensive joins may fail before a limit is reached.

## Reproducibility model

Each dataset receives a streaming SHA-256 fingerprint. Transformation controls
produce an ordered immutable step list. The SQL export includes:

- expected source filenames,
- source SHA-256 fingerprints,
- effective CSV delimiter, header, encoding, and type overrides,
- reproducible `CREATE VIEW` statements,
- the compiled recipe query.

Re-importing recipe files is intentionally not part of v0.1.0. The export is
human-readable and executable in DuckDB, but replay automation remains a
roadmap item.

## Build and deployment

`pnpm build` produces a content-hashed static bundle. The release packager
creates a deterministic ZIP from that exact `dist` tree and writes a SHA-256
checksum. Vercel serves the same build command and applies security and caching
headers from `vercel.json`.
