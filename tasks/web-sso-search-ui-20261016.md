# Web automatic login and session search — completed 2026-10-16

Goal: finish the Web browser handoff and refine the focused session search field.
High Risk: Platform identity endpoint, native session handoff and scoped API release.
No schema, real grant, business data, password, credential, commit or push changes.
Preserve the existing dirty worktrees, Web menu, collapsed icon rail and image fixes.

## Contract

Platform owns member/subject/Website management authorization. A dedicated
`POST /desktop/v1/apps/web/browser-authorize` checks the current Website projection
and emits a one-use, parent-desktop-bound PKCE authorization code with only
`web.access`. Registered environment/client/callback checks remain enforced.
Website owns its PKCE cookie, callback, HttpOnly module session and live business
permission check. Native Host consumes `/oauth/start`, obtains the Platform
handoff, follows Website's callback in its isolated session, then verifies the
actual Website member and subject through `/api/website/session`.

No Platform bearer, user password or copied business cookie enters the page.
The previous deliberate Web no-op in `system-sso.ts` is replaced by this flow.

The session search field gets one outer rounded border/focus ring, an aligned
icon and an inner borderless input; it retains search and keyboard behavior.

## Evidence in progress

- Client TypeScript/build and 22 adjacent tests pass.
- Platform new/adjacent Website and handoff tests: 23 pass. Expanded run:
  36 pass / two pre-existing failures caused by missing `im_config` in old fake
  tenant fixtures. Removing the new endpoint in-memory reproduces both failures.
- Changed Python checks pass with the existing RUF100 baseline warning excluded.
- Isolated checks inside both actual candidate images pass: anonymous 401,
  synthetic authorized handoff 200, revoked Website assignment 403. No real
  credentials or database writes are used by those candidate checks.
- Runtime baseline audit: DEV 1.12.28 / generation 65 / schema 15, PROD 1.12.29 /
  generation 50 / schema 7. Only API images are derived from their respective
  active immutable images; other code and runtime configuration are preserved.
- Initial DEV candidate revealed legacy missing imports during HTTP checks;
  final candidates include explicit compatibility imports and pass their
  in-image endpoint tests before further promotion. Final candidate version:
  1.12.31 on both environments.

Evidence/rollback inputs are under `D:/项目/.codex-build/web-sso-20261016/` and
server-private `/opt/futurestaff/web-sso-20261016/`. Full container metadata,
environment overrides and operational logs stay private on the server. Each
release uses the existing target/schema CAS guard and ready bridge, preserves
all sibling container IDs and carries an exact API rollback override.

## Final delivery and real acceptance

- DEV API is 1.12.31, target generation 67, Schema generation 15; PROD API is
  1.12.31, target generation 51, Schema generation 7. Both are healthy. Each
  successful API rollout preserved 39 sibling container IDs and used the existing
  ready-bridge/target-CAS process. No migration or Website deployment was needed.
- Public health/providers return 200 and anonymous Web handoff returns 401 on
  both environments. Candidate image checks additionally prove authorized 200
  and revoked management access 403 using synthetic identities only.
- Updated three active installed plugin files with per-file rollback copies and
  syntax/hash checks; restarted Agent to load Host changes. No user password or
  Platform bearer was read, copied into a page or emitted in diagnostics.
- Actual Agent Web menu opens the authenticated Website business page, with
  zero password fields. `/api/website/session` returns 200, reports a real
  Platform connection and verified member/subject, and the handoff itself checks
  equality against the active desktop identity. Browser Node/bridge globals are
  undefined. Switching away/back reuses the same guest; reload retains login.
- Actual session search: all four outer borders are 1px, radius 8px, height 36px;
  inner input has zero border and no outline. Focus is in the input, the container
  has a 2px 14%-accent focus ring, and there is no horizontal overflow. Screenshot
  `client/search-focus.png` was visually inspected.
- Final evidence: `client/web-acceptance.json`, `client/search-acceptance.json`,
  `final-state.json`, and `server-dev/` / `server-prod/` under the evidence folder.
  Temporary main-process inspection is closed after acceptance. No commit/push
  or public installer/update-feed publication was performed.
