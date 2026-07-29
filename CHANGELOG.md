# Changelog

All notable changes are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.1] - 2026-07-29

### Fixed

- Removed non-reproducible source-map paths from the static production build.
- Normalized text bytes in release archives so Windows and Linux packaging
  produce the same checksum.

## [0.1.0] - 2026-07-29

### Added

- Local intake for CSV, TSV, JSON, JSONL, NDJSON, and Parquet
- Schema and column profiling with a virtualized 250-row preview
- Visible filters, sorts, column selection, and left or inner joins
- Generated DuckDB SQL and source SHA-256 fingerprints
- Accessible bar, line, area, and scatter charts
- In-session dashboards and standalone HTML export
- Formula-neutralized CSV and portable SQL recipe exports
- Content checks for obvious extension spoofing
- Local-first CSP, service worker, landing page, and OSS project documentation
- Unit, integration, E2E, accessibility, security, and large-input gates

[Unreleased]: https://github.com/arturict/dataskein/compare/v0.1.1...HEAD
[0.1.1]: https://github.com/arturict/dataskein/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/arturict/dataskein/releases/tag/v0.1.0
