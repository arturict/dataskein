# Threat model

## Assets

- private source files selected by the user,
- derived preview rows and aggregate chart data,
- exported CSV, SQL, and dashboard files,
- the integrity of the visible transformation recipe.

## Trust boundaries

Trusted for the release:

- the user's device and browser profile,
- the downloaded DataSkein application bundle,
- pinned runtime dependencies in that bundle,
- same-origin static hosting.

Not controlled:

- malicious browser extensions,
- a compromised operating system or browser,
- a compromised hosting or dependency supply chain,
- files the user explicitly exports or shares,
- other software that later opens an exported CSV or HTML file.

## Primary threats and controls

| Threat                                          | Control                                                                                                                | Residual risk                                                                                    |
| ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Source-file exfiltration                        | No workspace backend or analytics, bounded landing-only analytics, cross-origin request E2E                            | A compromised dependency or hosting origin could bypass application intent                       |
| Browser crash or memory exhaustion              | 1 GB file refusal, 1 GB query memory setting, one worker/thread, capped previews and chart groups                      | Complex or wide data can exhaust browser memory below 1 GB                                       |
| File extension spoofing                         | Content checks for text, JSON prefixes, Parquet boundaries, and DuckDB header magic                                    | Magic bytes do not prove a whole file is benign or valid                                         |
| CSV formula injection                           | Text values beginning with `=`, `+`, `-`, or `@` after whitespace receive a leading apostrophe; all fields are quoted  | Importers with unusual formula rules may behave differently                                      |
| SQL injection through filenames or column names | Central literal and identifier quoting; no arbitrary SQL input                                                         | A DuckDB parser vulnerability remains possible                                                   |
| HTML/script injection in dashboard export       | HTML-sensitive JSON characters and closing-script sequences are escaped; values are rendered as text                   | The exported file includes JavaScript by design and should not receive untrusted modifications   |
| Network-capable DuckDB features                 | No arbitrary SQL editor or remote controls; DuckDB files attach read-only; persisted views are listed but not executed | Explicit transformations can still be expensive; future SQL or view execution needs a new review |
| Stale application shell                         | Network-first navigation service worker and versioned cache                                                            | Offline users may intentionally continue on a cached version                                     |
| Supply-chain compromise                         | Lockfile, Dependabot, audit gate, CodeQL, minimal dependencies, release checksums                                      | Registry and action compromise cannot be eliminated                                              |

## Security invariants

1. A normal local-file workflow must not make a cross-origin request.
2. Raw source rows must not enter dashboard exports.
3. User-controlled identifiers must never be concatenated without quoting.
4. Spreadsheet-dangerous text must be neutralized before CSV export.
5. Preview and chart result sizes remain bounded.
6. New network features, arbitrary SQL, or collaboration require an explicit
   threat-model update.
7. A DuckDB database attachment must be verified as read-only before its catalog is shown.
