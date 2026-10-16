# Embedded system session renewal

Status: complete; local installation and live acceptance passed.
Risk: High Risk (shared desktop identity lifecycle).
Baseline: main e62d0f7588; preserve existing pending SSO, GEO, native view and brand work.

Goal: prevent ordinary access-token expiry from leaving all embedded systems signed out.
Owner: Platform access plugin and native system view Host. No schema, tenant or permission changes.
Use existing refresh-token and one-use PKCE contracts; no business requests replayed.
Acceptance: expired access tokens refresh before Host authorization; refresh preserves same-owner view signals;
restoration refreshes persisted tokens; guests recheck sessions and reload only after session recovery;
logout/disposal cancels pending recovery; transient failures do not destroy refresh credentials.
User authorized local backup/update/restart on 2026-10-11 and future updates in the same local Agent scope without routine confirmation or notices.
No commit, push, server deployment or production data mutation authorized.

## Result and validation (2026-10-11)

- Access-token deadline tracked in Host memory, refreshed 60 seconds before expiry when authorizing.
  Protected restore rotates persisted tokens before context queries; concurrent Host operations remain serialized.
- Same-member/tenant refresh preserves the view cancellation signal. Logout, rejected refresh and identity mismatch revoke it.
- Native views check sessions every 60 seconds, including hidden tabs. Session restoration uses existing PKCE;
  only a recovered session triggers a reload. Valid pages preserve drafts. Temporary errors retain pages and retry.
- No business submission is replayed, no cookie is extracted, no token lifetime or server contract is changed.
- `npm test -w @futurestaff/fs-platform-access`: 167 passed, including simulated one-hour handoff renewal,
  restart, transient error, revoked refresh and cross-tenant rejection.
- Platform typecheck/build and native typecheck/build passed.
- Native focused tests: 9 passed (`system-views.spec.ts`, `system-session-fetch.spec.ts`).
- `node scripts/verify-system-session-renewal.mjs`: hidden isolated Electron smoke passed;
  synthetic HTTPS pages, draft preservation, recovery, transport failure and logout tested without real accounts.
- Runtime closure: 4 tests passed and 228 first-party nodes closed. `git diff --check` passed.
- Broader native `yarn workspace dsh-plugin-desktop test`: 1094 passed, 19 failed, 13 skipped,
  2 unhandled update-test rejections. Failures involve Windows symlink EPERM and update/runtime fixture assertions;
  affected files were not modified by this task. Full suite is not reported as passed; no baseline equivalence claimed.

## Delivery boundary

Code lives in `D:/项目/FutureStaff-Agent-client`; the original Agent workspace and its pending brand changes were untouched.
Pending SSO/GEO/native changes in the client checkout were retained. Review must distinguish this renewal delta
from those pre-existing changes. Task-owned files: `dev-access.ts`, small Host changes in `plugin.ts`,
`system-sso.ts`, `system-view-contract.ts`, `system-views.ts`, related tests and the new hidden Electron smoke.

Installed app updated after explicit authorization; servers unchanged. Existing HttpOnly module sessions remain server-owned.
Expired guest recovery may take up to the next minute check and reloads the page; it is not a guarantee that
unsaved work survives an already-expired session. One-hour expiry behavior is time-simulated in tests;
live validation covered restored sessions, same-owner refresh and an ordinary minute check.
Installed 4 native runtime files and 6 platform-plugin runtime files, preserving 20,373 unrelated package files.
Backup, immutable candidate, SHA-256 receipt and checked rollback script:
`D:/项目/.codex-build/agent-session-renewal-20261011/`.
Unrelated plugin brand/workspace/view output differences were detected and excluded from installation.
Initial relaunch from the repository directory encountered the repository `.env` proxy restriction;
relaunching from `D:/FutureStaff Agent` restored the intended runtime without changing configuration.
Protected session restored to ready automatically. Six real current-subject systems passed no-password login,
HTTP 200 session checks, matching member/tenant and guest isolation/reuse.
Same-owner manual refresh returned ready with unchanged member/tenant. After 65 seconds, all six guest IDs
were unchanged, all session endpoints returned 200 with matching member/tenant, and no password form appeared.
Final normal restart completed with a healthy renderer and without temporary remote-debugging flags.
Live receipts: `final-acceptance.json`, `refresh-acceptance.json` in the backup directory above.
Before any future approved installation, back up exact installed files and overlay only compatible runtime outputs.
Rollback restores those backed-up files after closing the app; do not alter profiles, user data or business grants.
