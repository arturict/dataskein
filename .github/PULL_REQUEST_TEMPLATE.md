## What changed

Describe the focused user problem and the chosen boundary.

## Verification

- [ ] `pnpm check`
- [ ] `pnpm test:e2e`
- [ ] `pnpm audit`
- [ ] Tests cover the behavior change
- [ ] User-facing docs and changelog are updated when needed

## Local-first review

- [ ] No source rows or identifiers are sent off-device
- [ ] No telemetry or remote dependency was added
- [ ] Result sizes remain bounded before rendering
- [ ] User-controlled identifiers and literals use central SQL quoting helpers
- [ ] Accessibility was checked for changed interactions
