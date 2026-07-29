# Development

## Requirements

- Node.js 22 or newer
- pnpm 11.7.0
- current Chromium for the local E2E gate

## Install and run

```bash
pnpm install --frozen-lockfile
pnpm dev
```

## Gates

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test:coverage
pnpm build
pnpm test:e2e
pnpm audit
```

`pnpm check` runs the first five commands. E2E is separate because it builds the
app and starts a local preview server.

The test suite includes:

- unit coverage for file detection, SQL quoting and compilation, formula-safe
  projections, and standalone dashboard escaping;
- a full sample path from two sources through filter, join, chart, and export;
- real CSV, JSON, JSONL, and Apache Parquet inputs;
- a generated 64 MiB CSV with a 250-row render cap;
- malformed JSON and spoofed Parquet;
- CSV formula-injection payloads;
- Axe WCAG A and AA checks;
- narrow viewport overflow and browser console errors;
- loaded-session offline state and retained local results;
- a request listener proving that a local source workflow makes no
  cross-origin requests.

## Release artifact

```bash
pnpm release:artifact
```

The command rebuilds the project and writes a deterministic static-site ZIP and
its SHA-256 checksum to `artifacts/`. Serve the extracted directory with any
static web server that supports SPA fallback for `/app`.

## Screenshot refresh

```bash
pnpm screenshots
```

This builds the application, starts a preview server, and captures the real
landing page and loaded sample workspace into `docs/assets`. It also updates the
Open Graph image in `public/og.png`.

## Dependency policy

- Runtime dependencies should be few and directly justified.
- Versions that execute the local query engine are pinned exactly.
- Lockfile changes must pass install, audit, unit, browser, and production build
  gates.
- Dependabot proposes weekly pnpm and GitHub Actions updates.
- No dependency may add telemetry or network access without an explicit product
  and privacy review.
