# Contributing

Thanks for helping make DataSkein more trustworthy and useful.

## Before opening an issue

- Search existing issues and the [roadmap](ROADMAP.md).
- For a bug, include a small synthetic file or reproducible generator whenever
  possible. Do not attach private data.
- State the browser, operating system, DataSkein version, expected result, and
  actual result.
- Security reports belong in the private process described in
  [SECURITY.md](SECURITY.md), not a public issue.

## Pull requests

Keep changes focused. Explain the user problem, the chosen boundary, and the
tests that prove the behavior. Product expansions should first have an accepted
issue because the project intentionally avoids generic BI scope.

```bash
pnpm install --frozen-lockfile
pnpm check
pnpm test:e2e
pnpm audit
```

Pull requests must:

- preserve the local-first data boundary,
- add or update tests for behavior changes,
- keep keyboard and screen-reader behavior working,
- update documentation and the changelog when user-visible behavior changes,
- avoid telemetry, remote calls, or new runtime dependencies without explicit
  discussion,
- never include real private datasets, secrets, or generated build output.

## Code style

Prettier and ESLint are authoritative. TypeScript should remain strict. Keep
user-controlled SQL identifiers and literals behind the central quoting helpers.
Bound result sizes before data reaches React.

## Commits

Use clear imperative commit subjects. Signing commits is welcome but not
required. By contributing, you agree that your work is licensed under the MIT
License.
