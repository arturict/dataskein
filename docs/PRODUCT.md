# Product decision

Research snapshot: 29 July 2026.

This document records why DataSkein exists, what evidence supports the first
release, and which adjacent ideas are intentionally excluded. Community posts
are treated as demand signals, not market-size proof.

## Decision

Build a local-first workbench for the recurring step between “I have these
exports” and “here is an answer I can explain.”

The first releases serve analysts, operations specialists, technically curious
spreadsheet users, journalists, and developers who receive local flat files or
a DuckDB database and need to inspect, combine, shape, chart, and hand off a
result without creating a cloud workspace.

The strongest wedge is not “query a CSV in the browser.” That category already
has capable products. The wedge is a visible, ordered transformation recipe
that connects multiple local exports to a reproducible result.

## Evidence summary

Recurring signals:

- A 2025 r/dataanalysis thread about 1.5 million records describes the point
  where Excel filters stop being viable.
- 2026 r/excel discussions describe large operational reports that must be
  merged manually and work that stalls even through Power Query.
- A 2026 r/PowerShell thread calls large recurring CSV exports a repeated memory
  headache rather than a one-off conversion task.
- The 2024 Pretzel Show HN reached 227 points and 74 comments. The launch
  emphasized browser-local transforms and large CSV performance; commenters
  specifically asked for multiple files and joins.
- DuckDB issues document pathological CSV and JSON cases with high memory use,
  very wide schemas, or oversized objects. These are reasons to expose limits
  and fail clearly rather than promise unlimited files.

Representative sources:

- [1.5M+ records in Excel, what should I use?](https://www.reddit.com/r/dataanalysis/comments/1ju8gq1/)
- [Faster way to merge large Excel reports](https://www.reddit.com/r/excel/comments/1rorpfu/)
- [Handling large recurring CSV exports](https://www.reddit.com/r/PowerShell/comments/1u2sgip/)
- [Pretzel Show HN discussion](https://news.ycombinator.com/item?id=39717268)
- [DuckDB issue: extremely wide CSV input](https://github.com/duckdb/duckdb/issues/10770)
- [DuckDB issue: large JSON objects and memory](https://github.com/duckdb/duckdb/issues/14204)

These sources establish repeated pain and active interest. They do not establish
a total addressable market, willingness to pay, or a unique moat.

### Post-release scope signal

After the first public release, one r/DuckDB commenter asked whether DataSkein
could open `.duckdb` files. When asked to choose between table inspection,
arbitrary SQL, or join sources, they answered that table inspection would be a
good start. This is one direct qualitative signal, not demand proof. It supports
a narrow read-only catalog and base-table preview while arguing against a SQL
console or database administration scope.

- [Scope clarification reply](https://www.reddit.com/r/DuckDB/comments/1va1u1p/comment/p1bx9cn/)
- [Follow-up choosing table inspection](https://www.reddit.com/r/DuckDB/comments/1va1u1p/comment/p1ebh5x/)

## Jobs to be done

1. **Triage an unfamiliar export.** See types, missing values, ranges, and
   cardinality before trusting the file.
2. **Repeat a small cleaning path.** Apply filters and sorts as named steps
   rather than editing cells or losing a notebook fragment.
3. **Reconcile related exports.** Join a transaction export to a lookup or
   target file without setting up a database.
4. **Explain the answer.** Show the generated SQL and source fingerprints so
   another person can review what happened.
5. **Hand off a compact result.** Export safe rows, a portable SQL recipe, or a
   standalone chart snapshot without publishing the private source data.

## Competition

| Product or category                                                 | Local processing        | Multi-file or joins            | Visual transformations | Reproducible handoff    | DataSkein decision                                             |
| ------------------------------------------------------------------- | ----------------------- | ------------------------------ | ---------------------- | ----------------------- | -------------------------------------------------------------- |
| [DuckDB UI](https://duckdb.org/docs/stable/core_extensions/ui.html) | Native local DuckDB     | Yes                            | SQL-first exploration  | SQL and database        | Do not compete as a full database UI                           |
| [Pretzel](https://github.com/pretzelai/pretzelai)                   | Browser-local           | Requested in its launch thread | Block-based            | Transform chain         | Validate the recipe model, keep scope smaller                  |
| [SQL for Files](https://sqlforfiles.app/)                           | Browser-local           | Yes                            | SQL and charts         | Query history           | Do not build another Monaco SQL workbench                      |
| [parquet.to query](https://parquet.to/query)                        | Browser-local           | Yes                            | SQL-first              | CSV, JSON, Parquet      | Differentiate on visible no-code steps and source fingerprints |
| [Parquet Viewer](https://www.parquet-viewer.com/)                   | Browser and native      | Yes                            | SQL, pivot, export     | Saved view/export       | Avoid a Parquet-first feature race                             |
| [Duck-UI](https://github.com/caioricciuti/duck-ui)                  | Browser-local           | Yes                            | Data explorer and SQL  | Query history           | Avoid database administration surfaces                         |
| [Datasette](https://datasette.io/)                                  | Local/server deployment | Via databases                  | Facets and plugins     | Publishable datasets    | Avoid server setup and publishing                              |
| [Evidence](https://evidence.dev/)                                   | Build-time data app     | Data sources                   | Code-driven dashboards | Version-controlled site | Keep zero-setup file intake                                    |
| Excel / Power Query                                                 | Device-local            | Yes                            | Rich GUI               | Workbook                | Avoid cell editing, formulas, and workbook semantics           |

The comparison shows substantial supply. Privacy and DuckDB-Wasm are table
stakes, not differentiation.

## MVP boundary

Included:

- local file intake and profiling
- read-only DuckDB catalog browsing and bounded base-table inspection
- a compact transformation recipe
- two-file joins
- basic charting and dashboard snapshots
- auditable and safe exports

Excluded:

- accounts, collaboration, cloud sync, publishing, comments, or permissions
- remote URLs, warehouses, S3, database connectors, or extension installation
- DuckDB writes or execution of persisted database views
- arbitrary SQL editing, notebooks, Python, AI-generated analysis, or LLM calls
- spreadsheet cells, formulas, pivot-table parity, or manual data editing
- scheduled refresh, alerting, semantic layers, or full BI dashboards
- geospatial charts, maps, advanced statistics, and report builders

Those exclusions prevent the release from becoming a generic BI or Excel clone.

## Success criteria for learning

The project should next learn whether users:

- return with a second export from the same workflow,
- use a join rather than only a preview,
- export the SQL recipe or dashboard to explain a result,
- can recover from malformed files without support,
- ask for recipe re-import before asking for broad BI features.

No analytics are installed. Early learning therefore relies on issues, launch
feedback, and explicit user reports.
