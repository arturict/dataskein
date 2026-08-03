# Changelog

All notable changes are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.9] - 2026-08-03

### Fixed

- Render DuckDB `DECIMAL` values with their declared scale instead of exposing Apache Arrow's internal 32-bit word array.

## [0.1.8] - 2026-08-03

### Added

- Open local `.duckdb` files as explicitly verified read-only catalogs.
- List schemas, base tables, views, column counts, and approximate base-table row metadata.
- Inspect selected base tables through the existing recipe workspace with a 250-row startup preview.
- Show DuckDB's detected CSV delimiter, header, quote, escape, newline, skipped rows, encoding, and type mode before users trust the inferred schema.
- Offer explicit local retries for failed CSV imports with delimiter, header, encoding, and all-text overrides.

### Changed

- Keep CSV detection bounded to 20,480 sampled rows and preserve the effective import overrides in exported SQL recipes.
- Skip automatic full row counts and column profiles for DuckDB tables, and list persisted views without executing their stored SQL.
- Export reproducible DuckDB recipes with one deduplicated `ATTACH ... (READ_ONLY)` statement per database and qualified relation names.

## [0.1.7] - 2026-08-02

### Added

- Show real import and query stages instead of an indeterminate loading message.
- Add a resumable first-result checklist that links directly to profiling, recipe, chart, and dashboard surfaces.
- Explain offline state, browser-safe limits, and recovery actions for import, recipe, and export failures in context.
- Verify the compact mobile workspace for overflow and console errors.
- Add the previously documented visual column-selection recipe step.
- Add keyboard-complete tabs with Arrow, Home, and End navigation.

### Changed

- Make the empty workspace outcome-first with a prominent local-file drop zone, safe sample path, privacy signal, and next-step preview.
- Preserve each source's in-session recipe, chart setup, dashboard, and active tab when switching between loaded datasets.

### Fixed

- Restrict chart measures to numeric columns and prevent stale chart queries from being pinned after rapid changes.
- Keep line and area exports faithful to their selected chart type, including a correct zero baseline for negative values.
- Remove the misleading scatter option, which previously used ordinal row positions rather than a real numeric x-axis.
- Label columns beyond the 80-column profiling cap honestly instead of showing invented zero counts.

## [0.1.6] - 2026-07-29

### Changed

- Rebuilt the landing page around a real product view, a clearer file-to-answer narrative, detailed workflow visuals, honest product boundaries, local-only architecture, and a compact FAQ.
- Refreshed the repository screenshot and social preview to match the new public design.

### Fixed

- Isolated screenshot and E2E preview servers on strict, dedicated ports so unrelated local services cannot be mistaken for DataSkein.
- Increased contrast and corrected diagram semantics across the new landing page.

## [0.1.5] - 2026-07-29

### Fixed

- Target the extensionless root document in Vercel rewrites when `cleanUrls` is enabled, so `/app` actually resolves in production.

## [0.1.4] - 2026-07-29

### Fixed

- Serve the `/app` workspace entry point through Vercel's SPA rewrite instead of returning a production 404.
- Add a hosting configuration regression test for both `/app` and nested workspace routes.

## [0.1.3] - 2026-07-29

### Fixed

- Give the decorative workflow illustration valid image semantics and remove an unsupported ARIA label from the visible wordmark.
- Extend the landing-page accessibility regression test to reject prohibited ARIA attributes that Axe cannot fully evaluate.

## [0.1.2] - 2026-07-29

### Fixed

- Made deterministic ZIP timestamps independent of the build machine's local
  timezone.

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

[Unreleased]: https://github.com/arturict/dataskein/compare/v0.1.9...HEAD
[0.1.9]: https://github.com/arturict/dataskein/compare/v0.1.8...v0.1.9
[0.1.8]: https://github.com/arturict/dataskein/compare/v0.1.7...v0.1.8
[0.1.7]: https://github.com/arturict/dataskein/compare/v0.1.6...v0.1.7
[0.1.6]: https://github.com/arturict/dataskein/compare/v0.1.5...v0.1.6
[0.1.5]: https://github.com/arturict/dataskein/compare/v0.1.4...v0.1.5
[0.1.4]: https://github.com/arturict/dataskein/compare/v0.1.3...v0.1.4
[0.1.3]: https://github.com/arturict/dataskein/compare/v0.1.2...v0.1.3
[0.1.2]: https://github.com/arturict/dataskein/compare/v0.1.1...v0.1.2
[0.1.1]: https://github.com/arturict/dataskein/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/arturict/dataskein/releases/tag/v0.1.0
