# Web system menu — completed 2026-10-15

Goal: add the existing Web application to Agent's system menu.
Baseline: `main` at `1ef692067e1195c846a4498034a0e585fdce88f0`; unrelated
working-tree changes preserved. Standard source change with High Risk local
installed-runtime/restart validation. No schema, server release, application
permission changes, credential changes, commit or push.

## Change

- Added `web` / `Web 系统` with the existing menu styling and a globe icon.
- Native navigation uses the current same-subject Platform application grant and
  its server-provided URL; absent grants, mismatched subjects and signed-out
  states remain unavailable.
- Website has its own authenticated login flow. Its public generic module auth
  endpoints return `NATIVE_ENDPOINT_DISABLED`, and desktop browser authorization
  does not enroll Web. Therefore the new entry opens Website's authoritative
  page without attempting generic ERP/Hub SSO. No token/cookie copying, fabricated
  authorization or Platform-side integration change was added.
- Updated only the five corresponding installed plugin JavaScript files, with
  per-file baseline/hash checks and backups. Existing Hub/Shop image runtime
  patches were preserved. Restarted Agent normally to load the installed menu;
  verified all five file hashes again after startup.

## Verification

- Added three focused regressions first; all failed on the prior implementation.
- Plugin build/TypeScript passed. Eighteen focused navigation, directory, SSO,
  sidebar and browser checks passed, including narrow layout, native Web click,
  no external window, missing grants and tenant mismatch.
- Actual installed Agent after restart shows `打开Web 系统` in its menu.
- Actual menu click selects Web and opens `https://web.fsstory.net/` with title
  `FutureStaff.WebSite · 官网管理`; no shell failure status. Website displays its
  login page (one password field); authenticated Website business actions were
  not performed.
- Candidate JavaScript syntax and affected source diff hygiene checks passed.

Evidence and rollback: `D:/项目/.codex-build/web-menu-20261015/` contains
`acceptance.json`, per-file `manifest.json`, and original files under `backup/`.
Restore each manifest backup to its target and restart Agent to roll back this
menu change. The earlier image fixes remain separate.
