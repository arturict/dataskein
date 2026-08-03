# Security policy

## Supported versions

Only the latest published release receives security fixes.

## Reporting a vulnerability

Please use
[GitHub private vulnerability reporting](https://github.com/arturict/dataskein/security/advisories/new)
instead of a public issue.

Include:

- affected version or commit,
- a minimal reproduction using synthetic data,
- impact and realistic attack path,
- any suggested mitigation,
- whether the report may be acknowledged publicly.

Do not include private source data, credentials, or personal information. Please
allow up to seven days for an initial response. A remediation timeline depends
on severity and reproducibility; no fixed resolution date is promised.

## Privacy and trust boundary

DataSkein is a static browser application. It has no account system, analytics,
upload endpoint, remote data connector, or application backend. Selected files
are registered with a DuckDB-Wasm worker through browser APIs.

Local `.duckdb` files are attached and verified read-only. DataSkein lists
persisted views but does not execute them because their stored SQL could refer
to network or filesystem sources outside the selected database. Base-table
inspection automatically reads at most 250 rows and does not run a full count
or profile scan.

“Local-first” does not mean the browser environment is infallible. A malicious
extension, compromised device, compromised dependency, or compromised hosting
origin may access data available to the page. Users should verify the published
release and checksum when their threat model requires it.

The full technical analysis is in [docs/THREAT_MODEL.md](docs/THREAT_MODEL.md).

## Export safety

CSV exports quote every field and prefix text that could be interpreted as a
spreadsheet formula with an apostrophe. Standalone dashboard exports contain
only chart aggregates and generated SQL, not raw source tables. Treat all
exports as files under your control and inspect them before sharing.
