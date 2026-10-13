# Installed ERP tool repair and 3.0.5 release

2026-10-13. High Risk desktop release repair. User reports Grep/Read failures and FUTURESTAFF_PROVIDER in the actual installed SystemExperience ERP assistant; previous authorization includes repairs, commit, push and production deployment. No business data, credentials, schema or permission changes.

## Findings and scope

The running installation was 3.0.3 and both bundled and active-member plugin packages lacked erp-host.js. Published 3.0.4 had not reached this installation. An existing verified local Website discovery contract repair was also absent from that installer; restoring it recovers the original authenticated user and subject. 3.0.5 includes that strict known-extension decoder and verified prior Profile/client inventories so an intact previously hotfixed installation can upgrade without replacing user configuration or conversations. Unknown fields, foreign tenants and unsafe management metadata still fail closed. Unrelated GEO/UI work is excluded.

## Validation

- Immutable scoped candidate: plugin typecheck/build and 207 tests passed, zero skips.
- Packaged Profile protections: 16 tests passed. Relocatable release Profile tests: 2 passed.
- Actual user, original production workspace: automatically restored Platform administrator / SystemExperience. A new ERP business assistant conversation received the original question about largest customer business volume, invoked two native ERP tools, displayed the live sales-order window and returned a Chinese customer ranking. No alert, Grep/Read failure or provider failure in that run. This establishes the repaired flow; the historical provider exception was not independently classified.
- Program and both product-code packages backed up before installation. Persistent account, conversation and business files were retained. Runtime evidence is private under D:/项目/.codex-build/agent-installed-erp-repair-20261013/; screenshot customer-ranking.png.

## Release state

Completed: commit d801ee1902 pushed on main; immutable 3.0.5 installer published and full public download hash verified (85378732a812c30ab615ff67e2d3de03bb4b8b64126524c1deb469ce9b9d0297). Actual original installation upgraded to 3.0.5 and authenticated acceptance repeated: authoritative Chinese customer report/window gives 320 / 4 orders, no current-turn errors; sales form opens with Chinese candidates and no submission. Latest actual account screenshot and acceptance.json retained privately. Signed feed unchanged; 3.0.4 and 3.0.2 rollback installers retained.

The report acceptance initially exposed legacy English draft data counting as effective business; fixed in ERP 23baddb with 183 exact-image isolated PostgreSQL tests and guarded PROD release. Platform 0f9c9273 adds secret-safe provider diagnostics. A historical intermittent provider failure remains unclassified; three latest post-release model/tool flows succeeded, which is not proof that the intermittent fault is eliminated. The final normal restart to remove temporary loopback debugging was blocked by automatic approval review (reason: blocked by policy, no detailed reason returned). It did not run; the accepted 3.0.5 process remains running with the loopback-only debugging flag. A manual normal close/reopen removes it.
