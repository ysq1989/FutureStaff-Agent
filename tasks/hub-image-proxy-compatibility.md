# Hub album images in embedded Agent tabs

2026-10-13. High Risk: native guest network guard compatibility. Source baseline
`main` at `1ef692067e1195c846a4498034a0e585fdce88f0`. Preserve existing GEO,
branding, login and task changes; existing CURRENT task is not replaced.

## Diagnosis and scope

The running Agent 3.0.5 Hub product page has failed image requests to
`xcimg.szwego.com`: `net::ERR_BLOCKED_BY_CLIENT`. System DNS resolves that CDN
to `198.18.0.34`; the existing proxy DNS alias exception only permits the
authorized business/auth origin, so album image requests are cancelled.

Desktop owns the network guard, Hub owns products and image URLs, and Platform
continues to own authorization and identity. No schema, business data, credentials,
server deployment or integration configuration changes. ADR-0035 guest isolation
and existing private-network protection remain in force.

Only HTTPS GET image requests to the exact album CDN from the matching
`product.fsstory.net` or `product-dev.fsstory.net` referrer gain the existing
198.18/15 proxy alias compatibility. Explicit remote-DNS proxy without DIRECT
fallback is required. Other hosts, resource types, mismatched referrers and actual
private/loopback/link-local DNS addresses remain denied. Top-level navigation and
guest bridge/Node settings are unchanged.

## Validation

- Regression first failed on the legitimate album image, then passed after fix.
- Focused native views/session fetch/window suites: 22 tests passed.
- Native source and test TypeScript checks passed (`tsconfig.json`,
  `tsconfig.tests.json`).
- Native tsdown build to isolated candidate directory passed.
- Separate Electron process with a fresh synthetic identity/profile and actual
  system proxy loaded three real CDN images at natural width 320. Proxy scheme
  PROXY and virtual DNS confirmed; guest Node and Agent bridge undefined.
- Full native suite: 1108 passed, 10 failed, 13 skipped, two unhandled errors.
  The two failing suites rerun with the original HEAD network-guard source have
  the same ten failing test names and two errors. Existing failures concern
  update/runtime/package expectations; no test was weakened.
- Exact source/test diff reviewed; scoped `git diff --check` passed.

Evidence and compiled candidate: `D:/项目/.codex-build/hub-image-proxy-20261013/`.
The smoke uses an isolated fixture, not an updated installed authenticated Hub.

## Status and next action

Source fix and candidate validation complete; installed client is unchanged.
No commit, push, deployment or restart is authorized. After explicit approval,
back up the affected installed native files, install only the reviewed candidate
native changes, restart Agent, and verify product thumbnails and gallery in its
real Hub session. Rollback restores the exact backed-up installed native files
with the client stopped; user profiles and business data must be preserved.
