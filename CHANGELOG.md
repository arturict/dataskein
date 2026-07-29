# Changelog

All notable changes are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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

[Unreleased]: https://github.com/arturict/dataskein/compare/v0.1.5...HEAD
[0.1.5]: https://github.com/arturict/dataskein/compare/v0.1.4...v0.1.5
[0.1.4]: https://github.com/arturict/dataskein/compare/v0.1.3...v0.1.4
[0.1.3]: https://github.com/arturict/dataskein/compare/v0.1.2...v0.1.3
[0.1.2]: https://github.com/arturict/dataskein/compare/v0.1.1...v0.1.2
[0.1.1]: https://github.com/arturict/dataskein/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/arturict/dataskein/releases/tag/v0.1.0
