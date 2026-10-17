# 3.0.7 packaged Profile startup repair

User reports recovery mode after upgrading another computer to 3.0.6.
Error: FutureStaff release Profile file inventory is invalid.

Confirmed: the 3.0.6 release Profile contains 301 files, while startup still caps
its inventory at 256. The builder verified hashes and portability without calling
the startup validator, and development launches skip packaged Profile installation.
This permits a fully hashed, signed installer that cannot pass first startup.
The earlier development-login check did not cover the affected packaged path.

Scope: bounded Profile inventory capacity, shared startup validation during
staging and afterPack, regression for actual-sized manifests and malicious inputs,
3.0.6 supersedence, and a 3.0.7 repair installer/update feed. Preserve all user
profiles, sessions and business files. No changes on the current machine's old
installed application; the reported failing installation is on another computer.

Acceptance: fresh packaged startup reaches login; verified 3.0.6/old Profile
upgrade fixtures preserve sessions and customized code; invalid paths, overflow
and tampering still fail; stage and afterPack reject runtime-incompatible resources.
Do not replace any existing versioned installer. Keep 3.0.5 as the last known
rollback installer and deliver a manual repair link for clients stuck in recovery.

Implementation: cap whole-Profile inventories at 1024; retain the workspace-code
inventory cap at 256 and all path, symlink, manifest-size and hash protections.
Staging and afterPack now call the exact startup validator. Added regressions for
301 files, overflow, unsafe paths, digests and afterPack rejection. Audited the
official 3.0.6 manifest and code inventory for managed, hash-matched upgrades.

Verified on 2026-10-17: full `npm run check` passes (Stable 1125 passed, Beta 1032
passed, 13 existing platform skips in each; root 64 passed; product checks pass).
The official 3.0.6 EXE was hash-verified, extracted and run with isolated user and
Harness directories: packaged startup reproduces the reported inventory error.
Actual 3.0.6 Profile -> staged repair resources upgrades unmodified files,
preserves modified files and retains session sentinels. 3.0.5 rollback has 219 files.

Containment: revoked the 3.0.6 feed under the publication lock after checking its
expected SHA-256; backed it up in the server's 3.0.7 repair directory. Restored the
original signed feed, independently verified at public HTTPS (SHA-256
`930f02bc02098ca94783b644db7261314bc07f5b6ef4385a420694746a6c93d3`).
Versioned installers remain unchanged. Private signing key stays outside source.

## Completed delivery, 2026-10-17

- Runtime build source: main `8176a516ec`, pushed to origin. Windows installer gate:
  191 tests passed, type checks and runtime closure passed; afterPack accepted the
  actual 301-file Profile with the startup validator.
- Ran `dist/win-unpacked/FutureStaff Agent.exe` with a fresh isolated Harness and
  user-data directory. Observed the product login page using Computer Use; no
  recovery page or startup error. No account login or business action was performed.
  The test process was closed; the current machine's installed app was untouched.
- Extracted the final NSIS EXE: `resources/app.asar` SHA-256
  `f8f33266d023e0f25afd3fc9e525be93d68aa92fe1603923c6a674d94594002a`,
  Profile manifest SHA-256
  `5e887111d857b0e4f19ddf70d3552162e9d110551fda85a84074986c31e0ba2c`;
  both match the actually tested packaged client. Actual packaged resources also
  pass the 3.0.6 unmodified/customized Profile and session-preservation probes.
- Installer: [FutureStaff-Agent-3.0.7-x64-Setup.exe](https://fsstory.net/desktop-updates/FutureStaff-Agent-3.0.7-x64-Setup.exe),
  139,961,130 bytes, SHA-256
  `f87c30688725e47e54ecb519d1325ab29585f7689c8a965569f27135f155c907`.
- Signed using the existing external Ed25519 key, retaining the client's pinned
  public key and `confirmed-install` delivery. Publication rehearsal verified
  changed-feed rejection, lock cleanup, old-feed backup and successful publication.
- PROD bundle: `/opt/futurestaff/prod/desktop-update-bundles/3.0.7-signed-feed-20261017`.
  Independent operator trust and compare-and-swap on the restored prior digest
  guarded publication under the existing lock. Existing version URLs stayed immutable.
  Feed SHA-256: `4581accbef7811768a6c85627d1ac04915bfda64b42bd9510b95d9f385ac9803`.
- Actual client `checkFutureStaffUpdate` verified HTTPS signature and version 3.0.7,
  with 3.0.5 rollback. Both public EXEs were downloaded completely and checked using
  the client byte validator. Feed is `no-store`, installers are immutable; `trust.json`,
  `READY` and `previous-stable.json` public paths return 404. The unchanged 3.0.5
  rollback digest is `85378732a812c30ab615ff67e2d3de03bb4b8b64126524c1deb469ce9b9d0297`.

Recovery instructions for the other computer: close Agent, download 3.0.7 and
install over the existing application directory. Keep Profile/session/data
directories; no uninstall or data cleanup is required. Real account operation on
that computer remains to be observed by the user.

Status: repair, actual packaged startup validation and PROD publication complete.
Local evidence: `.local-checks/profile-fix*`, `.local-checks/v307-live-verification.json`,
`.local-checks/v307-bundle-result.json`. Private keys and raw runtime data are not committed.
