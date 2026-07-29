# CI cost baseline and policy

This document records the measured GitHub Actions baseline and the quality
boundaries used when reducing CI work.

## Billing context

DataSkein is a public repository using standard `ubuntu-latest` runners.
GitHub documents that this runner usage is free for public repositories, so the
runner minutes below do not consume the owner's private-repository minute
allowance. They are still tracked because unnecessary work increases feedback
time and can create avoidable cache churn.

GitHub also accounts for caches separately from Actions artifacts. Workflow
logs do not consume the artifact allowance.

References:

- [GitHub Actions billing](https://docs.github.com/en/billing/concepts/product-billing/github-actions)
- [Dependency caching reference](https://docs.github.com/en/actions/reference/workflows-and-actions/dependency-caching)
- [Artifact and log retention](https://docs.github.com/en/actions/how-tos/manage-workflow-runs-and-deployments/manage-workflow-runs/configure-artifact-retention)

## Measured baseline

The baseline was captured from the GitHub API on 2026-07-29 after the `v0.1.6`
release. It covers the repository's complete Actions history at that point:

| Workflow and event   | Completed jobs | Runner minutes | Per-job rounded minutes |
| -------------------- | -------------: | -------------: | ----------------------: |
| Release, tag push    |              7 |           16.5 |                      21 |
| CI, pull request     |              8 |           12.4 |                      17 |
| CI, main push        |              8 |           16.4 |                      19 |
| CodeQL, pull request |              8 |            7.8 |                      11 |
| CodeQL, main push    |              8 |           10.6 |                      16 |
| Dependabot Updates   |              5 |            3.9 |                       7 |
| **Total**            |         **44** |       **67.4** |                  **91** |

The rounded column estimates how the same jobs would count if they ran in a
private repository, where partial job minutes are rounded up. For this public
repository, the billed included-minute impact is zero.

The main repeated costs were:

- every dependency PR ran both the full browser CI and CodeQL;
- GitHub Actions updates arrived as three separate PRs;
- every tag repeated all static, unit, browser, accessibility, large-input, and
  audit gates already completed for the same commit on `main`;
- Playwright rebuilt the application even though `pnpm check` had just built
  it in the same job;
- CodeQL lacked stale-run cancellation and source-aware path filters.

At capture time the Actions artifact API reported zero artifacts. The cache API
reported approximately 474 MiB across 12 entries:

| Cache           | Entries | Approximate size |
| --------------- | ------: | ---------------: |
| pnpm store      |       4 |          334 MiB |
| CodeQL database |       8 |          139 MiB |

The pnpm cache is retained because a normal restore is useful and cache storage
has a separate per-repository allowance. The duplicated pnpm entries were
created during the initial parallel Dependabot burst; later PRs reused the
default-branch cache instead of creating more copies.

## Optimized policy

The workflows apply these boundaries:

1. Markdown-only changes do not start CI. Runtime assets under `docs/assets/`
   remain in scope because the production application imports them. CodeQL
   starts only when JavaScript, TypeScript, dependency manifests, or its own
   workflow changes.
2. New commits cancel obsolete CI and CodeQL runs for the same branch or pull
   request.
3. GitHub Actions dependency updates are grouped into one weekly pull request.
4. CI performs static, unit, build, audit, browser, accessibility, and
   large-input gates in one job. It installs Chromium only after the faster
   gates pass and reuses the build for Playwright.
5. A release is manually dispatched for an existing version tag. It is allowed
   only when the tag matches `package.json`, the tagged commit is on
   `origin/main`, and that exact commit has a successful CI run. A tag push by
   itself never publishes a release. The release reruns the live dependency
   audit and deterministic packaging, but does not repeat the already-proven
   test suite.
6. Successful jobs do not upload Actions artifacts. Release archives are
   attached directly to the GitHub Release.
7. Repository-level artifact and log retention is 14 days.

The weekly CodeQL schedule remains enabled so new CodeQL queries can inspect
unchanged code. Both pull-request and main-push scans remain enabled because the
repository currently has no branch protection and direct pushes must not lose
security coverage.

## Expected effect

Replaying the launch burst with the new policy is estimated to reduce runner
time from 67.4 minutes to roughly 44 to 47 minutes, a reduction of about 30% to
35%. The largest deterministic saving is release validation: an observed
release averaged 2.35 runner minutes, while the CI-evidence, audit, and package
path is expected to take about 0.6 to 0.8 minutes. Grouping the three Actions
update PRs removes repeated full CI and CodeQL fan-out in a typical weekly
update burst.

Additional savings depend on activity:

- a Markdown-only PR avoids about 2.5 runner minutes based on the measured PR
  averages;
- a Markdown-only direct push avoids about 3.3 runner minutes;
- cancellation saves most of a superseded 1 to 2 minute job;
- source-aware CodeQL filtering avoids scans for Actions updates that do not
  modify the CodeQL workflow.

Actions artifact storage remains at zero in the success path. Reducing
retention from 90 to 14 days limits future diagnostic artifacts and logs to
about 16% of the previous retention window. Cache storage remains separate and
is expected to stay well below GitHub's per-repository cache allowance.

## Quality gates that must remain

Do not remove the following without replacing them with equivalent evidence:

- formatting, ESLint, and strict TypeScript checks;
- unit tests with coverage;
- the production build;
- browser, accessibility, and large-input tests;
- high-severity dependency audit;
- CodeQL on relevant pull requests, direct `main` pushes, and the weekly
  schedule;
- explicit manual dispatch, exact-commit CI evidence, version/tag validation,
  `main` ancestry, audit, and deterministic packaging for releases.
