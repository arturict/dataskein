# Roadmap

This is a direction, not a promise or delivery schedule.

## Now: v0.1

- local CSV, TSV, JSON, JSONL, NDJSON, Parquet, and DuckDB intake
- read-only DuckDB catalog browsing and bounded base-table inspection
- bounded CSV dialect inspection and explicit delimiter, header, encoding, and all-text recovery
- profiling, filters, sorts, column selection, and two-file joins
- inspectable SQL, basic charts, small dashboards
- safe CSV, SQL recipe, and standalone dashboard exports
- explicit browser and resource limits

## Next candidates

Only after real user feedback:

- import and validate a previously exported `.dataskein.sql` recipe,
- recipe JSON with a versioned schema and fingerprint mismatch warnings,
- optional Parquet result export,
- recipe-level undo and reorder,
- Firefox and WebKit CI coverage,
- keyboard-focused drag-and-drop alternatives and usability testing,
- explicit opt-in profiling for selected DuckDB tables after real large-database feedback.

## Explicitly not planned

- cloud accounts or hosted private datasets,
- full spreadsheet editing or formula compatibility,
- generic BI administration, semantic layers, or scheduled refresh,
- AI-generated conclusions,
- arbitrary remote database or warehouse connectors.
- arbitrary SQL consoles or write access to DuckDB files.
